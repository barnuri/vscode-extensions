import * as vscode from 'vscode';
import { resolve, join } from 'path';
import { statSync, readdirSync } from 'fs-extra';
import anymatch from 'anymatch';
import { plugin } from './plugins';
import { getLangFromFilePath } from './utils';

export function getWorkspacePath(): string {
    if (!vscode.workspace.rootPath) {
        throw new Error('Generator From Swagger: please select a workspace folder');
    }
    return fixPath(resolve(vscode.workspace.rootPath + '/'));
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
    return anymatch(plugin.excludePatterns, x) || x.match(/[\\,\/]site-packages[\\,\/]/g);
}

export const getPythonFiles = path => {
    const allFiles: string[] = _getFilesRecursively(path);
    const pythonFiles = allFiles.filter(x => !ignoreThisFile(x) && getLangFromFilePath(x) === 'Python');
    return pythonFiles;
};