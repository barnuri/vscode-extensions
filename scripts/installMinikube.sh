#!/bin/sh
set -e

command_exists() {
	command -v "$@" > /dev/null 2>&1
}

installFunc() {
	user="$(id -un 2>/dev/null || true)"

	sh_c='sh -c'
	if [ "$user" != 'root' ]; then
		if command_exists sudo; then
			sh_c='sudo -E sh -c'
		elif command_exists su; then
			sh_c='su -c'
		else
			cat >&2 <<-'EOF'
			Error: this installer needs the ability to run commands as root.
			We are unable to find either "sudo" or "su" available to make this happen.
			EOF
			exit 1
		fi
	fi


	$sh_c 'mkdir -p /etc/systemd/system/docker.service.d'
	$sh_c 'systemctl daemon-reload'
	$sh_c 'systemctl restart docker'

    $sh_c 'apt-get update -qq'
    $sh_c 'DEBIAN_FRONTEND=noninteractive apt-get upgrade -qq'
    $sh_c 'echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" > /etc/apt/sources.list.d/kubernetes.list'
    $sh_c 'DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https curl -y  ebtables ethtool apt-transport-https'
    $sh_c 'curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - '
    $sh_c 'apt-get update -qq'
    $sh_c 'apt-get install -y kubectl'
    $sh_c 'curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x minikube'
    $sh_c 'install minikube /usr/local/bin'
    $sh_c 'minikube config set vm-driver none'
	$sh_c 'swapoff -a && sed -i '/swap/d' /etc/fstab'
	$sh_c 'minikube start'
    $sh_c 'minikube addons enable ingress'
    $sh_c 'minikube addons enable dashboard'
    $sh_c 'minikube status'
    $sh_c 'kubectl config view --raw --flatten --minify'
}

installFunc
