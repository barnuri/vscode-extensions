import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "Bar Nuri Tools" is now active !');

    let disposable = vscode.commands.registerCommand('extension.textToString', () => {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        const editor: vscode.TextEditor = vscode.window.activeTextEditor;

        let text = editor.document.getText(editor.selection);
        text = text.replace(/\n/g, '\\n');

        editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, text);
        });
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
