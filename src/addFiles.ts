import * as vscode from 'vscode';
import { writeFile, modifyPackageJson } from './fileHelper';
import { getTerminal } from './extension';

export function getTextFromSnippet(snippetName: string, key: string) {
    const snippet = require(`../snippets/${snippetName}.json`);
    const text = snippet[key].body.join('\n').replace(/\\\$/g, '$');
    return text;
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

export function addColorsFile() {
    writeFile('src/helpers/colors.ts', getTextFromSnippet('typescript', 'colorsfile'));
    getTerminal().sendText('npm i colors');
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
    modifyPackageJson(packagejson => {
        packagejson.scripts.format = 'prettier --write "src/**/*.{js,jsx,ts,tsx}"';
        return packagejson;
    });
    const terminal = getTerminal();
    terminal.sendText('npm i -D prettier');
}
export function nodemonFile() {
    writeFile('nodemon.json', getTextFromSnippet('json', 'nodemon config'));
    writeFile('.vscode/launch.json', getTextFromSnippet('json', 'launch config'));
    modifyPackageJson(packagejson => {
        packagejson.scripts.start = 'nodemon';
        return packagejson;
    });
}

export function dockerDevNodeJS() {
    writeFile(
        'docker-compose-dev.yml',
        `
version: '3.7'
 
services:
    react-app:
        build:
            context: .
            dockerfile: Dockerfile-dev
        volumes:
            - '.:/app'
            - '/app/node_modules'
        ports:
            - '3000:3000'
        environment:
            - NODE_ENV=development
            - CHOKIDAR_USEPOLLING=true
    `,
    );

    writeFile(
        'Dockerfile-dev',
        `
FROM node
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json .
COPY package-lock.json .
RUN npm i
CMD ["npm", "start"]
    `,
    );

    modifyPackageJson(packagejson => {
        packagejson.scripts['docker:dev'] = 'docker-compose -f docker-compose-dev.yml up -d';
        return packagejson;
    });
}
