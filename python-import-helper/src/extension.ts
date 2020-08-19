import { DisposableManager, DisposableKey } from './DisposableManager';
import { ExtensionContext, workspace, languages, TextDocument, Position, CancellationToken, CompletionContext, TextEdit } from 'vscode';
import { createCacheDir, showProjectExportsCachedMessage } from './utils';
import { cacheFolder, watchForChanges } from './cacher';
import { RichCompletionItem } from './models/RichCompletionItem';
import { insertImport } from './importer';
import { mapItems } from './buildImportItems';
import * as path from 'path';
import { getWorkspacePath } from './helpers';

export const getCacheFilePath = () => path.join(getWorkspacePath() || '', '/.vscode/', 'PythonImportHelper-v2-py.json');

export async function activate(context: ExtensionContext) {
    console.log(getCacheFilePath());
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
    setInterval(() => cacheFolder(false).catch(() => {}), 3000);

    workspace.onDidChangeWorkspaceFolders(async ({ added }) => {
        await cacheFolder(false).catch(() => {});
        showProjectExportsCachedMessage();
    });
}
