import * as vscode from 'vscode';
import { SwaggerExplorerProvider } from './swaggerExplorerProvider';
import { SwaggerTreeItem } from './models/SwaggerTreeItem';
import open = require('open');

export function activate(context: vscode.ExtensionContext) {
    const swaggerExplorerProvider = new SwaggerExplorerProvider();
    vscode.window.registerTreeDataProvider('extensionView', swaggerExplorerProvider);
    context.subscriptions.push(vscode.commands.registerCommand('extension.refresh', () => swaggerExplorerProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('extension.createConfig', () => swaggerExplorerProvider.createConfig()));
    context.subscriptions.push(vscode.commands.registerCommand('extension.edit', () => swaggerExplorerProvider.openConfigFile()));
    context.subscriptions.push(vscode.commands.registerCommand('extension.generate', (item: SwaggerTreeItem) => item.generate()));
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.info', () => {
            open('http://api.openapi-generator.tech');
            open('https://generator.swagger.io');
        }),
    );
}

export function getTerminal() {
    const terminal = vscode.window.createTerminal(`Terminal`);
    terminal.show(true);
    return terminal;
}

// this method is called when your extension is deactivated
export function deactivate() {}
