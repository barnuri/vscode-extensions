import { isFile } from 'utlz';
import { ExtensionContext, workspace } from 'vscode';
import * as path from 'path';
import { registerCompletionItemProvider } from './createCompletionItemProvider';
import { cacheProjectLanguage } from './cacher';

const HIDDEN_FOLDERS_REGEX = /.*\/\..*/;
const sitePackgesFolders = /[\\,\/]site-packages[\\,\/]/g;
export let plugin = {
    cacheFilepath: '',
    excludePatterns: [sitePackgesFolders, HIDDEN_FOLDERS_REGEX] as RegExp[],
    includePaths: ['.'] as string[],
    maxImportLineLength: 100,
};

export async function initializePlugin(context: ExtensionContext) {
    let { workspaceFolders } = workspace;
    if (!workspaceFolders || !workspaceFolders[0] || !workspaceFolders[0].uri || !workspaceFolders[0].uri.fsPath) {
        return;
    }
    const cacheDirPath = context.storagePath || '';
    const cacheFileName = 'PythonImportHelper-v2-py.json';

    plugin = {
        ...plugin,
        cacheFilepath: path.join(cacheDirPath, cacheFileName),
    };

    console.log(plugin.cacheFilepath);
    registerCompletionItemProvider(context);

    console.info(`PythonImportHelper language registered: Python`);
    const isInitialCache = isFile(plugin.cacheFilepath);
    await cacheProjectLanguage();
    return isInitialCache;
}
