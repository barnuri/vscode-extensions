import * as path from 'path';
import { commands, ExtensionContext, window, workspace } from 'vscode';
import * as _ from 'lodash';
import * as globals from './globals';
import catchError from './catchError';
import { finalizeExtensionActivation } from './initialization/finalizeExtensionActivation';
import { initProject } from './initialization/initProject';
import { initializePlugin } from './plugins';
import { findPythonImportHelperConfigDir, showProjectExportsCachedMessage } from './utils';
import { plugin } from './plugins';

export const activate = async function activate(context: ExtensionContext) {
    console.log('PythonImportHelper activating');
    console.log(context);
    globals.context(context);

    // We need these commands active regardless of whether any plugins exist
    context.subscriptions.push(
        commands.registerCommand(
            'PythonImportHelper.initProject',
            catchError(() => initProject(context)),
        ),
    );

    // Watch for config changes.
    workspace.onDidSaveTextDocument(async doc => {
        const file = path.basename(doc.fileName, '.js');
        if (!file.startsWith('PythonImportHelper-')) return;
        finalizeExtensionActivation(context);
    });

    workspace.onDidChangeWorkspaceFolders(async ({ added }) => {
        const configWorkspaceFolder = findPythonImportHelperConfigDir(added);
        if (!configWorkspaceFolder) return;
        await initializePlugins(context);
        finalizeExtensionActivation(context);
        showProjectExportsCachedMessage();
    });

    await initializePlugins(context);
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
        // Prevent PythonImportHelper JS/PY from throwing error. TODO: Remove some time in the future
        commands: {},
    };
};

export function initializePlugins(context: ExtensionContext) {
    initializePlugin(context);
}
