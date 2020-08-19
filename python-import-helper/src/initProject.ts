import * as fs from 'fs-extra';
import * as path from 'path';
import { ExtensionContext, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { initializePlugin } from './plugins';
import { showProjectExportsCachedMessage } from './utils';
import { finalizeExtensionActivation } from './extension';

const configFile = 'PythonImportHelper-py.js';

type IncludePathQuickPickItem = {
    label: string;
    pathStr: string;
};

export async function initProject(context: ExtensionContext) {
    const { workspaceFolders } = workspace;

    if (!workspaceFolders) {
        window.showErrorMessage('You must add a workspace folder before initializing a PythonImportHelper configuration file.');
        return;
    }

    return initProjectSingleRoot(context, workspaceFolders);
}

async function initProjectSingleRoot(context: ExtensionContext, workspaceFolders: WorkspaceFolder[]) {
    const configFilepath = path.join(workspaceFolders[0].uri.fsPath, configFile);
    const openPromise = openExistingConfigFile(configFilepath);
    if (openPromise) return openPromise;

    // Select includePaths
    const subdirs = await getSubdirs(workspaceFolders[0].uri.fsPath);
    const includePathOptions: IncludePathQuickPickItem[] = subdirs.map(s => ({
        label: s,
        pathStr: `path.join(__dirname, '${s}')`,
    }));
    const includePaths = await getIncludePathSelections(includePathOptions);
    if (!includePaths) return;

    const text = buildText("const path = require('path')\n\n", buildIncludePathText(includePaths));
    await createAndOpenFile(context, configFilepath, text, !!includePaths.length);
}

function openExistingConfigFile(configFilepath: string) {
    if (pathExists(configFilepath)) {
        window.showInformationMessage('PythonImportHelper configuration file already exists.');
        return window.showTextDocument(Uri.file(configFilepath));
    }
    return;
}

function getIncludePathSelections(includePathOptions: IncludePathQuickPickItem[]) {
    return window.showQuickPick(
        includePathOptions.filter(f => !f.label.startsWith('.')),
        {
            canPickMany: true,
            placeHolder: 'Which paths contain your source files? Leave empty to enter manually.',
        },
    );
}

function buildIncludePathText(includePaths: IncludePathQuickPickItem[]) {
    return includePaths.length ? `\n    ${includePaths.map(i => i.pathStr).join(',\n    ')},\n  ` : '';
}

function buildText(text: string, includePathText: string) {
    return `/* eslint-disable */
${text}/**
 * Configuration file for VS Code PythonImportHelper extension.
 * https://github.com/ericbiewener/vscode-PythonImportHelper#configuration
 */

module.exports = {
  // This is the only required property. At least one path must be included.
  includePaths: [${includePathText}],
}
`;
}

async function getSubdirs(dir: string) {
    const items = await fs.readdir(dir);
    const statPromises = items.map(async item => {
        const filepath = path.join(dir, item);
        const stats = await fs.stat(filepath);
        return { item, stats };
    });
    const results = await Promise.all(statPromises);
    return results.filter(result => result.stats.isDirectory()).map(result => result.item);
}

function pathExists(testPath: string) {
    try {
        fs.accessSync(testPath);
        return true;
    } catch (e) {
        return false;
    }
}

async function createAndOpenFile(context: ExtensionContext, filepath: string, text: string, hasIncludePaths: boolean) {
    await fs.writeFile(filepath, text);
    await window.showTextDocument(Uri.file(filepath));

    if (hasIncludePaths) {
        await initializePlugin(context);
        finalizeExtensionActivation(context);
        showProjectExportsCachedMessage();
    }
}
