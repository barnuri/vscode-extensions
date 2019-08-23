import { getTerminal } from './extension';
import { writeFile, readFile, setFullPermission } from './fileHelper';

export function installScript(scriptName: string) {
    const script = readFile(`../scripts/${scriptName}`, false).replace(/\r/g, '');
    writeFile(`./${scriptName}`, script);
    setFullPermission(`./${scriptName}`);
    getTerminal().sendText(`./${scriptName}`);
}

export function echoStep(num: number) {
    return `echo ----------------------------- step ${num} ------------------------`;
}

export function upgradeUbuntu() {
    return `
    sh -c DEBIAN_FRONTEND=noninteractive apt-get update -qq > /dev/null
    sh -c DEBIAN_FRONTEND=noninteractive apt-get upgrade -qq
    `;
}

export function removeEmptyLines(s: string) {
    return s
        .replace(/^\s*[\r\n]/gm, '')
        .trim()
        .trimLeft()
        .trimRight()
        .trimLeft()
        .trim();
}
