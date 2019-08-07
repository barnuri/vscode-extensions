import * as vscode from 'vscode';
import { k8sFileBuilder, jenkinsFileBuilder, dockerfileBuilder, pritterFile, nodemonFile, dockerDevNodeJS, addColorsFile } from './addFiles';
import { installMinikube, installDocker } from './installations';
import { modifyPackageJson, getFilePaths, getFileExtension, writeFile } from './fileHelper';
import { renameSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { SwaggerExplorerProvider, SwaggerTreeItem } from './swaggerExplorerProvider';

export function activate(context: vscode.ExtensionContext) {
    const swaggerExplorerProvider = new SwaggerExplorerProvider();
    vscode.window.registerTreeDataProvider('swagger-explorer', swaggerExplorerProvider);
    vscode.commands.registerCommand('extension.refresh', () => swaggerExplorerProvider.refresh());
    vscode.commands.registerCommand('extension.generate', (item: SwaggerTreeItem) => item.generate());

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.textToString', () => {
            editSelectedTest(text =>
                text
                    .replace(/\n/g, '\\n')
                    .replace(/"/g, '\\"')
                    .replace(/'/g, "\\'")
                    .replace(/\\/g, '\\')
                    .replace(/\$/g, '\\\\$'),
            );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.stringToText', () => {
            editSelectedTest(text =>
                text
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'")
                    .replace(/\\\\\$/g, '$'),
            );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.textToStringArray', () => {
            editSelectedTest(
                text =>
                    '["' +
                    text
                        .replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"')
                        .replace(/'/g, "\\'")
                        .replace(/\$/g, '\\\\$')
                        .replace(/\\n/g, '!@#!@##@!!@##@!!@#@!@')
                        .split('\n')
                        .join(' " , "')
                        .replace(/!@#!@##@!!@##@!!@#@!@/g, '\\n') +
                    '"]',
            );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.stringArrayToText', () => {
            editSelectedTest(text => {
                const lines = JSON.parse(text) as string[];
                for (let index = 0; index < lines.length; index++) {
                    lines[index] = lines[index]
                        .replace(/\\"/g, '"')
                        .replace(/\\'/g, "'")
                        .replace(/\\\\\$/g, '$');
                }
                return lines.join('\n');
            });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addColorsFile', async () => {
            addColorsFile();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addK8s', async () => {
            k8sFileBuilder();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addJenkins', async () => {
            jenkinsFileBuilder();
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addDocker', async () => {
            dockerfileBuilder();
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addDockerK8sAndJenkins', async () => {
            dockerfileBuilder();
            k8sFileBuilder();
            jenkinsFileBuilder();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addPrettierFile', async () => {
            pritterFile();
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addNodemon', async () => {
            nodemonFile();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.updatePackageJson', async () => {
            const terminal = getTerminal();
            terminal.sendText('npx npm-check-updates -u');
            terminal.sendText('npm i');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.gitFirstInit', async () => {
            const terminal = getTerminal();
            const gitUrl =
                (await vscode.window.showInputBox({
                    prompt: 'Paste Git Repo Url',
                    placeHolder: 'git@github.com:repo',
                    value: '',
                })) || '';

            terminal.sendText('git init');
            terminal.sendText('git remote add origin ' + gitUrl);
            terminal.sendText('git add .');
            terminal.sendText('git commit -am "Init"');
            terminal.sendText('git push -u origin master');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.gitCleanCache', async () => {
            const terminal = getTerminal();
            terminal.sendText('git tag -d $(git tag -l)');
            terminal.sendText('git rm -r --cached .');
            terminal.sendText('git add .');
            terminal.sendText('git commit -am "git cache cleared"');
            terminal.sendText('git push');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.gitDeleteLocalTags', async () => {
            getTerminal().sendText('git tag -d $(git tag -l)');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.dockerStopAll', async () => {
            const terminal = getTerminal();
            terminal.sendText('docker stop $(docker ps -a -q)');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.dockerRemoveAll', async () => {
            const terminal = getTerminal();
            terminal.sendText('docker stop $(docker ps -a -q)');
            terminal.sendText('docker rm $(docker ps -a -q)');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.dockerDev', async () => {
            dockerDevNodeJS();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.installDocker', async () => {
            installDocker();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.installMinikube', async () => {
            installMinikube();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.exportK8sConfig', async () => {
            getTerminal().sendText('kubectl config view --raw --flatten --minify');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.typescriptAddRemoveUnusedImportsScript', async () => {
            writeFile(
                'tslint-imports.json',
                `
{
    "extends": ["tslint-etc"],
    "rules": {
        "no-unused-declaration": true
    }
}
            `,
            );
            modifyPackageJson(packagejson => {
                packagejson.scripts.removeUnusedImports = 'tslint --config tslint-imports.json --fix --project .';
                return packagejson;
            });

            getTerminal().sendText('npm i -D typescript tslint tslint-etc');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.convertToLF', async () => {
            editSelectedFile(text => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.convertToCRLF', async () => {
            editSelectedFile(text => text.replace(/\r/g, '').replace(/\n/g, '\r\n'));
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.convertToCR', async () => {
            editSelectedFile(text => text.replace(/\r\n/g, '\r').replace(/\n/g, '\r'));
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.convertAllFilesToLF', async () => {
            for (const file of getFilePaths(vscode.workspace.rootPath || '')) {
                writeFileSync(
                    file,
                    readFileSync(file, { encoding: 'utf8' })
                        .replace(/\r\n/g, '\n')
                        .replace(/\r/g, '\n'),
                    { encoding: 'utf8' },
                );
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.convertAllFilesToCRLF', async () => {
            for (const file of getFilePaths(vscode.workspace.rootPath || '')) {
                writeFileSync(
                    file,
                    readFileSync(file, { encoding: 'utf8' })
                        .replace(/\r/g, '')
                        .replace(/\n/g, '\r\n'),
                    { encoding: 'utf8' },
                );
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.convertAllFilesToCR', async () => {
            for (const file of getFilePaths(vscode.workspace.rootPath || '')) {
                writeFileSync(
                    file,
                    readFileSync(file, { encoding: 'utf8' })
                        .replace(/\r\n/g, '\r')
                        .replace(/\n/g, '\r'),
                    { encoding: 'utf8' },
                );
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.convertFilesTypes', async () => {
            const fromType =
                (await vscode.window.showInputBox({
                    prompt: 'From Type',
                    placeHolder: 'js',
                    value: '',
                })) || '';

            const toType =
                (await vscode.window.showInputBox({
                    prompt: 'To Type',
                    placeHolder: 'ts',
                    value: '',
                })) || '';

            if (!toType || !fromType) {
                return;
            }

            const files = getFilePaths(vscode.workspace.rootPath || '').filter(x => getFileExtension(x).toLowerCase() === fromType.toLowerCase());
            for (const file of files) {
                const newName = file.substring(0, file.length - getFileExtension(file).length - 1) + '.' + toType;
                renameSync(file, newName);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.nameTemplateForFileType', async () => {
            const fileType =
                (await vscode.window.showInputBox({
                    prompt: 'Type',
                    placeHolder: 'jpeg',
                    value: '',
                })) || '';
            if (!fileType) {
                return;
            }
            const template =
                (await vscode.window.showInputBox({
                    prompt: 'Name Template',
                    placeHolder: `nyc_trip_{index}.${fileType} => nyc_trip_${0}.${fileType}, nyc_trip_${1}.${fileType}, ...`,
                    value: '',
                })) || '';

            if (!template) {
                return;
            }

            const files = getFilePaths(vscode.workspace.rootPath || '').filter(x => getFileExtension(x).toLowerCase() === fileType.toLowerCase());
            let i = 1;
            for (const file of files) {
                const dir = dirname(file);
                const newFileName = template.replace(/{index}/g, i.toString()) + '.' + fileType;
                renameSync(file, `${dir}/${newFileName}`);
                i++;
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addNewCommand', async () => {
            const commandName =
                (await vscode.window.showInputBox({
                    prompt: 'Command Name',
                    placeHolder: 'myNewCommand',
                    value: '',
                })) || 'myNewCommand';

            const commandDisplay = commandName
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
                .replace(/^./, str => str.toUpperCase());

            modifyPackageJson(packagejson => {
                packagejson.activationEvents.push(`onCommand:extension.${commandName}`);
                packagejson.contributes.commands.push({
                    command: `extension.${commandName}`,
                    title: `${packagejson.displayName}: ${commandDisplay}`,
                });
                return packagejson;
            });
        }),
    );
}

function editSelectedFile(modifyFunc: (text: string) => string) {
    if (!vscode.window.activeTextEditor) {
        return;
    }
    const editor: vscode.TextEditor = vscode.window.activeTextEditor;

    editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, modifyFunc(editor.document.getText()));
    });
}

function editSelectedTest(modifyFunc: (text: string) => string) {
    if (!vscode.window.activeTextEditor) {
        return;
    }
    const editor: vscode.TextEditor = vscode.window.activeTextEditor;

    editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, modifyFunc(editor.document.getText(editor.selection)));
    });
}

export function getTerminal() {
    const terminal = vscode.window.createTerminal(`Terminal`);
    terminal.show(true);
    return terminal;
}

// this method is called when your extension is deactivated
export function deactivate() {}
