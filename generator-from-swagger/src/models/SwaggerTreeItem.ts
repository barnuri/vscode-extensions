import { existsSync } from 'fs';
import { SwaggerConfig } from './SwaggerConfig';
import { generateFromApi } from '../generateFromApi';
import { generateFromMyLib } from '../generateFromMyLib';
import * as vscode from 'vscode';
import { join } from 'path';
import { getWorkspacePath, getFilePaths } from '../fileHelper';
import { ViewColumn } from 'vscode';

export class SwaggerTreeItem extends vscode.TreeItem {
    swaggerConfig!: SwaggerConfig;
    generate = async () => {
        try {
            vscode.window.showInformationMessage('SwaggerGenerator: start generate');
            const generateMethod =
                !this.swaggerConfig.generator || this.swaggerConfig.generator === 'openapi-definition-to-editor'
                    ? generateFromMyLib
                    : generateFromApi;
            await generateMethod(this);
            const outputFolder = join(getWorkspacePath(), this.swaggerConfig.outputFolder);
            const files = getFilePaths(outputFolder);
            if (files.length <= 0) {
                return;
            }
            let tsMainFile = join(outputFolder, 'index.ts');
            let csMainFile = join(outputFolder, 'Client.cs');
            let filePath;
            if (existsSync(tsMainFile)) {
                filePath = tsMainFile;
            } else if (existsSync(csMainFile)) {
                filePath = csMainFile;
            } else {
                filePath = files[0];
            }
            const res = await vscode.workspace.openTextDocument(filePath);
            vscode.window.showTextDocument(res, { preview: false });
            vscode.commands.executeCommand('workbench.explorer.fileView.focus');
            vscode.window.showInformationMessage('SwaggerGenerator: successfully generate');
        } catch (err) {
            vscode.window.showErrorMessage(`${err}`);
        }
    };
}
