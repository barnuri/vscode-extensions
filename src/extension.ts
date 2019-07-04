import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "Bar Nuri Tools" is now active !');

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.textToString', () => {
            editSelectedTest(text => text.replace(/\n/g, '\\n'));
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.stringToText', () => {
            editSelectedTest(text => text.replace(/\\n/g, '\n'));
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
