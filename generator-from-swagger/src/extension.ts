import * as vscode from 'vscode';
import { SwaggerExplorerProvider } from './swaggerExplorerProvider';
import { SwaggerTreeItem } from "./models/SwaggerTreeItem";
import open = require('open');

export function activate(context: vscode.ExtensionContext) {
    const swaggerExplorerProvider = new SwaggerExplorerProvider();
    vscode.window.registerTreeDataProvider('generator-from-swagger', swaggerExplorerProvider);
    context.subscriptions.push(vscode.commands.registerCommand('generator-from-swagger.refresh', () => swaggerExplorerProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('generator-from-swagger.createConfig', () => swaggerExplorerProvider.createConfig()));
    context.subscriptions.push(vscode.commands.registerCommand('generator-from-swagger.edit', () => swaggerExplorerProvider.openConfigFile()));
    context.subscriptions.push(vscode.commands.registerCommand('generator-from-swagger.generate', (item: SwaggerTreeItem) => item.generate()));
    context.subscriptions.push(vscode.commands.registerCommand('generator-from-swagger.info', () => open('http://api.openapi-generator.tech')));
}

export function getTerminal() {
    const terminal = vscode.window.createTerminal(`Terminal`);
    terminal.show(true);
    return terminal;
}

// this method is called when your extension is deactivated
export function deactivate() {}
