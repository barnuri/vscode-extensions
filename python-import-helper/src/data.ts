import { FileData } from './models/FileData';
import { getDataFilePath } from './extension';
import { FileExports } from './models/FileExports';
import * as _ from 'lodash';
import { Uri, workspace, CompletionItemKind } from 'vscode';
import * as fs from 'fs-extra';
import { getFilepathKey, isPathPackage, mergeObjectsWithArrays, showProjectExportsCachedMessage, writeDataFile } from './utils';
import config from './config';
import { getWorkspacePath, getPythonFiles, ignoreThisFile } from './helpers';
import { parseImports } from './regex';
import { isFile } from 'utlz';
import { CompilationData } from './models/CompilationData';
/**
 * Block access to the cache file until a previous accessor has finished its operations. This
 * prevents race conditions resulting in the last accessor overwriting prior ones' data.
 *
 * `cb` should return a promise (e.g. any file writing operations) so that it completes before the
 * next call to the cacheFileManager
 */
let fileAccess: Promise<any>;

export async function dataFileManager(): Promise<CompilationData> {
    if (fileAccess) {
        await fileAccess;
    }
    const dataFilePath = getDataFilePath();
    const data = isFile(dataFilePath) ? JSON.parse(fs.readFileSync(dataFilePath, 'utf8')) : {};
    return data;
}

export async function buildDataFile(showMsg: boolean = false) {
    try {
        const cachedDirTrees = { imp: {}, exp: {} } as CompilationData;
        try {
            let files: string[] = getPythonFiles(getWorkspacePath());
            for (const fullPath of files) {
                getDataFromPythonFile(fullPath, cachedDirTrees);
            }
        } catch (err) {
            console.log(err);
        }
        const finalData = { exp: {}, imp: {} };
        Object.assign(finalData.exp, cachedDirTrees.exp);
        mergeObjectsWithArrays(finalData.imp, cachedDirTrees.imp);
        await writeDataFile(finalData);
        if (showMsg) {
            await showProjectExportsCachedMessage();
        }
    } catch (ex) {
        console.error(`buildDataFile error ${ex}`);
    }
}

async function onChangeOrCreate(doc: Uri) {
    if (ignoreThisFile(doc.fsPath) || !config.includePaths.some(p => doc.fsPath.startsWith(p))) {
        return;
    }
    const { exp, imp } = getDataFromPythonFile(doc.fsPath, { imp: {}, exp: {} });
    if (_.isEmpty(exp) && _.isEmpty(imp)) {
        return;
    }
    for (const k in exp) {
        exp[k].cached = Date.now();
    }
    const cachedData = await dataFileManager();
    mergeObjectsWithArrays(cachedData.imp, imp);
    Object.assign(cachedData.exp, exp);
    return writeDataFile(cachedData);
}

export function watchForChanges() {
    const watcher = workspace.createFileSystemWatcher('**/*.*');
    watcher.onDidChange(onChangeOrCreate);
    watcher.onDidCreate(onChangeOrCreate);
    watcher.onDidDelete(async doc => {
        const cachedData = await dataFileManager();
        const key = getFilepathKey(doc.fsPath);
        const { exp } = cachedData;
        if (!exp[key]) {
            return;
        }
        delete exp[key];
        return writeDataFile(cachedData);
    });

    return watcher;
}

export function getDataFromPythonFile(filepath: string, data: CompilationData) {
    const { imp, exp } = data;
    const fileText = fs.readFileSync(filepath, 'utf8');
    const imports = parseImports(fileText);

    for (const importData of imports) {
        if (isPathPackage(importData.path)) {
            const existing = imp[importData.path] || ({ exports: [] } as FileExports);
            imp[importData.path] = existing;
            existing.isExtraImport = true;
            if (importData.isEntirePackage) {
                existing.importEntirePackage = true;
            } else {
                existing.exports = [...existing.exports, ...importData.imports];
            }
        }
        // If there are imports then they'll get added to the cache when that file gets cached. For
        // now, we only need to worry about whether then entire file is being imported
        else if (importData.isEntirePackage) {
            exp[importData.path] = { importEntirePackage: true };
        }
    }
    const classes = [] as FileData[];
    const functions = [] as FileData[];
    const constants = [] as FileData[];
    const lines = fileText.replace(/\r/g, '').trim().split('\n');

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const words = line.split(' ');
        const word0 = words[0];
        const word1 = words[1];

        const peekArr = lines
            .slice(index, Math.min(index + 20, lines.length))
            .filter(x => x.trim().replace(/\n/g, '').replace(/\r/g, '').replace(/\t/g, '').length > 0);
        const peekOfCode = peekArr.slice(0, Math.min(10, peekArr.length)).join('\n');

        if (word0 === 'class') {
            classes.push({ name: trimClassOrFn(word1), type: CompletionItemKind.Class, peekOfCode });
        } else if (word0 === 'def') {
            // Don't export private functions
            if (!word1.startsWith('_')) {
                functions.push({ name: trimClassOrFn(word1), type: CompletionItemKind.Function, peekOfCode });
            }
        } else if (word1 === '=' && word0.toUpperCase() === word0) {
            constants.push({ name: word0, type: CompletionItemKind.Variable, peekOfCode });
        }
    }

    const fileExports = [...classes.sort(), ...functions.sort(), ...constants.sort()];
    if (fileExports.length) {
        exp[getFilepathKey(filepath)] = { exports: fileExports };
    }

    return data;
}

function trimClassOrFn(str: string) {
    return str.slice(0, str.indexOf('('));
}
