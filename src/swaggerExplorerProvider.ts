import * as vscode from 'vscode';
import { writeFile, readFile, makeDirIfNotExist, getFolders } from './fileHelper';
import unzip = require('extract-zip');
import Axios from 'axios';
import { appendFileSync, renameSync } from 'fs';
import { resolve, dirname } from 'path';
import rimraf = require('rimraf');

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
        const swaggerJson = await Axios.get(this.swaggerConfig.swaggerPath).then(res => res.data);
        const linkToZip = await Axios.post(`https://generator.swagger.io/api/gen/clients/${this.swaggerConfig.clientLanguage}`, {
            // swaggerUrl: this.swaggerConfig.swaggerPath,
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
        unzip(zipFilePath, { dir: tmpFolder }, err => {
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
