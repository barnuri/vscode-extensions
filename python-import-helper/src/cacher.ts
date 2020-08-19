import { Uri, workspace } from 'vscode';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import { getFilepathKey, isPathPackage, mergeObjectsWithArrays, showProjectExportsCachedMessage, writeCacheFile } from './utils';
import { cacheFileManager } from './cacheFileManager';
import { plugin } from './plugins';
import { CachingData } from './types';
import { getWorkspacePath, getPythonFiles, ignoreThisFile } from './helpers';
import { parseImports } from './regex';

async function cacheDir(dir: string, recursive: boolean, data: CachingData): Promise<CachingData> {
    try {
        let files: string[] = getPythonFiles(dir);
        for (const fullPath of files) {
            cacheFile(fullPath, data);
        }
        return data;
    } catch (err) {
        console.log(err);
        return data;
    }
}

export async function cacheProjectLanguage() {
    const cachedDirTrees = await cacheDir(getWorkspacePath(), true, { imp: {}, exp: {} });
    const finalData = { exp: {}, imp: {} };
    Object.assign(finalData.exp, cachedDirTrees.exp);
    // Merge extra import arrays
    mergeObjectsWithArrays(finalData.imp, cachedDirTrees.imp);
    await writeCacheFile(finalData);
}

export function cacheProject() {
    return Promise.all(_.map([plugin], cacheProjectLanguage)).then(showProjectExportsCachedMessage);
}

function onChangeOrCreate(doc: Uri) {
    if (
        !plugin ||
        ignoreThisFile(doc.fsPath) ||
        // TODO: Since we are watching all files in the workspace, not just those in
        // plugin.includePaths, we need to make sure that it is actually in that array. Can this be
        // changed so that we only watch files in plugin.includePaths to begin with? Not sure if this
        // can be accomplished with a single glob. If not, we'd need multiple watchers. Would either
        // case be more efficient than what we're currently doing?
        !plugin.includePaths.some(p => doc.fsPath.startsWith(p))
    )
        return;

    const { exp, imp } = cacheFile(doc.fsPath, {
        imp: {},
        exp: {},
    });
    if (_.isEmpty(exp) && _.isEmpty(imp)) return;

    for (const k in exp) exp[k].cached = Date.now();

    return cacheFileManager(cachedData => {
        // Concatenate & dedupe named/types arrays. Merge them into extraImports since that will in turn
        // get merged back into cachedData
        mergeObjectsWithArrays(cachedData.imp, imp);
        Object.assign(cachedData.exp, exp);

        return writeCacheFile(cachedData);
    });
}

export function watchForChanges() {
    const watcher = workspace.createFileSystemWatcher('**/*.*');

    watcher.onDidChange(onChangeOrCreate);
    watcher.onDidCreate(onChangeOrCreate);

    watcher.onDidDelete(doc => {
        cacheFileManager(async cachedData => {
            const key = getFilepathKey(doc.fsPath);
            const { exp } = cachedData;
            if (!exp[key]) return;
            delete exp[key];
            return writeCacheFile(cachedData);
        });
    });

    return watcher;
}

export function cacheFile(filepath: string, data: CachingData) {
    const { imp, exp } = data;
    const fileText = fs.readFileSync(filepath, 'utf8');
    const imports = parseImports(fileText);

    for (const importData of imports) {
        if (isPathPackage(importData.path)) {
            const existing = imp[importData.path] || {};
            imp[importData.path] = existing;
            existing.isExtraImport = true;
            if (importData.isEntirePackage) {
                existing.importEntirePackage = true;
            } else {
                existing.exports = _.union(existing.exports, importData.imports);
            }
        }
        // If there are imports then they'll get added to the cache when that file gets cached. For
        // now, we only need to worry about whether then entire file is being imported
        else if (importData.isEntirePackage) {
            exp[importData.path] = { importEntirePackage: true };
        }
    }

    const classes = [] as any[];
    const functions = [] as any[];
    const constants = [] as any[];
    const lines = fileText.split('\n');

    for (const line of lines) {
        const words = line.split(' ');
        const word0 = words[0];
        const word1 = words[1];

        if (word0 === 'class') {
            classes.push(trimClassOrFn(word1));
        } else if (word0 === 'def') {
            // Don't export private functions
            if (!word1.startsWith('_')) functions.push(trimClassOrFn(word1));
        } else if (word1 === '=' && word0.toUpperCase() === word0) {
            constants.push(word0);
        }
    }

    const fileExports = [...classes.sort(), ...functions.sort(), ...constants.sort()];
    if (fileExports.length) exp[getFilepathKey(filepath)] = { exports: fileExports };

    return data;
}

function trimClassOrFn(str: string) {
    return str.slice(0, str.indexOf('('));
}
