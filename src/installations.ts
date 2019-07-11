import { getTerminal } from './extension';
import { Terminal } from 'vscode';

export function installMinikube() {
    const t = getTerminal();
    upgradeUbuntu(t);
    t.sendText(`
    echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" >> /etc/apt/sources.list.d/kubernetes.list;
    DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https curl -y  ebtables ethtool apt-transport-https;
    curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - ;
    DEBIAN_FRONTEND=noninteractive apt-get install -y kubectl;
    curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x minikube;
    install minikube /usr/local/bin;
    minikube config set vm-driver none;
    minikube start;
    minikube addons enable ingress;
    minikube addons enable dashboard;
    minikube status;
    kubectl config view --raw --flatten --minify;
    `);
}

export function installDocker() {
    const t = getTerminal();
    upgradeUbuntu(t);
    t.sendText(`
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable";
    DEBIAN_FRONTEND=noninteractive apt-get install apt-transport-https ca-certificates curl software-properties-common -y;
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -;
    DEBIAN_FRONTEND=noninteractive apt-get install docker-ce -y;
    docker -v';
    `);
}

export function upgradeUbuntu(t: Terminal) {
    t.sendText(`
DEBIAN_FRONTEND=noninteractive apt-get update -y --force-yes;
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y --force-yes;
    `);
}
