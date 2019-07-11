import { getTerminal } from './extension';

export function installMinikube() {
    const t = getTerminal();
    t.sendText(
        removeEmptyLines(`
    echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" >> /etc/apt/sources.list.d/kubernetes.list
    ${echoStep(2)}
    sh -c DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https curl -y  ebtables ethtool apt-transport-https
    ${echoStep(3)}
    sh -c curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - 
    ${echoStep(4)}
    sh -c DEBIAN_FRONTEND=noninteractive apt-get install -y kubectl
    ${echoStep(5)}
    sh -c curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x minikube
    ${echoStep(6)}
    install minikube /usr/local/bin
    minikube config set vm-driver none
    minikube start
    minikube addons enable ingress
    minikube addons enable dashboard
    minikube status
    kubectl config view --raw --flatten --minify
    `),
    );
}

export function installDocker() {
    const t = getTerminal();
    t.sendText(`wget -qO- https://get.docker.com/ | sh`);
}

export function echoStep(num: number) {
    return `echo ----------------------------- step ${num} ------------------------`;
}

export function upgradeUbuntu() {
    // const upgrade = `
    // DEBIAN_FRONTEND=noninteractive apt-get dist-upgrade -qy >> /var/log/apt/scripted-upgrades.log
    // echo ----------------------------- 2`;
    return `
    DEBIAN_FRONTEND=noninteractive apt-get update -qy  > /dev/null
    ${echoStep(1)}
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
