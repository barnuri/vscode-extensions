import * as vscode from 'vscode';
import { createDataDir, ignoreThisFile } from './utils';
import { buildDataFile, compilationFileManager, getWorkspacePythonFiles } from './data';
import { RichCompletionItem } from './models/RichCompletionItem';
import { insertImport } from './importer';
import * as path from 'path';
import { getWorkspacePath } from './utils';

export const getCompletionFilePath = () => path.join(getWorkspacePath() || '', '/.vscode/', 'PythonImportHelper-v2-Completion.json');

export async function activate(context: vscode.ExtensionContext) {
    if (getWorkspacePythonFiles().length > 0) {
        createDataDir();
        buildDataFile(true);
    }

    context.subscriptions.push(vscode.commands.registerCommand('extension.rebuild', () => buildDataFile(true)));

    const provider = vscode.languages.registerCompletionItemProvider('python', {
        provideCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position,
            token: vscode.CancellationToken,
            context: vscode.CompletionContext,
        ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
            return compilationFileManager();
        },
        resolveCompletionItem(completionItem: RichCompletionItem) {
            const edit = insertImport(completionItem) as vscode.TextEdit | void;
            if (edit) {
                completionItem.additionalTextEdits = [edit];
            }
            return completionItem;
        },
    });
    context.subscriptions.push(provider);

    const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
    const onChangeOrDelete = async (doc: vscode.Uri) => {
        if (ignoreThisFile(doc.fsPath)) {
            return;
        }
        await buildDataFile(false);
    };
    watcher.onDidChange(onChangeOrDelete);
    watcher.onDidCreate(onChangeOrDelete);
    watcher.onDidDelete(onChangeOrDelete);
    context.subscriptions.push(watcher);
}
