import * as vscode from 'vscode';
import { writeFile, readFile, makeDirIfNotExist, getFolders } from './fileHelper';
import { appendFileSync, renameSync } from 'fs';
import { resolve } from 'path';
import rimraf = require('rimraf');
import unzip = require('extract-zip');
import Axios from 'axios';

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
        const iconFolder = resolve(__filename, '../../resources/');
        if (!element) {
            this.init();
            const swaggerConfigs: SwaggerConfig[] = JSON.parse(readFile(this.configFile));

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
        const lang = new SwaggerTreeItem(element.swaggerConfig.clientLanguage);
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

class SwaggerConfig {
    name!: string;
    swaggerPath!: string;
    outputFolder!: string;
    clientLanguage!: string;
}

export class SwaggerTreeItem extends vscode.TreeItem {
    swaggerConfig!: SwaggerConfig;
    generate = async () => {
        let swaggerJson = {};
        if (this.swaggerConfig.swaggerPath.indexOf('http') === 0) {
            swaggerJson = await Axios.get(this.swaggerConfig.swaggerPath).then(res => res.data);
        } else {
            swaggerJson = JSON.parse(readFile(this.swaggerConfig.swaggerPath));
        }

        const linkToZip = await Axios.post(`https://generator.swagger.io/api/gen/clients/${this.swaggerConfig.clientLanguage}`, {
            spec: swaggerJson,
        })
            .then(x => x.data.link)
            .catch(err => {
                throw err;
            });
        const zipFileBinary = await Axios.get(linkToZip, { responseType: 'arraybuffer' }).then(x => x.data);
        const outputFolder = resolve(vscode.workspace.rootPath || '', this.swaggerConfig.outputFolder);
        const tmpFolder = outputFolder + 'tmp';
        const zipFilePath = tmpFolder + '/zipFile.zip';
        rimraf.sync(outputFolder);
        rimraf.sync(tmpFolder);
        makeDirIfNotExist(tmpFolder);
        appendFileSync(zipFilePath, new Buffer(zipFileBinary));
        unzip(zipFilePath, { dir: tmpFolder }, (err: any) => {
            if (err) {
                return;
            }
            rimraf.sync(zipFilePath);
            const folderToMove = getFolders(tmpFolder)[0];
            renameSync(folderToMove, outputFolder);
            rimraf.sync(tmpFolder);
        });
    }
}
