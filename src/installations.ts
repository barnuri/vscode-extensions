import { getTerminal } from './extension';

export function installMinikube() {
    const t = getTerminal();
    t.sendText('apt-get update -y');
    t.sendText('apt-get upgrade -y');
    t.sendText('apt-get install -y apt-transport-https curl -y  ebtables ethtool apt-transport-https');
    t.sendText('curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - ');
    t.sendText('echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" >> /etc/apt/sources.list.d/kubernetes.list');
    t.sendText('apt-get update');
    t.sendText('apt-get install -y kubectl');
    t.sendText('curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x minikube');
    t.sendText('install minikube /usr/local/bin');
    t.sendText('minikube config set vm-driver none');
    t.sendText('minikube start');
    t.sendText('minikube addons enable ingress');
    t.sendText('minikube addons enable dashboard');
    t.sendText('minikube status');
    t.sendText('kubectl config view --raw --flatten --minify');
}

export function installDocker() {
    const t = getTerminal();
    t.sendText('apt-get update -y');
    t.sendText('apt-get upgrade -y');
    t.sendText('apt-get install apt-transport-https ca-certificates curl software-properties-common -y');
    t.sendText('curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -');
    t.sendText('add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"');
    t.sendText('apt-get update');
    t.sendText('apt-get install docker-ce -y');
    t.sendText('docker -v # check');
}
