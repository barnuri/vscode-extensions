import { FileData } from './models/FileData';
import { getCompletionFilePath } from './extension';
import { FileExports } from './models/FileExports';
import * as _ from 'lodash';
import { Uri, CompletionItemKind, window } from 'vscode';
import * as fs from 'fs-extra';
import { createDataDir, getFilepathKey, isPathPackage, mergeObjectsWithArrays } from './utils';
import { getWorkspacePath, getPythonFiles, ignoreThisFile } from './utils';
import { parseImports } from './regex';
import { isFile } from 'utlz';
import { CompilationData } from './models/CompilationData';
import { RichCompletionItem } from './models/RichCompletionItem';
import { buildCompletionItems } from './buildImportItems';

export function compilationFileManager(): RichCompletionItem[] {
    const completionFilePath = getCompletionFilePath();
    const data = isFile(completionFilePath) ? JSON.parse(fs.readFileSync(completionFilePath, 'utf8')) : {};
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
        await createDataDir();
        await buildCompletionItems(finalData);
        if (showMsg) {
            window.showInformationMessage('Project exports have been cached. 🐔');
        }
    } catch (ex) {
        console.error(`buildDataFile error ${ex}`);
    }
}

export async function onChangeOrCreate(doc: Uri) {
    if (ignoreThisFile(doc.fsPath)) {
        return;
    }
    await buildDataFile(false);
}

export async function onDelete(doc: Uri) {
    if (ignoreThisFile(doc.fsPath)) {
        return;
    }
    await buildDataFile(false);
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
            classes.push({ name: trimClassOrFn(word1), kind: CompletionItemKind.Class, peekOfCode });
        } else if (word0 === 'def') {
            // Don't export private functions
            if (!word1.startsWith('_')) {
                functions.push({ name: trimClassOrFn(word1), kind: CompletionItemKind.Function, peekOfCode });
            }
        } else if (word1 === '=') {
            constants.push({ name: word0, kind: CompletionItemKind.Variable, peekOfCode });
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
