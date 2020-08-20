import { ExtensionContext, languages, TextDocument, Position, CancellationToken, CompletionContext, TextEdit, Disposable } from 'vscode';
import { createDataDir } from './utils';
import { buildDataFile, watchForChanges } from './data';
import { RichCompletionItem } from './models/RichCompletionItem';
import { insertImport } from './importer';
import * as path from 'path';
import { getWorkspacePath } from './utils';
import { buildCompletionItems } from './buildImportItems';

export const getDataFilePath = () => path.join(getWorkspacePath() || '', '/.vscode/', 'PythonImportHelper-v2-py.json');

export async function activate(context: ExtensionContext) {
    console.log(getDataFilePath());
    createDataDir();
    buildDataFile(true);

    const provider = {
        async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) {
            return await buildCompletionItems(position);
        },
        resolveCompletionItem(completionItem: RichCompletionItem) {
            const edit = insertImport(completionItem, false) as TextEdit | void;
            if (edit && !edit.range.contains(completionItem.position)) {
                completionItem.additionalTextEdits = [edit];
            }
            return completionItem;
        },
    };

    const disposable = languages.registerCompletionItemProvider('python', provider);
    context.subscriptions.push(disposable);
    DisposableManager.add(disposable);
    context.subscriptions.push(watchForChanges());
    setInterval(() => buildDataFile(), 60000);
}

const disposables: Disposable[] = [];

export const DisposableManager = {
    add(disposable: Disposable) {
        disposables.push(disposable);
    },

    dispose() {
        for (const disposable of disposables) {
            disposable.dispose();
        }
    },
};
