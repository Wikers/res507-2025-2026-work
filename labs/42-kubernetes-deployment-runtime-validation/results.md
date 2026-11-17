# Lab 42 – Results (re-verified on the new VM, 2026-11-17)

I recreated the VM, so I reinstalled k3s and redeployed `deployment.yaml` + `service.yaml`
in namespace `quote-lab` (image imported into k3s with `k3s ctr images import`).

## Deployment

```
$ kubectl get deployments,pods,services
deployment.apps/quote-app   3/3     3            3           15s
pod/quote-app-65977ccdfc-cqnwx   1/1     Running   0          15s
pod/quote-app-65977ccdfc-r8t72   1/1     Running   0          15s
pod/quote-app-65977ccdfc-w5w2l   1/1     Running   0          15s
service/quote-app   ClusterIP   10.43.88.17   <none>        80/TCP    15s
```

## Health paths

Through port-forward (`kubectl port-forward svc/quote-app 8080:80`):

```
$ curl -s http://127.0.0.1:8080/health
{"ok":true}
```

From inside the cluster, through the Service:

```
$ kubectl run net-check --rm -i --restart=Never --image=public.ecr.aws/docker/library/busybox:latest -- wget -qO- http://quote-app/health
{"ok":true}
```

## Pod replacement

Deleted `quote-app-65977ccdfc-cqnwx`; the Deployment created `quote-app-65977ccdfc-59vk9` and went back to 3/3 Ready.

```
quote-app-65977ccdfc-59vk9   1/1     Running   0          9s
quote-app-65977ccdfc-r8t72   1/1     Running   0          7m24s
quote-app-65977ccdfc-w5w2l   1/1     Running   0          7m24s
```

## Readiness failure / recovery

Pending: not re-run on the new VM yet.
