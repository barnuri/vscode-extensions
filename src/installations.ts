import { getTerminal } from './extension';
import { writeFile, readFile, setFullPermission } from './fileHelper';

export function installMinikube() {
    const script = readFile(`../scripts/installMinikube.sh`, false);
    writeFile('./minikubeInstall.sh', script);
    setFullPermission('./minikubeInstall.sh');
    getTerminal().sendText('./minikubeInstall.sh');
}

export function installDocker() {
    const t = getTerminal();
    t.sendText(
        removeEmptyLines(`
    ${upgradeUbuntu()}
    wget -qO- https://get.docker.com/ | sh
    `),
    );
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
