import { isFile } from 'utlz';
import { ExtensionContext, workspace } from 'vscode';
import * as path from 'path';
import { registerCompletionItemProvider } from './createCompletionItemProvider';
import { cacheProjectLanguage } from './cacher';

const HIDDEN_FOLDERS_REGEX = /.*\/\..*/;
const sitePackgesFolders = /\*\*\/site-packages\/\*\*\/\*.py/g;
export let plugin = {
    cacheDirPath: '',
    cacheFilepath: '',
    projectRoot: '',
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
    const language = 'py';

    plugin.excludePatterns.push(HIDDEN_FOLDERS_REGEX);

    plugin = {
        ...plugin,
        cacheDirPath,
        cacheFilepath: path.join(cacheDirPath, cacheFileName),
        projectRoot: workspaceFolders[0].uri.fsPath,
    };

    registerCompletionItemProvider(context);

    console.info(`PythonImportHelper language registered: ${language}`);
    const isInitialCache = isFile(plugin.cacheFilepath);
    await cacheProjectLanguage();
    return isInitialCache;
}
