import { getCompletionFilePath } from './extension';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { Position, Range, TextDocument, TextEdit, TextEditor, TextEditorEdit, window } from 'vscode';
import makeDir = require('make-dir');
import * as vscode from 'vscode';
import { resolve, join, extname } from 'path';
import { statSync, readdirSync } from 'fs-extra';
import anymatch from 'anymatch';
import config from './config';
import { Renamed } from './models/Renamed';

export function getWorkspacePath(): string {
    const folders = vscode.workspace.workspaceFolders?.map(x => x.uri.fsPath) || [vscode.workspace.rootPath || ''];
    const path = folders[0];
    return fixPath(resolve(path + '/'));
}

export function fixPath(path: string): string {
    try {
        return resolve(path.replace(/\\/g, '/').replace(new RegExp('//'), '/'));
    } catch {
        return resolve(path);
    }
}

const isDirectory = path => statSync(path).isDirectory();

const isFile = path => statSync(path).isFile();
const getFiles = path => {
    return readdirSync(path)
        .map(name => join(path, name))
        .filter(isFile);
};
const getDirectories = path => {
    return readdirSync(path)
        .map(name => join(path, name))
        .filter(isDirectory);
};

export const _getFilesRecursively = path => {
    let dirs = getDirectories(path);
    let files = dirs
        .map(dir => _getFilesRecursively(dir)) // go through each directory
        .reduce((a, b) => a.concat(b), []); // map returns a 2d array (array of file arrays) so flatten
    return files.concat(getFiles(path));
};

export function ignoreThisFile(x: string) {
    return anymatch(config.excludePatterns, x) || x.match(/[\\,\/]site-packages[\\,\/]/g);
}

export const getPythonFiles = path => {
    const allFiles: string[] = _getFilesRecursively(path);
    const pythonFiles = allFiles.filter(x => !ignoreThisFile(x) && extname(x).slice(1) === 'py');
    return pythonFiles;
};

export async function createDataDir() {
    try {
        const cacheFilepath = getCompletionFilePath();
        const dir = path.dirname(cacheFilepath);
        if (fs.existsSync(dir)) {
            return;
        }
        console.log(`creating ${dir}`);
        await makeDir(dir).catch(e => console.error(e));
        try {
            fs.mkdirSync(dir);
        } catch (e) {
            console.error(`createDataDir error ${e}`);
        }
    } catch (ex) {
        console.error(`createDataDir error ${ex}`);
    }
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

export function insertLine(newLine: string, importPosition: any) {
    const { match, isFirstImport } = importPosition;
    const editor = window.activeTextEditor as TextEditor;
    const { document } = editor;

    // If this is the first import and the line after where we're inserting it has content, add an
    // extra line break
    if (isFirstImport && document.lineAt(document.positionAt(match ? match.end + 1 : 0)).text) {
        newLine += '\n';
    }

    return createEdit(TextEdit, document, newLine, importPosition);
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

export function mergeObjectsWithArrays(obj1: {}, obj2: {}) {
    return _.mergeWith(obj1, obj2, (obj, src) => {
        if (Array.isArray(obj)) {
            return _.union(obj, src);
        }
        return undefined;
    });
}

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

export function last<V>(arr: V[]) {
    return arr[arr.length - 1];
}
