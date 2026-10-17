import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { Position, Range, TextDocument, TextEdit, TextEditor, TextEditorEdit, window } from 'vscode';
import * as vscode from 'vscode';
import { resolve } from 'path';
import config from './config';
import { Renamed } from './models/Renamed';

const pyprojectSourceRootPatterns = [
    /package-dir\s*=\s*\{[^}]*?["']{2}\s*=\s*["']([^"']+)["']/,
    /\bwhere\s*=\s*\[\s*["']([^"']+)["']/,
    /\bfrom\s*=\s*["']([^"']+)["']/,
];

let sourceRootsCache: string[] | undefined;

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

export function ignoreThisFile(x: string) {
    if (config.excludePatterns.some(pattern => pattern.test(x))) {
        return true;
    }
    const segments = x.split(/[\\/]/);
    return segments.some(segment => config.excludeFolders.includes(segment));
}

export function isPythonModuleFile(x: string) {
    return path.extname(x) === '.py' && !x.toLowerCase().endsWith('__.py') && !ignoreThisFile(x);
}

export function getExcludeGlob() {
    const filesExclude = vscode.workspace.getConfiguration('files').get<{ [glob: string]: boolean }>('exclude') ?? {};
    const userExcludes = Object.keys(filesExclude).filter(glob => filesExclude[glob] === true);
    const folderExcludes = config.excludeFolders.map(folder => `**/${folder}/**`);
    return `{${[...userExcludes, ...folderExcludes].join(',')}}`;
}

export function resetSourceRoots() {
    sourceRootsCache = undefined;
}

export function getSourceRoots(): string[] {
    if (sourceRootsCache) {
        return sourceRootsCache;
    }
    const configured = vscode.workspace.getConfiguration(config.settingsSection).get<string[]>('sourceRoots') ?? [];
    const roots = [...configured, ...detectPyprojectSourceRoots()]
        .map(root => root.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, ''))
        .filter(root => root && root !== '.');
    sourceRootsCache = [...new Set(roots)].sort((a, b) => b.length - a.length);
    return sourceRootsCache;
}

function detectPyprojectSourceRoots(): string[] {
    const pyprojectPath = path.join(getWorkspacePath(), config.pyprojectFileName);
    if (!fs.existsSync(pyprojectPath)) {
        return [];
    }
    try {
        const text = fs.readFileSync(pyprojectPath, 'utf8');
        return pyprojectSourceRootPatterns.map(pattern => text.match(pattern)?.[1]).filter((root): root is string => !!root);
    } catch (err) {
        console.error(`detectPyprojectSourceRoots error ${err instanceof Error ? err.message : err}`);
        return [];
    }
}

export function getFilepathKey(filepath: string) {
    const relativePath = path.relative(getWorkspacePath(), filepath).replace(/\\/g, '/');
    const sourceRoot = getSourceRoots().find(root => relativePath.startsWith(root + '/'));
    return sourceRoot ? relativePath.slice(sourceRoot.length + 1) : relativePath;
}

export function filepathKeyToModulePath(filepathKey: string) {
    return filepathKey.replace(/\.py$/, '').replace(/[\\/]/g, '.');
}

export function getModulePath(filepath: string) {
    return filepathKeyToModulePath(getFilepathKey(filepath));
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

export function doesImportExist(imports: string[], newImport: string) {
    const newImportName = newImport.split(' as ')[0].trim();
    return imports.includes(newImportName);
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
