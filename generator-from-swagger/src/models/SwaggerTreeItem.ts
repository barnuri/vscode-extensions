import { SwaggerConfig } from './SwaggerConfig';
import { generateFromApi } from '../generateFromApi';
import { generateFromMyLib } from '../generateFromMyLib';
import * as vscode from 'vscode';

export class SwaggerTreeItem extends vscode.TreeItem {
    swaggerConfig: SwaggerConfig;
    generate = () =>
        !this.swaggerConfig.generator || this.swaggerConfig.generator === 'openapi-definition-to-editor'
            ? generateFromMyLib(this)
            : generateFromApi(this)
}
