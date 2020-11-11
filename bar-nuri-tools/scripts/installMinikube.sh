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


	$sh_c 'echo { \"insecure-registries\": [\"registry.server.com:8082\"], \"exec-opts\": [\"native.cgroupdriver=systemd\"], \"log-driver\": \"json-file\", \"log-opts\": { \"max-size\": \"100m\" }, \"storage-driver\": \"overlay2\" } > /etc/docker/daemon.json'

	$sh_c 'mkdir -p /etc/systemd/system/docker.service.d'
	$sh_c 'systemctl daemon-reload'
	$sh_c 'systemctl restart docker'

	$sh_c 'rm -rf  /usr/local/bin/kubectl'
	$sh_c 'curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl'
	$sh_c 'chmod +x ./kubectl'
 	$sh_c 'mv ./kubectl /usr/local/bin/kubectl'

    $sh_c 'curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x minikube'
    $sh_c 'install minikube /usr/local/bin'

    $sh_c 'CHANGE_MINIKUBE_NONE_USER=true minikube config set vm-driver none'
	$sh_c "swapoff -a && sed -i '/swap/d' /etc/fstab"

	$sh_c 'minikube start --extra-config=kubelet.cgroup-driver=systemd'
    $sh_c 'minikube addons enable ingress'
    $sh_c 'minikube addons enable dashboard'
    $sh_c 'minikube status'
    $sh_c 'kubectl config view --raw --flatten --minify'

}

installFunc

minikube addons enable ingress
minikube addons enable dashboard
minikube status
kubectl config view --raw --flatten --minify
