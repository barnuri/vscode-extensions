import { commands, ExtensionContext, workspace } from 'vscode';
import { cacheProject, watchForChanges } from '../cacher';
import { registerCompletionItemProvider } from '../createCompletionItemProvider';
import { importUndefinedVariables, selectImport, selectImportForActiveWord } from '../importer';
import { removeUnusedImports } from '../removeUnusedImports';
import catchError from '../catchError';
import { initializePlugins } from '../extension';

let hasFinalized = false;

export function isActivationComplete() {
    return hasFinalized;
}

export function finalizeExtensionActivation(context: ExtensionContext) {
    if (hasFinalized) return;
    hasFinalized = true;

    context.subscriptions.push(
        commands.registerCommand('PythonImportHelper.cacheProject', catchError(cacheProject)),
        commands.registerCommand(
            'PythonImportHelper.selectImport',
            catchError(() => selectImport()),
        ),
        commands.registerCommand(
            'PythonImportHelper.selectImportForActiveWord',
            catchError(() => selectImportForActiveWord()),
        ),
        commands.registerCommand(
            'PythonImportHelper.importUndefinedVariables',
            catchError(() => importUndefinedVariables()),
        ),
        commands.registerCommand('PythonImportHelper.removeUnusedImports', catchError(removeUnusedImports)),
        commands.registerCommand(
            'PythonImportHelper.fixImports',
            catchError(async () => {
                await removeUnusedImports();
                await importUndefinedVariables();
            }),
        ),

        workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('PythonImportHelper.configLocation') || e.affectsConfiguration('PythonImportHelper.projectRoot')) {
                initializePlugins(context);
            }
            registerCompletionItemProvider(context);
        }),

        watchForChanges(),
    );
}
