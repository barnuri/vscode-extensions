import { FileExports } from './models/FileExports';
import * as _ from 'lodash';
import { Uri, workspace, CompletionItemKind } from 'vscode';
import * as fs from 'fs-extra';
import { getFilepathKey, isPathPackage, mergeObjectsWithArrays, showProjectExportsCachedMessage, writeCacheFile } from './utils';
import config from './config';
import { getWorkspacePath, getPythonFiles, ignoreThisFile } from './helpers';
import { parseImports } from './regex';
import { isFile } from 'utlz';
import { cacheFilepath } from './extension';
import { CompilationData } from './models/CompilationData';
/**
 * Block access to the cache file until a previous accessor has finished its operations. This
 * prevents race conditions resulting in the last accessor overwriting prior ones' data.
 *
 * `cb` should return a promise (e.g. any file writing operations) so that it completes before the
 * next call to the cacheFileManager
 */
let fileAccess: Promise<any>;

export async function cacheFileManager(): Promise<CompilationData> {
    if (fileAccess) {
        await fileAccess;
    }
    const data = isFile(cacheFilepath) ? JSON.parse(fs.readFileSync(cacheFilepath, 'utf8')) : {};
    return data;
}

export async function cacheFolder() {
    const cachedDirTrees = { imp: {}, exp: {} } as CompilationData;
    try {
        let files: string[] = getPythonFiles(getWorkspacePath());
        for (const fullPath of files) {
            cacheFile(fullPath, cachedDirTrees);
        }
    } catch (err) {
        console.log(err);
    }
    const finalData = { exp: {}, imp: {} };
    Object.assign(finalData.exp, cachedDirTrees.exp);
    mergeObjectsWithArrays(finalData.imp, cachedDirTrees.imp);
    await writeCacheFile(finalData);
    await showProjectExportsCachedMessage();
}

async function onChangeOrCreate(doc: Uri) {
    if (ignoreThisFile(doc.fsPath) || !config.includePaths.some(p => doc.fsPath.startsWith(p))) {
        return;
    }
    const { exp, imp } = cacheFile(doc.fsPath, { imp: {}, exp: {} });
    if (_.isEmpty(exp) && _.isEmpty(imp)) {
        return;
    }
    for (const k in exp) {
        exp[k].cached = Date.now();
    }
    const cachedData = await cacheFileManager();
    mergeObjectsWithArrays(cachedData.imp, imp);
    Object.assign(cachedData.exp, exp);
    return writeCacheFile(cachedData);
}

export function watchForChanges() {
    const watcher = workspace.createFileSystemWatcher('**/*.*');
    watcher.onDidChange(onChangeOrCreate);
    watcher.onDidCreate(onChangeOrCreate);
    watcher.onDidDelete(doc => {
        cacheFileManager().then(cachedData => {
            const key = getFilepathKey(doc.fsPath);
            const { exp } = cachedData;
            if (!exp[key]) {
                return;
            }
            delete exp[key];
            return writeCacheFile(cachedData);
        });
    });

    return watcher;
}

export function cacheFile(filepath: string, data: CompilationData) {
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
    type arrType = { name: string; type: CompletionItemKind }[];
    const classes = [] as arrType;
    const functions = [] as arrType;
    const constants = [] as arrType;
    const lines = fileText.replace(/\r/g, '').trim().split('\n');

    for (const line of lines) {
        const words = line.split(' ');
        const word0 = words[0];
        const word1 = words[1];

        if (word0 === 'class') {
            classes.push({ name: trimClassOrFn(word1), type: CompletionItemKind.Class });
        } else if (word0 === 'def') {
            // Don't export private functions
            if (!word1.startsWith('_')) {
                functions.push({ name: trimClassOrFn(word1), type: CompletionItemKind.Function });
            }
        } else if (word1 === '=' && word0.toUpperCase() === word0) {
            constants.push({ name: word0, type: CompletionItemKind.Variable });
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
