import { Uri, workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import anymatch from 'anymatch';
import { getFilepathKey, getLangFromFilePath, mergeObjectsWithArrays, showProjectExportsCachedMessage, writeCacheFile } from './utils';
import { cacheFileManager } from './cacheFileManager';
import { plugin } from './plugins';
import { CachingData } from './types';
import { cacheFile } from './plugins/python/cacher';

function shouldIgnore(filePath: string) {
    return anymatch(plugin.excludePatterns, filePath);
}

async function cacheDir(dir: string, recursive: boolean, data: CachingData): Promise<CachingData> {
    try {
        const items = await fs.readdir(dir);
        const readDirPromises: Promise<any>[] = [] as any[];

        for (const item of items) {
            const fullPath = path.join(dir, item);
            if (shouldIgnore(fullPath)) continue;

            readDirPromises.push(
                fs.stat(fullPath).then(async stats => {
                    if (stats.isFile()) {
                        const fileLang = getLangFromFilePath(item);
                        if (fileLang === 'Python') {
                            await cacheFile(fullPath, data);
                        }
                    } else if (recursive) {
                        await cacheDir(fullPath, true, data);
                    }

                    return Promise.resolve();
                }),
            );
        }

        await Promise.all(readDirPromises);
        return data;
    } catch (err) {
        console.log(err);
        return data;
    }
}

export async function cacheProjectLanguage() {
    const cachedDirTrees = await cacheDir(plugin.projectRoot, true, { imp: {}, exp: {} });
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
        shouldIgnore(doc.fsPath) ||
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
