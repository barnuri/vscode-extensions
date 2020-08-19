import { DisposableManager, DisposableKey } from './DisposableManager';
import { ExtensionContext, workspace, languages, TextDocument, Position, CancellationToken, CompletionContext, TextEdit } from 'vscode';
import { createCacheDir, findPythonImportHelperConfigDir, showProjectExportsCachedMessage } from './utils';
import { cacheFolder, watchForChanges } from './cacher';
import { RichCompletionItem } from './models/RichCompletionItem';
import { insertImport } from './importer';
import { mapItems } from './buildImportItems';
import * as path from 'path';
import { getWorkspacePath } from './helpers';
export let cacheFilepath = '';

export async function activate(context: ExtensionContext) {
    cacheFilepath = path.join(getWorkspacePath() || '', '/.vscode/', 'PythonImportHelper-v2-py.json');
    console.log(cacheFilepath);
    console.log('writeCacheFile');
    await createCacheDir();
    cacheFolder().catch(() => {});

    const provider = {
        provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) {
            return mapItems(position);
        },
        resolveCompletionItem(completionItem: RichCompletionItem) {
            const { importItem, position } = completionItem;
            const edit = insertImport(importItem, false) as TextEdit | void;
            if (edit && !edit.range.contains(position)) {
                completionItem.additionalTextEdits = [edit];
            }
            return completionItem;
        },
    };

    const disposable = languages.registerCompletionItemProvider('python', provider);
    context.subscriptions.push(disposable);
    DisposableManager.add(DisposableKey.PROVIDE_COMPLETIONS, disposable);
    context.subscriptions.push(watchForChanges());

    workspace.onDidChangeWorkspaceFolders(async ({ added }) => {
        if (!findPythonImportHelperConfigDir(added)) {
            return;
        }
        await cacheFolder().catch(() => {});
        showProjectExportsCachedMessage();
    });
}
