import * as vscode from 'vscode';
import { writeFile, readFile, getWorkspacePath } from './fileHelper';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { SwaggerConfig } from './models/SwaggerConfig';
import { SwaggerTreeItem } from './models/SwaggerTreeItem';
import defaultFile from './defaultFile';

export class SwaggerExplorerProvider implements vscode.TreeDataProvider<SwaggerTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SwaggerTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    public configFile = './.vscode/generator-from-swagger.json';
    public refresh = () => this._onDidChangeTreeData.fire(undefined);
    getTreeItem = (element: SwaggerTreeItem) => element;
    constructor() {
        this.watchFile();
    }

    watchFile(): void {
        let prev = JSON.stringify(this.readConfig());
        setInterval(() => {
            try {
                const current = JSON.stringify(this.readConfig());
                if (prev !== current) {
                    this.refresh();
                }
            } catch {}
        }, 500);
    }

    readConfig = () => {
        try {
            return JSON.parse(readFile(this.configFile));
        } catch {
            return [];
        }
    }

    createConfig() {
        try {
            if (existsSync(resolve(getWorkspacePath() + '/' + this.configFile))) {
                return;
            }
            const defaultFileObj = JSON.stringify(defaultFile, undefined, 4);
            writeFile(this.configFile, defaultFileObj);
            this.openConfigFile();
        } catch {}
    }

    openConfigFile() {
        const filePath = resolve(getWorkspacePath(), this.configFile);
        if (!existsSync(filePath)) {
            this.createConfig();
            return;
        }
        vscode.workspace
            .openTextDocument(filePath)
            .then(res =>
                vscode.window
                    .showTextDocument(res, { preview: false })
                    .then(() => vscode.commands.executeCommand('workbench.explorer.fileView.focus')),
            );
    }

    getChildren(element?: SwaggerTreeItem | undefined) {
        const iconFolder = resolve(__filename, '../../resources/');
        if (!element) {
            const swaggerConfigs: SwaggerConfig[] = this.readConfig();

            return swaggerConfigs.map(conf => {
                const item = new SwaggerTreeItem(conf.name);
                item.swaggerConfig = conf;
                item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                item.contextValue = 'parent';
                item.iconPath = resolve(iconFolder, 'Swagger2.svg');
                return item;
            });
        }
        const file = new SwaggerTreeItem(element.swaggerConfig.swaggerPath);
        file.iconPath = {
            dark: resolve(iconFolder, 'dark/document.svg'),
            light: resolve(iconFolder, 'light/document.svg'),
        };
        const lang = new SwaggerTreeItem(element.swaggerConfig.language);
        lang.iconPath = {
            dark: resolve(iconFolder, 'dark/string.svg'),
            light: resolve(iconFolder, 'light/string.svg'),
        };
        const folder = new SwaggerTreeItem(element.swaggerConfig.outputFolder);
        folder.iconPath = {
            dark: resolve(iconFolder, 'dark/folder.svg'),
            light: resolve(iconFolder, 'light/folder.svg'),
        };
        return [file, lang, folder];
    }
}
