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

	$sh_c 'apt-get update '
	$sh_c 'apt-get install -y apt-transport-https curl -y  ebtables ethtool apt-transport-https'
	$sh_c 'curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - '
	$sh_c 'echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" >> /etc/apt/sources.list.d/kubernetes.list'
	$sh_c 'apt-get update'

	$sh_c 'apt-get install -y kubelet kubeadm kubectl'
	$sh_c 'apt-mark hold kubelet kubeadm kubectl'
	$sh_c 'systemctl enable kubelet.service'
	$sh_c 'systemctl start kubelet.service'
	$sh_c "swapoff -a && sed -i '/swap/d' /etc/fstab"
}

installFunc
