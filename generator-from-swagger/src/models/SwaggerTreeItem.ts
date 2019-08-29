import { SwaggerConfig } from './SwaggerConfig';
import { generateFromApi } from '../generateFromApi';
import * as vscode from 'vscode';

export class SwaggerTreeItem extends vscode.TreeItem {
    swaggerConfig: SwaggerConfig;
    generate = async () => generateFromApi(this);
}
