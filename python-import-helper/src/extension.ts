import * as vscode from 'vscode';
import { getModulePath, getWorkspacePath, isPythonModuleFile, resetSourceRoots } from './utils';
import { buildDataFile, getCompletionItemsContaining, updateFiles } from './data';
import { RichCompletionItem } from './models/RichCompletionItem';
import { insertImport } from './importer';
import { buildDocumentation } from './buildImportItems';
import config from './config';

export async function activate(context: vscode.ExtensionContext) {
    buildDataFile(true).catch(err => console.error(`buildDataFile error ${err}`));
    context.subscriptions.push(vscode.commands.registerCommand('extension.rebuild', () => buildDataFile(true)));
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('python', {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {
                return getImportCompletions(document, position);
            },
            resolveCompletionItem(completionItem: RichCompletionItem) {
                completionItem.documentation = buildDocumentation(completionItem);
                const edit = insertImport(completionItem) as vscode.TextEdit | void;
                if (edit) {
                    completionItem.additionalTextEdits = [edit];
                }
                return completionItem;
            },
        }),
    );
    context.subscriptions.push(...PythonFilesWatcher());
}

function getImportCompletions(document: vscode.TextDocument, position: vscode.Position): RichCompletionItem[] | undefined {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
        return undefined;
    }
    const lineText = document.lineAt(position.line).text;
    if (lineText[wordRange.start.character - 1] === '.') {
        return undefined;
    }
    const currentModule = getModulePath(document.uri.fsPath);
    const firstChar = document.getText(wordRange)[0].toLowerCase();
    return getCompletionItemsContaining(firstChar)
        .filter(item => item.importPath !== currentModule)
        .map(item => ({ ...item }));
}

function PythonFilesWatcher(): vscode.Disposable[] {
    const pendingFiles = new Set<string>();
    let rebuildTimer: NodeJS.Timeout | undefined;
    const flushPendingFiles = () => {
        const files = [...pendingFiles];
        pendingFiles.clear();
        updateFiles(files).catch(err => console.error(`updateFiles error ${err}`));
    };
    const watcherCallback = (doc: vscode.Uri) => {
        if (!isPythonModuleFile(doc.fsPath)) {
            return;
        }
        pendingFiles.add(doc.fsPath);
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(flushPendingFiles, config.rebuildDelayMs);
    };
    const rebuildAll = () => {
        resetSourceRoots();
        buildDataFile(false).catch(err => console.error(`buildDataFile error ${err}`));
    };

    const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
    watcher.onDidChange(watcherCallback);
    watcher.onDidCreate(watcherCallback);
    watcher.onDidDelete(watcherCallback);

    const pyprojectWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(getWorkspacePath(), config.pyprojectFileName));
    pyprojectWatcher.onDidChange(rebuildAll);
    pyprojectWatcher.onDidCreate(rebuildAll);
    pyprojectWatcher.onDidDelete(rebuildAll);

    const configWatcher = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration(config.settingsSection)) {
            rebuildAll();
        }
    });

    return [watcher, pyprojectWatcher, configWatcher, { dispose: () => clearTimeout(rebuildTimer) }];
}
