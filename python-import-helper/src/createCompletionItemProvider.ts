import { CompletionItem, CompletionItemKind, ExtensionContext, languages, Position, TextDocument, TextEdit } from 'vscode';
import { DisposableKey, DisposableManager } from './DisposableManager';
import { cacheFileManager } from './cacheFileManager';
import { ExportData, RichQuickPickItem, RichCompletionItem } from './types';
import { insertImport } from './importer';
import { buildImportItems } from './buildImportItems';
import { CancellationToken, CompletionContext } from 'vscode';
/**
 * Although we are not supposed to modify `CompletionItem.additionalTextEdits` inside
 * `resolveCompletionItem`, computing the potential text edit for every import up front won't scale
 * as a codebase grows. It's not slow... Mumbai took ~150-250 ms, but that's 3-5 times slower than
 * deferring that work until `resolveCompletionItems`.
 *
 * Therefore, we do the work in `resolveCompletionItems`. Although it's apparently possible that the
 * additional text edit will not complete by the time the CompletionItem is resolved, I am
 * consistently seeing resolve times in *under 1ms*! Seems pretty much impossible to select a
 * CompletionItem before that resolution completes.
 *
 * If we eventually find that sometimes the resolution truly doesn't complete, we can add the
 * `selectImportForActiveWord` command as a backup: https://bit.ly/2Yn8xDA. This works well because
 * it is essentially a no-op if the additionalTextEdit insertion was successful. The downside is
 * that it adds an additional action to the undo stack.
 *
 * Note that clicking a suggestion does NOT cause it to auto-import, but that's not a failure of
 * PythonImportHelper's implementation -- VS Code simply doesn't trigger anything additional beyond the
 * insertion of the clicked word (i.e. even CompletionItem.command doesn't run). This is the same as
 * with VS Code's default autoImport functionality.
 */

async function mapItems(exportData: ExportData, position: Position) {
    const defVal = [] as RichCompletionItem<RichQuickPickItem>[];
    if (!exportData) {
        return defVal;
    }
    try {
        const mergedData: any = { ...exportData.imp, ...exportData.exp };
        if (Object.keys(mergedData).length <= 0) {
            return defVal;
        }
        const items = buildImportItems(mergedData);
        const compImtes = items.map((item: any) => {
            const completionItem = new CompletionItem(item.label, CompletionItemKind.Class) as RichCompletionItem;
            // Caching for use in `resolveCompletionItem`
            completionItem.importItem = item;
            completionItem.position = position;
            completionItem.detail = item.description;
            return completionItem;
        });
        return compImtes;
    } catch (error) {
        console.log(error);
        return defVal;
    }
}

export function registerCompletionItemProvider(context: ExtensionContext) {
    const provider = {
        async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) {
            const exportData = await cacheFileManager();
            const mappedItems = mapItems(exportData, position);
            return mappedItems;
        },

        resolveCompletionItem(completionItem: RichCompletionItem) {
            const { importItem, position } = completionItem;
            const edit = insertImport(importItem, false) as TextEdit | void;
            if (edit && !edit.range.contains(position)) completionItem.additionalTextEdits = [edit];
            return completionItem;
        },
    };

    const disposable = languages.registerCompletionItemProvider('python', provider);
    context.subscriptions.push(disposable);
    DisposableManager.add(DisposableKey.PROVIDE_COMPLETIONS, disposable);
}
