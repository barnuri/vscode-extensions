import { existsSync, mkdirSync, chmodSync, writeFileSync } from 'fs';
import * as vscode from 'vscode';
import { dirname } from 'path';

export function writeFile(path: string, body: string) {
    let filePath = vscode.workspace.rootPath + '/' + path;
    filePath = fixPath(filePath);
    makeDirIfNotExist(dirname(filePath));
    writeFileSync(filePath, body, { encoding: 'utf8' });
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
