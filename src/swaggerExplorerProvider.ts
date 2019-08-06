import * as vscode from 'vscode';
import { writeFile, readFile } from './fileHelper';
import { getTerminal } from './extension';

export class SwaggerExplorerProvider implements vscode.TreeDataProvider<SwaggerTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SwaggerTreeItem | undefined> = new vscode.EventEmitter<SwaggerTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<SwaggerTreeItem | undefined> = this._onDidChangeTreeData.event;
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    configFile = '/.vscode/swagger-explorer.json';
    defualtFile: SwaggerConfig[] = [
        {
            name: 'temp',
            swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
            outputFolder: './generatedClientFromSwagger',
            clientLanguage: 'typescript-node',
        },
    ];
    init = () => {
        try {
            readFile(this.configFile);
        } catch {
            writeFile(this.configFile, JSON.stringify(this.defualtFile, undefined, 4));
        }
    }
    getTreeItem(element: SwaggerTreeItem): SwaggerTreeItem | Thenable<SwaggerTreeItem> {
        return element;
    }
    getChildren(element?: SwaggerTreeItem | undefined) {
        if (!element) {
            this.init();
            const swaggerConfigs: SwaggerConfig[] = JSON.parse(readFile(this.configFile));

            return swaggerConfigs.map(conf => {
                const item = new SwaggerTreeItem(conf.name);
                item.swaggerConfig = conf;
                item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                item.contextValue = 'parent';
                return item;
            });
        }
        return [
            new SwaggerTreeItem('path: ' + element.swaggerConfig.swaggerPath),
            new SwaggerTreeItem('lang: ' + element.swaggerConfig.clientLanguage),
            new SwaggerTreeItem('output: ' + element.swaggerConfig.outputFolder),
        ];
    }
}

class SwaggerConfig {
    name: string;
    swaggerPath: string;
    outputFolder: string;
    clientLanguage: string;
}

export class SwaggerTreeItem extends vscode.TreeItem {
    swaggerConfig: SwaggerConfig;
    generate = async () => {
        getTerminal().sendText('echo ' + this.swaggerConfig.swaggerPath);
    }
}
