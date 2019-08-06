import * as vscode from 'vscode';

export class SwaggerExplorerProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    onDidChangeTreeData?: vscode.Event<vscode.TreeItem | null | undefined> | undefined;

    getRootFolder = () => vscode.workspace.rootPath || '';

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(element?: vscode.TreeItem | undefined) {
        return [new vscode.TreeItem('aa'), new vscode.TreeItem('bb')];
    }
}
