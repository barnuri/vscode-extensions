import { getTerminal } from './extension';
import { writeFile } from './fileHelper';

export function installMinikube() {
    const script = `
    #!/bin/sh
    set -e
    sh -c echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" > /etc/apt/sources.list.d/kubernetes.list
    ${upgradeUbuntu()}
    sh -c DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https curl -y  ebtables ethtool apt-transport-https
    sh -c curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - 
    sh -c DEBIAN_FRONTEND=noninteractive apt-get install -y kubectl
    sh -c curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x minikube
    sh -c install minikube /usr/local/bin
    sh -c minikube config set vm-driver none
    sh -c minikube start
    sh -c mv /root/.kube /root/.minikube $HOME
    sh -c chown -R $USER $HOME/.kube $HOME/.minikube
    sh -c minikube addons enable ingress
    sh -c minikube addons enable dashboard
    sh -c minikube status
    sh -c kubectl config view --raw --flatten --minify
    `;

    writeFile('./minikubeInstall.sh', script);
    getTerminal().sendText('wget -qO- ./minikubeInstall.sh | sh');
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
