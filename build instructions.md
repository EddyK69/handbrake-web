For your own local registry, build this image from your fork and tag/push it under your registry name. On macOS, initialize Podman's virtual machine once with `podman machine init`, then start it before building:

```bash
cd /path/to/handbrake-web

podman machine start

registry="localhost:5000"
handbrake_version="1.11.2"

podman build \
  --pull-always \
  --tag "${registry}/handbrake-build:${handbrake_version}" \
  --tag "${registry}/handbrake-build:latest" \
  --file handbrake/build.Dockerfile \
  .

podman push --tls-verify=false "${registry}/handbrake-build:${handbrake_version}"
podman push --tls-verify=false "${registry}/handbrake-build:latest"
```
