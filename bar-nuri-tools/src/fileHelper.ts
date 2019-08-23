import { existsSync, mkdirSync, chmodSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import * as vscode from 'vscode';
import { dirname, join, resolve } from 'path';

export function getWorkspacePath(): string {
    if (!vscode.workspace.rootPath) {
        throw new Error('Generator From Swagger: please select a workspace folder');
    }
    return fixPath(resolve(vscode.workspace.rootPath + '/'));
}

export function writeFile(path: string, body: string, fullPath: boolean = false) {
    let filePath = resolve(fullPath ? '' : getWorkspacePath(), path);
    filePath = fixPath(filePath);
    makeDirIfNotExist(dirname(filePath));
    writeFileSync(filePath, body, { encoding: 'utf8' });
}

export function getPackageJson() {
    return JSON.parse(readFile('./package.json'));
}

export function modifyPackageJson(modifyFunc: (packageJson: any) => any) {
    const packagejson = getPackageJson();
    const newPackjson = modifyFunc(packagejson);
    writeFile('package.json', JSON.stringify(newPackjson, null, 4));
}

export function readFile(path: string, userFolder: boolean = true) {
    let filePath = (userFolder ? getWorkspacePath() : __dirname) + '/' + path;
    filePath = fixPath(filePath);
    return readFileSync(filePath, 'utf8');
}

export function fixPath(path: string): string {
    try {
        return resolve(path.replace(/\\/g, '/').replace(new RegExp('//'), '/'));
    } catch {
        return resolve(path);
    }
}

export function makeDirIfNotExist(dir: string) {
    dir = fixPath(dir);
    try {
        if (!existsSync(dir)) {
            mkdirSync(dir);
        }
    } catch (e) {
        console.error(`makeDirIfNotExist error path = ${dir}`, e);
    }
    setFullPermission(dir);
}

export function setFullPermission(path: string) {
    try {
        chmodSync(path, 0o777);
    } catch (e) {
        console.error(`setFullPermission error path = ${path}`, e);
    }
}

/** Retrieve file paths from a given folder and its subfolders. */
export function getFilePaths(folderPath: string): string[] {
    const entryPaths: string[] = readdirSync(folderPath).map(entry => join(folderPath, entry));
    const filePaths: string[] = entryPaths.filter(entryPath => statSync(entryPath).isFile());
    const dirPaths: string[] = entryPaths.filter(entryPath => !filePaths.includes(entryPath));
    const dirFiles: string[] = dirPaths.reduce((prev: string[], curr: string) => prev.concat(getFilePaths(curr)), []);
    return [...filePaths, ...dirFiles];
}

export function getFolders(folderPath: string): string[] {
    const entryPaths: string[] = readdirSync(folderPath).map(entry => join(folderPath, entry));
    return entryPaths.filter(entryPath => !statSync(entryPath).isFile());
}

export function getFileExtension(filename: string) {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2) || '';
}
