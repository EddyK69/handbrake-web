For your own local registry, build it yourself from this fork and tag/push it under your own registry name:
```
Set-Location C:\Git\Test\handbrake-web

$registry = "localhost:5000"
$handbrakeVersion = "1.11.2"

podman build `
  --pull-always `
  --tag "$registry/handbrake-build:$handbrakeVersion" `
  --tag "$registry/handbrake-build:latest" `
  --file handbrake/build.Dockerfile `
  .

podman push --tls-verify=false "$registry/handbrake-build:$handbrakeVersion"
podman push --tls-verify=false "$registry/handbrake-build:latest"
```
