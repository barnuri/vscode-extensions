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

	$sh_c 'kubeadm init --pod-network-cidr=10.244.0.0/16 --upload-certs --node-name master01'
	$sh_c 'mkdir -p $HOME/.kube '
	$sh_c 'cp -i /etc/kubernetes/admin.conf $HOME/.kube/config'
	$sh_c 'chown $(id -u):$(id -g) $HOME/.kube/config'

	$sh_c 'sysctl net.bridge.bridge-nf-call-iptables=1'
	$sh_c 'kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/62e44c867a2846fefb68bd5f178daf4da3095ccb/Documentation/kube-flannel.yml'
	$sh_c 'kubectl taint nodes --all node-role.kubernetes.io/master-'

	$sh_c 'snap install helm --classic'
	$sh_c 'helm init --wait'
	$sh_c 'helm repo update'
	$sh_c 'kubectl --namespace kube-system create serviceaccount tiller'
	$sh_c 'kubectl create clusterrolebinding tiller-cluster-rule --clusterrole=cluster-admin --serviceaccount=kube-system:tiller'
	$sh_c "kubectl --namespace kube-system patch deploy tiller-deploy -p '{\"spec\":{\"template\":{\"spec\":{\"serviceAccount\":\"tiller\"}}}}'"
	$sh_c 'helm install stable/nginx-ingress --name nginx-ingress '
}

installFunc
