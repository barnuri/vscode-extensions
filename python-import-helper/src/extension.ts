import * as path from 'path';
import { commands, ExtensionContext, window, workspace } from 'vscode';
import * as _ from 'lodash';
import * as globals from './globals';
import { initializePlugin } from './plugins';
import { findPythonImportHelperConfigDir, showProjectExportsCachedMessage } from './utils';
import { plugin } from './plugins';
import { watchForChanges } from './cacher';
import { registerCompletionItemProvider } from './createCompletionItemProvider';

let hasFinalized = false;

export const activate = async function activate(context: ExtensionContext) {
    console.log('PythonImportHelper activating');
    console.log(context);
    globals.context(context);

    // Watch for config changes.
    workspace.onDidSaveTextDocument(async doc => {
        const file = path.basename(doc.fileName, '.js');
        if (!file.startsWith('PythonImportHelper-')) return;
        finalizeExtensionActivation(context);
    });

    workspace.onDidChangeWorkspaceFolders(async ({ added }) => {
        const configWorkspaceFolder = findPythonImportHelperConfigDir(added);
        if (!configWorkspaceFolder) return;
        await initializePlugin(context);
        finalizeExtensionActivation(context);
        showProjectExportsCachedMessage();
    });

    await initializePlugin(context);
    finalizeExtensionActivation(context);

    return {
        registerPlugin: async ({ language }: { language: string }) => {
            window.showErrorMessage(
                `Please uninstall extension PythonImportHelper ${language.toUpperCase()}. PythonImportHelper no longer requires langauge extensions to be installed separately.`,
            );
            await commands.executeCommand('workbench.extensions.action.showEnabledExtensions');
        },
        _test: {
            plugins: [plugin],
        },
        commands: {},
    };
};

export function finalizeExtensionActivation(context: ExtensionContext) {
    if (hasFinalized) return;
    hasFinalized = true;

    context.subscriptions.push(
        workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('PythonImportHelper.configLocation') || e.affectsConfiguration('PythonImportHelper.projectRoot')) {
                initializePlugin(context);
            }
            registerCompletionItemProvider(context);
        }),

        watchForChanges(),
    );
}
