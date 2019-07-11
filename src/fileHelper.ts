import { existsSync, mkdirSync, chmodSync, writeFileSync, readFileSync } from 'fs';
import * as vscode from 'vscode';
import { dirname } from 'path';

export function writeFile(path: string, body: string, fullPath: boolean = false) {
    let filePath = (fullPath ? '' : vscode.workspace.rootPath + '/') + path;
    filePath = fixPath(filePath);
    makeDirIfNotExist(dirname(filePath));
    writeFileSync(filePath, body, { encoding: 'utf8' });
}

export function getPackageJson() {
    return JSON.parse(readFile('./package.json'));
}

export function modifyPackageJson(modifyFunc: (packageJson: any) => any) {
    const packagejson = getPackageJson();
    writeFile('package.json', JSON.stringify(modifyFunc(packagejson), null, 4));
}

export function readFile(path: string, userFolder: boolean = true) {
    let filePath = (userFolder ? vscode.workspace.rootPath : __dirname) + '/' + path;
    filePath = fixPath(filePath);
    return readFileSync(filePath, 'utf8');
}

export function fixPath(path: string): string {
    try {
        return path.replace(/\\/g, '/').replace(new RegExp('//'), '/');
    } catch {
        return path;
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
