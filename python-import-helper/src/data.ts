import { FileData } from './models/FileData';
import { FileExports } from './models/FileExports';
import { CompletionItemKind, RelativePattern, window, workspace } from 'vscode';
import * as fs from 'fs';
import { getExcludeGlob, getFilepathKey, getWorkspacePath, isPathPackage, isPythonModuleFile, mergeObjectsWithArrays } from './utils';
import { parseImports } from './regex';
import { CompilationData } from './models/CompilationData';
import { RichCompletionItem } from './models/RichCompletionItem';
import { buildCompletionItems } from './buildImportItems';

const pythonIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const peekScanLineCount = 20;
const peekLineCount = 10;
const readBatchSize = 100;

let fileDataCache = new Map<string, CompilationData>();
let completionItems: RichCompletionItem[] | undefined;

export function getCompletionItems(): RichCompletionItem[] {
    if (!completionItems) {
        completionItems = buildCompletionItems(mergeFileData());
    }
    return completionItems;
}

function mergeFileData(): CompilationData {
    const finalData = { exp: {}, imp: {} } as CompilationData;
    for (const data of fileDataCache.values()) {
        Object.assign(finalData.exp, data.exp);
        mergeObjectsWithArrays(finalData.imp, data.imp);
    }
    return finalData;
}

export async function buildDataFile(showMsg: boolean = false) {
    try {
        const uris = await workspace.findFiles(new RelativePattern(getWorkspacePath(), '**/*.py'), getExcludeGlob());
        const files = uris.map(uri => uri.fsPath).filter(isPythonModuleFile);
        const newCache = new Map<string, CompilationData>();
        for (let index = 0; index < files.length; index += readBatchSize) {
            const batch = files.slice(index, index + readBatchSize);
            await Promise.all(batch.map(filepath => readFileData(filepath, newCache)));
        }
        fileDataCache = newCache;
        completionItems = undefined;
        if (showMsg) {
            window.showInformationMessage('Project exports have been cached. 🐔');
        }
    } catch (ex) {
        console.error(`buildDataFile error ${ex}`);
    }
}

export async function updateFiles(filepaths: string[]) {
    for (const filepath of filepaths.filter(isPythonModuleFile)) {
        await readFileData(filepath, fileDataCache);
    }
    completionItems = undefined;
}

async function readFileData(filepath: string, cache: Map<string, CompilationData>) {
    try {
        const fileText = await fs.promises.readFile(filepath, 'utf8');
        cache.set(filepath, getDataFromPythonFile(filepath, fileText));
    } catch (err) {
        cache.delete(filepath);
        if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) {
            console.error(`readFileData error ${filepath} ${err}`);
        }
    }
}

export function getDataFromPythonFile(filepath: string, fileText: string): CompilationData {
    const data = { imp: {}, exp: {} } as CompilationData;
    const { imp, exp } = data;
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
    const getPeekOfCode = (index: number) =>
        lines
            .slice(index, index + peekScanLineCount)
            .filter(x => x.trim().length > 0)
            .slice(0, peekLineCount)
            .join('\n');

    for (let index = 0; index < lines.length; index++) {
        const words = lines[index].split(' ');
        const word0 = words[0];
        const word1 = words[1];

        if (word0 === 'class') {
            classes.push({ name: trimClassOrFn(word1), kind: CompletionItemKind.Class, peekOfCode: getPeekOfCode(index) });
        } else if (word0 === 'def') {
            // Don't export private functions
            if (!word1.startsWith('_')) {
                functions.push({ name: trimClassOrFn(word1), kind: CompletionItemKind.Function, peekOfCode: getPeekOfCode(index) });
            }
        } else if (word1 === '=' && pythonIdentifier.test(word0)) {
            constants.push({ name: word0, kind: CompletionItemKind.Variable, peekOfCode: getPeekOfCode(index) });
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
