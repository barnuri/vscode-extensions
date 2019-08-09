import * as vscode from 'vscode';
import { writeFile, readFile, makeDirIfNotExist, getFolders } from './fileHelper';
import { appendFileSync, renameSync } from 'fs';
import { resolve } from 'path';
import rimraf = require('rimraf');
import unzip = require('extract-zip');
import Axios from 'axios';
import { getTerminal } from './extension';

export class SwaggerExplorerProvider implements vscode.TreeDataProvider<SwaggerTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SwaggerTreeItem | undefined> = new vscode.EventEmitter<SwaggerTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<SwaggerTreeItem | undefined> = this._onDidChangeTreeData.event;
    constructor() {
        this.watchFile();
    }
    watchFile(): void {
        let prev = JSON.stringify(this.readConfig());
        setInterval(() => {
            const current = JSON.stringify(this.readConfig());
            if (prev !== current) {
                this.refresh();
            }
        }, 500);
    }
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    public configFile = './.vscode/swagger-explorer.json';
    defualtFile: SwaggerConfig[] = [
        {
            name: 'temp',
            swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
            outputFolder: './generatedClientFromSwagger',
            clientLanguage: 'typescript-node',
        },
    ];
    readConfig = () => {
        try {
            return JSON.parse(readFile(this.configFile));
        } catch {
            const defualtFile = JSON.stringify(this.defualtFile, undefined, 4);
            writeFile(this.configFile, defualtFile);
            return defualtFile;
        }
    }
    getTreeItem(element: SwaggerTreeItem): SwaggerTreeItem | Thenable<SwaggerTreeItem> {
        return element;
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
    generate = async () => generate(this);
}

async function getSwaggerJson(item: SwaggerTreeItem) {
    let swaggerJson = {};
    if (item.swaggerConfig.swaggerPath.indexOf('http') === 0) {
        swaggerJson = await Axios.get(item.swaggerConfig.swaggerPath).then(res => res.data);
    } else {
        swaggerJson = JSON.parse(readFile(item.swaggerConfig.swaggerPath));
    }
    return swaggerJson;
}

export async function oldGenerate(item: SwaggerTreeItem) {
    const swaggerJson = getSwaggerJson(item);

    const body = { spec: swaggerJson } as any;
    if (item.swaggerConfig.clientLanguage === 'typescript-node') {
        body.options = {
            supportsES6: 'true',
        };
    }

    const linkToZip = await Axios.post(`https://generator.swagger.io/api/gen/clients/${item.swaggerConfig.clientLanguage}`, body)
        .then(x => x.data.link)
        .catch(err => {
            throw err;
        });
    const zipFileBinary = await Axios.get(linkToZip, { responseType: 'arraybuffer' }).then(x => x.data);
    const outputFolder = resolve(vscode.workspace.rootPath || '', item.swaggerConfig.outputFolder);
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
        // if (item.swaggerConfig.clientLanguage === 'typescript-node') {
        //     const fileToMove = getFolders(tmpFolder)[0] + '/api.ts';
        //     makeDirIfNotExist(outputFolder);
        //     renameSync(fileToMove, outputFolder + '/api.ts');
        //     rimraf.sync(tmpFolder);
        // } else {
        const folderToMove = getFolders(tmpFolder)[0];
        renameSync(folderToMove, outputFolder);
        rimraf.sync(tmpFolder);
        // }
    });
}

async function generate(item: SwaggerTreeItem) {
    const outputFolder = resolve(vscode.workspace.rootPath || '', item.swaggerConfig.outputFolder).replace(/\\/g, '\\');
    rimraf.sync(outputFolder);
    makeDirIfNotExist(outputFolder);
    const t = getTerminal();
    t.sendText('echo "please make sure you have docker in your computer and the docker have access to the output folder"');
    // const gene = `npx openapi-generator generate -i ${item.swaggerConfig.swaggerPath} -g ${item.swaggerConfig.clientLanguage} -o ${
    //     item.swaggerConfig.outputFolder
    // }`;
    const dockerCmd = `docker run --rm -v ${outputFolder}:/local openapitools/openapi-generator-cli generate -i ${
        item.swaggerConfig.swaggerPath
    } -g ${item.swaggerConfig.clientLanguage} -o /local`;

    t.sendText(dockerCmd);

    // t.sendText(`
    // echo "check you have java on your pc, if you dont please install it"
    // java -v
    // ${gene}
    // `);
}
