import { getTerminal } from './extension';
import { writeFile, readFile, setFullPermission } from './fileHelper';

export function installMinikube() {
    const script = readFile(`../scripts/installMinikube.sh`, false).replace(/\r/g, '');
    writeFile('./installMinikube.sh', script);
    setFullPermission('./installMinikube.sh');
    getTerminal().sendText('sudo ./installMinikube.sh');
}

export function installDocker() {
    const script = readFile(`../scripts/installDocker.sh`, false).replace(/\r/g, '');
    writeFile('./installDocker.sh', script);
    setFullPermission('./installDocker.sh');
    getTerminal().sendText('sudo ./installDocker.sh');
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
