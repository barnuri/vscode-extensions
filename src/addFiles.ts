import * as vscode from 'vscode';
import { writeFile } from './fileHelper';

export function getTextFromSnippet(snippetName: string, key: string) {
    const snippet = require(`../snippets/${snippetName}.json`);
    return snippet[key].body.join('\n');
}

export function dotnetCoreDockerfileBuilder() {
    writeFile('Dockerfile', getTextFromSnippet('dockerfile', 'dockerfile-dotnetcore'));
}

export function frontDockerfileBuilder() {
    writeFile('Dockerfile', getTextFromSnippet('dockerfile', 'dockerfile-front'));
}

export function nodejsDockerfileBuilder() {
    writeFile('Dockerfile', getTextFromSnippet('dockerfile', 'dockerfile-nodejs'));
}

export async function dockerfileBuilder() {
    const answer = await vscode.window.showQuickPick(['NodeJS', 'React/Anguler', '.Net Core']);
    switch (answer) {
        case 'NodeJS':
            nodejsDockerfileBuilder();
            break;
        case 'React/Anguler':
            frontDockerfileBuilder();
            break;
        case '.Net Core':
            dotnetCoreDockerfileBuilder();
            break;
    }
    writeFile('.dockerignore', getTextFromSnippet('ignore', 'dockerignore'));
}

export function jenkinsFileBuilder() {
    writeFile('Jenkinsfile', getTextFromSnippet('groovy', 'Jenkins File'));
}

export function k8sFileBuilder() {
    const k8sfile = getTextFromSnippet('k8s', 'k8s example').replace(/\\\$/g, '$');

    writeFile('k8s/integration.yaml', k8sfile);
    writeFile('k8s/qa.yaml', k8sfile);
}

export function pritterFile() {
    writeFile('.prettierrc.json', getTextFromSnippet('json', 'pritter setting'));
}
export function nodemonFile() {
    writeFile('nodemon.json', getTextFromSnippet('json', 'nodemon config'));
    writeFile('.vscode/launch.json', getTextFromSnippet('json', 'launch config'));
}
