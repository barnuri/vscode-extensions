import * as vscode from 'vscode';
import { createDataDir, ignoreThisFile } from './utils';
import { buildDataFile, compilationFileManager, getWorkspacePythonFiles } from './data';
import { RichCompletionItem } from './models/RichCompletionItem';
import { insertImport } from './importer';
import * as path from 'path';
import { getWorkspacePath } from './utils';

export const getCompletionFilePath = () => path.join(getWorkspacePath() || '', '/.vscode/', 'PythonImportHelper-v2-Completion.json');

export async function activate(context: vscode.ExtensionContext) {
    backgroundTask().catch(() => {});
    context.subscriptions.push(vscode.commands.registerCommand('extension.rebuild', () => buildDataFile(true)));
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('python', {
            provideCompletionItems(
                _: vscode.TextDocument,
                __: vscode.Position,
                ___: vscode.CancellationToken,
                ____: vscode.CompletionContext,
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
        }),
    );
    context.subscriptions.push(PythonFilesWatcher());
}

function PythonFilesWatcher() {
    const watcherCallback = (doc: vscode.Uri) => {
        if (ignoreThisFile(doc.fsPath)) {
            return;
        }
        buildDataFile(false).catch(() => {});
    };

    const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
    watcher.onDidChange(watcherCallback);
    watcher.onDidCreate(watcherCallback);
    watcher.onDidDelete(watcherCallback);
    return watcher;
}

async function backgroundTask() {
    if (getWorkspacePythonFiles().length > 0) {
        createDataDir();
        buildDataFile(true);
    }
}
