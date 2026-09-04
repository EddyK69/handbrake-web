Use the mqtt branch before building, so the images contain the code and 0.8.2 version from that branch. On macOS, initialize Podman's virtual machine once with `podman machine init`, then start it before building:

```bash
cd /path/to/handbrake-web
git switch mqtt
podman machine start
```

If you do not already have a local registry, start one on port 5000:
```bash

podman run -d \
  --name local-registry \
  --restart unless-stopped \
  -p 5000:5000 \
  docker.io/library/registry:2
```

Build both images from the repository root. The root context is required because the Dockerfiles copy files from client, shared, and the workspace root. This assumes `localhost:5000/handbrake-build:1.11.2` was built and pushed first.

```bash
registry="localhost:5000"
version="0.8.2"
handbrake_build_tag="1.11.2"

podman build \
  --pull=never \
  --build-arg HANDBRAKE_BUILD_TAG="${handbrake_build_tag}" \
  --tag "${registry}/handbrake-web-server:${version}" \
  --tag "${registry}/handbrake-web-server:latest" \
  --file server/Dockerfile \
  .

podman build \
  --pull=never \
  --build-arg HANDBRAKE_BUILD_TAG="${handbrake_build_tag}" \
  --tag "${registry}/handbrake-web-worker:${version}" \
  --tag "${registry}/handbrake-web-worker:latest" \
  --file worker/Dockerfile \
  .
```

Push them to the local registry. A registry created with `registry:2` has no TLS by default, so include `--tls-verify=false`:

```bash
registry="localhost:5000"
version="0.8.2"

podman push --tls-verify=false "${registry}/handbrake-web-server:${version}"
podman push --tls-verify=false "${registry}/handbrake-web-server:latest"
podman push --tls-verify=false "${registry}/handbrake-web-worker:${version}"
podman push --tls-verify=false "${registry}/handbrake-web-worker:latest"
```

Update `compose/compose.base.yaml` to reference your registry:

```yaml
services:
  handbrake-server:
    image: localhost:5000/handbrake-web-server:0.8.2

  handbrake-worker:
    image: localhost:5000/handbrake-web-worker:0.8.2
```

Then start it with your Compose-compatible Podman command:

```bash
podman compose -f compose/compose.base.yaml up -d
```

On another machine, do not use `localhost:5000`; that points to the other machine itself. Use the LAN address of the registry host instead, for example:

```yaml
image: 192.168.1.10:5000/handbrake-web-worker:0.8.2
```

For an HTTP-only registry on Linux worker machines, either configure that registry as insecure in `/etc/containers/registries.conf`:

```toml
[[registry]]
location = "192.168.1.10:5000"
insecure = true
```

or pull it explicitly using:

```bash
podman pull --tls-verify=false 192.168.1.10:5000/handbrake-web-worker:0.8.2
```

For a long-lived registry accessed by multiple hosts, TLS is the better final configuration; the `--tls-verify=false` approach is appropriate for a trusted home/LAN setup.
