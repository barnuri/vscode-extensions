import * as vscode from 'vscode';
import { writeFile } from './fileHelper';

export function dotnetCoreDockerfileBuilder() {
    const snippet = require('../snippets/dockerfile.json');
    writeFile('Dockerfile', snippet['dockerfile-dotnetcore'].body[0]);
}

export function frontDockerfileBuilder() {
    const snippet = require('../snippets/dockerfile.json');
    writeFile('Dockerfile', snippet['dockerfile-front'].body[0]);
}

export function nodejsDockerfileBuilder() {
    const snippet = require('../snippets/dockerfile.json');
    writeFile('Dockerfile', snippet['dockerfile-nodejs'].body[0]);
}

export async function dockerfileBuilder() {
    const answer = await vscode.window.showQuickPick(['NodeJS', 'React/Anguler', '.Net Core']);
    switch (answer) {
        case 'NodeJS':
            nodejsDockerfileBuilder();
        case 'React/Anguler':
            frontDockerfileBuilder();
        case '.Net Core':
            dotnetCoreDockerfileBuilder();
    }
    const snippet = require('../snippets/ignore.json');
    writeFile('.dockerignore', snippet['dockerignore'].body[0]);
}

export function jenkinsFileBuilder() {
    const snippet = require('../snippets/groovy.json');
    writeFile('Jenkinsfile', snippet['jenkinsfile'].body[0]);
}

export function k8sFileBuilder() {
    const snippet = require('../snippets/k8s.json');
    const k8sfile = snippet['k8s example'].body[0].replace(/\\\$/g, '$');

    writeFile('k8s/integration.yaml', k8sfile);
    writeFile('k8s/qa.yaml', k8sfile);
}

export function pritterFile() {
    const snippet = require('../snippets/json.json');
    writeFile('.prettierrc.json', snippet['pritter setting'].body[0]);
}
export function nodemonFile() {
    const snippet = require('../snippets/json.json');
    writeFile('nodemon.json', snippet['nodemon config'].body[0]);
    writeFile('.vscode/launch.json', snippet['launch config'].body[0]);
}
