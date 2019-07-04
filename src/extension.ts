import * as vscode from 'vscode';
import { k8sFileBuilder, jenkinsFileBuilder, dockerfileBuilder, pritterFile, nodemonFile } from './addFiles';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "Bar Nuri Tools" is now active !');

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.textToString', () => {
            editSelectedTest(text =>
                text
                    .replace(/\n/g, '\\n')
                    .replace(/"/g, '\\"')
                    .replace(/'/g, "\\'")
                    .replace(/\$/g, '\\\\$'),
            );
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.stringToText', () => {
            editSelectedTest(text =>
                text
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'")
                    .replace(/\\\\\$/g, '$'),
            );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addK8s', async () => {
            // const answer = await vscode.window.showQuickPick(['NodeJS', 'React/Anguler', '.Net Core']);
            k8sFileBuilder();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addJenkins', async () => {
            // const answer = await vscode.window.showQuickPick(['NodeJS', 'React/Anguler', '.Net Core']);
            jenkinsFileBuilder();
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addDocker', async () => {
            dockerfileBuilder();
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addDockerK8sAndJenkins', async () => {
            dockerfileBuilder();
            k8sFileBuilder();
            jenkinsFileBuilder();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addPrettierFile', async () => {
            pritterFile();
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addNodemon', async () => {
            nodemonFile();
        }),
    );
}

function editSelectedTest(modifyFunc: (text: string) => string) {
    if (!vscode.window.activeTextEditor) {
        return;
    }
    const editor: vscode.TextEditor = vscode.window.activeTextEditor;

    editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, modifyFunc(editor.document.getText(editor.selection)));
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
