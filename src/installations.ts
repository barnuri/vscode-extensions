import { getTerminal } from './extension';
import { Terminal } from 'vscode';

export function installMinikube() {
    const t = getTerminal();
    t.sendText(
        removeEmptyLines(`${upgradeUbuntu()}
    echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" >> /etc/apt/sources.list.d/kubernetes.list
    ${echoStep(2)}
    DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https curl -y  ebtables ethtool apt-transport-https
    ${echoStep(3)}
    curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - 
    ${echoStep(4)}
    DEBIAN_FRONTEND=noninteractive apt-get install -y kubectl
    ${echoStep(5)}
    curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x minikube
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
    t.sendText(
        removeEmptyLines(
            `${upgradeUbuntu()}
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    ${echoStep(2)}
    DEBIAN_FRONTEND=noninteractive apt-get install apt-transport-https ca-certificates curl software-properties-common -qy
    ${echoStep(3)}
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    ${echoStep(4)}
    DEBIAN_FRONTEND=noninteractive apt-get install docker-ce -qy
    ${echoStep(5)}
    docker -v'
    `,
        ).replace(/\n/g, '&&'),
    );
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
