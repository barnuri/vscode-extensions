import * as vscode from 'vscode';
import { k8sFileBuilder, jenkinsFileBuilder, dockerfileBuilder, pritterFile, nodemonFile } from './addFiles';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.textToString', () => {
            editSelectedTest(text =>
                text
                    .replace(/\n/g, '\\n')
                    .replace(/"/g, '\\"')
                    .replace(/'/g, "\\'")
                    .replace(/\\/g, '\\')
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
        vscode.commands.registerCommand('extension.textToStringArray', () => {
            editSelectedTest(
                text =>
                    '["' +
                    text
                        .replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"')
                        .replace(/'/g, "\\'")
                        .replace(/\$/g, '\\\\$')
                        .replace(/\\n/g, '!@#!@##@!!@##@!!@#@!@')
                        .split('\n')
                        .join(' " , "')
                        .replace(/!@#!@##@!!@##@!!@#@!@/g, '\\n') +
                    '"]',
            );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.stringArrayToText', () => {
            editSelectedTest(text => {
                const lines = JSON.parse(text) as string[];
                for (let index = 0; index < lines.length; index++) {
                    lines[index] = lines[index]
                        .replace(/\\"/g, '"')
                        .replace(/\\'/g, "'")
                        .replace(/\\\\\$/g, '$');
                }
                return lines.join('\n');
            });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addK8s', async () => {
            k8sFileBuilder();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addJenkins', async () => {
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
