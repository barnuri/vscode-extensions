import * as vscode from 'vscode';
import { writeFile, readFile, makeDirIfNotExist, getFolders, getWorkspacePath } from './fileHelper';
import { appendFileSync, renameSync, existsSync } from 'fs';
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
            try {
                const current = JSON.stringify(this.readConfig());
                if (prev !== current) {
                    this.refresh();
                }
            } catch {}
        }, 500);
    }
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    public configFile = './.vscode/generator-from-swagger.json';
    defualtFile: SwaggerConfig[] = [
        {
            name: 'temp',
            swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
            outputFolder: './generatedClientFromSwagger',
            clientLanguage: 'typescript-axios',
            options: {
                supportsES6: true,
            },
        },
    ];
    readConfig = () => {
        try {
            return JSON.parse(readFile(this.configFile));
        } catch {
            return [];
        }
    };
    createConfig() {
        try {
            if (existsSync(resolve(getWorkspacePath() + '/' + this.configFile))) {
                return;
            }
            const defualtFile = JSON.stringify(this.defualtFile, undefined, 4);
            writeFile(this.configFile, defualtFile);
            this.openConfigFile();
        } catch {}
    }
    async openConfigFile() {
        const config = resolve(getWorkspacePath(), this.configFile);
        const res = await vscode.workspace.openTextDocument(config);
        await vscode.window.showTextDocument(res, { preview: false });
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
    options!: any;
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

async function generate(item: SwaggerTreeItem) {
    generateFromApi(item);
}

export async function generateFromApi(item: SwaggerTreeItem) {
    const swaggerJson = await getSwaggerJson(item);

    const body = { spec: swaggerJson } as any;
    if (item.swaggerConfig.clientLanguage.indexOf('typescript') >= 0 || item.swaggerConfig.clientLanguage.indexOf('javascript')) {
        body.options = {
            supportsES6: true,
            ...item.swaggerConfig.options,
        };
    }
    // https://generator.swagger.io/api/gen/clients
    const linkToZip = await Axios.post(`http://api.openapi-generator.tech/api/gen/clients/${item.swaggerConfig.clientLanguage}`, body)
        .then(x => x.data.link)
        .catch(err => {
            throw err;
        });
    const zipFileBinary = await Axios.get(linkToZip, { responseType: 'arraybuffer' }).then(x => x.data);
    const outputFolder = resolve(getWorkspacePath(), item.swaggerConfig.outputFolder);
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

export async function generateWithDocker(item: SwaggerTreeItem) {
    const outputFolder = resolve(getWorkspacePath(), item.swaggerConfig.outputFolder).replace(/\\/g, '\\');
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
