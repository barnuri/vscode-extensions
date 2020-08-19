import { getCacheFilePath } from './extension';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { getWorkspacePath } from './helpers';
import { languages, Position, Range, TextDocument, TextEdit, TextEditor, TextEditorEdit, window } from 'vscode';
import config from './config';
import { CompilationData } from './models/CompilationData';
import makeDir = require('make-dir');

export async function writeCacheFile(data: CompilationData) {
    console.log('writeCacheFile');
    await createCacheDir();
    const cacheFilepath = getCacheFilePath();
    fs.writeFileSync(cacheFilepath, JSON.stringify(data));
}

export async function createCacheDir() {
    const cacheFilepath = getCacheFilePath();
    const dir = path.dirname(cacheFilepath);
    console.log(dir);
    await makeDir(dir).catch(e => console.error(e));
    try {
        fs.mkdirSync(dir);
    } catch (e) {
        console.error(e);
    }
}

export function getLangFromFilePath(filePath: string) {
    const ext = path.extname(filePath).slice(1);
    return { py: 'Python' }[ext] || ext;
}

export function getFilepathKey(filepath: string) {
    return filepath.slice(getWorkspacePath().length + 1);
}

export function isPathPackage(importPath: string) {
    if (importPath.startsWith('.')) {
        return false;
    }
    const pathStart = strUntil(importPath, '.');
    return !config.includePaths.some(p => {
        const relativePath = p.slice(getWorkspacePath().length + 1);
        return strUntil(relativePath, '/') === pathStart;
    });
}

export function insertLine(newLine: string, importPosition: any, shouldApplyEdit = true) {
    const { match, isFirstImport } = importPosition;
    const editor = window.activeTextEditor as TextEditor;
    const { document } = editor;

    // If this is the first import and the line after where we're inserting it has content, add an
    // extra line break
    if (isFirstImport && document.lineAt(document.positionAt(match ? match.end + 1 : 0)).text) {
        newLine += '\n';
    }

    return shouldApplyEdit
        ? editor.edit(builder => createEdit(builder, document, newLine, importPosition))
        : createEdit(TextEdit, document, newLine, importPosition);
}

function createEdit(edit: TextEditorEdit | typeof TextEdit, document: TextDocument, newLine: string, importPosition: any) {
    const { match, indexModifier } = importPosition;

    if (!match) {
        return edit.insert(new Position(0, 0), newLine + '\n');
    } else if (!indexModifier) {
        return edit.replace(new Range(document.positionAt(match.start), document.positionAt(match.end)), newLine);
    } else if (indexModifier === 1) {
        return edit.insert(document.positionAt(match.end), '\n' + newLine);
    } else {
        // -1
        return edit.insert(document.positionAt(match.start), newLine + '\n');
    }
}

export function getTabChar() {
    const { options } = window.activeTextEditor as TextEditor;
    return options.insertSpaces ? _.repeat(' ', Number(options.tabSize) || 2) : '\t';
}

export function strUntil(str: string, endChar: string | RegExp) {
    const index = typeof endChar === 'string' ? str.indexOf(endChar) : str.search(endChar);
    return index < 0 ? str : str.slice(0, index);
}

export function getLastInitialComment(text: string, commentRegex: RegExp) {
    // Iterates over comment line matches. If one doesn't begin where the previous one left off, this
    // means a non comment line came between them.
    let expectedNextIndex = 0;
    let match;
    let lastMatch;
    while ((match = commentRegex.exec(text))) {
        if (match.index !== expectedNextIndex) {
            break;
        }
        expectedNextIndex = commentRegex.lastIndex + 1;
        lastMatch = match;
    }

    return lastMatch
        ? {
              start: lastMatch.index,
              end: lastMatch.index + lastMatch[0].length,
          }
        : null;
}

export function getDiagnosticsForActiveEditor() {
    const editor = window.activeTextEditor as TextEditor;
    return languages.getDiagnostics(editor.document.uri).filter(d => d.code === 'F821');
}

export function mergeObjectsWithArrays(obj1: {}, obj2: {}) {
    return _.mergeWith(obj1, obj2, (obj, src) => {
        if (Array.isArray(obj)) {
            return _.union(obj, src);
        }
        return undefined;
    });
}

export type Renamed = {
    [originalName: string]: string;
};

export function addNamesAndRenames(imports: string[], names: string[], renamed: Renamed) {
    for (const imp of imports) {
        const parts = imp.split(' as ');
        const name = parts[0].trim();
        if (!name) {
            continue;
        }
        names.push(name);
        if (parts[1]) {
            renamed[name] = parts[1].trim();
        }
    }
}

export function doesImportExist(imports: string[], newImport: string, renamed: Renamed) {
    const parts = newImport.split(' as ');
    const newImportName = parts[0].trim();
    const newImportRename = parts[1] ? parts[1].trim() : null;

    if (!imports.includes(newImportName)) {
        return false;
    }

    const existingImportRename = renamed[newImportName];
    if (newImportRename !== existingImportRename) {
        window.showWarningMessage(`Already imported as \`${existingImportRename || newImportName}\`.`);
    }

    return true;
}

export function preserveRenamedImports(imports: string[], renamed: Renamed) {
    if (_.isEmpty(renamed)) {
        return [...imports];
    }

    return imports.map(name => {
        const renaming = renamed[name];
        return renaming ? `${name} as ${renaming}` : name;
    });
}

export function showProjectExportsCachedMessage() {
    window.showInformationMessage('Project exports have been cached. 🐔');
}

export function last<V>(arr: V[]) {
    return arr[arr.length - 1];
}
