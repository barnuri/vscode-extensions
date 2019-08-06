import * as vscode from 'vscode';

export class TreeTask extends vscode.TreeItem {
    type: string;

    constructor(type: string, label: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: vscode.Command) {
        super(label, collapsibleState);
        this.type = type;
        this.command = command;
    }
}
