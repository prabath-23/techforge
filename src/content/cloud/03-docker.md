---
title: Docker in Practice
summary: Docker's architecture (client, daemon, containerd, runc, registries), the image/container lifecycle and essential CLI, every Dockerfile instruction, BuildKit and caching, multi-platform builds, volumes and bind mounts, networking and DNS, Docker Compose with a full multi-service example, debugging, resource limits, security hardening and production practices.
---

::widget Scene {"title": "From Dockerfile to running container", "sub": "build, cache, push, pull, run, and why layer order matters", "nodes": [{"id": "df", "kind": "doc", "label": "Dockerfile", "x": 3.72, "y": 3.72}, {"id": "bld", "kind": "cpu", "label": "docker build", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "img", "kind": "blocks", "label": "Image", "x": 11.72, "y": -4.28, "count": 4, "color": "purple"}, {"id": "reg", "kind": "cloud", "label": "Registry", "x": 12.0, "y": -12.0, "color": "orange"}, {"id": "srv", "kind": "server", "label": "Server", "x": 19.72, "y": -12.28, "color": "green"}, {"id": "vol", "kind": "disk", "label": "Volume", "x": 24.68, "y": -7.32, "color": "teal"}], "links": [["df", "bld"], ["bld", "img"], ["img", "reg"], ["reg", "srv"], ["srv", "vol", {"dashed": true}]], "metrics": [["line", "Instruction"], ["cache", "Cache"], ["size", "Image size"]], "steps": [{"short": "FROM", "tag": "Build", "title": "FROM node:20-slim", "body": "<p>Start from a small official base image.</p>", "show": ["df", "bld"], "flow": [["df", "bld", "#3b82f6", "FROM"]], "metrics": {"line": ["FROM"], "cache": ["pulled"], "size": ["~70 MB"]}}, {"short": "Deps", "tag": "Build", "title": "COPY package*.json, then RUN npm ci", "body": "<p>Dependencies are installed in their own layer, before the source code.</p>", "metrics": {"line": ["COPY + RUN npm ci"], "cache": ["new layer"], "size": ["+40 MB"]}}, {"short": "Code", "tag": "Build", "title": "COPY . . and set CMD", "body": "<p>Your code changes often, so it goes last.</p>", "show": ["df", "bld", "img"], "flow": [["bld", "img", "#a855f7", "layers"]], "metrics": {"line": ["COPY . ."], "size": ["+2 MB"]}}, {"short": "Rebuild", "tag": "Cache", "title": "Change one source file and rebuild", "body": "<p>Layers before the change are reused from cache. npm ci doesn't rerun: a 2-second build instead of 2 minutes.</p>", "set": {"img": {"badge": "3 cached, 1 rebuilt"}}, "metrics": {"cache": ["hits until COPY . .", "good"]}}, {"short": "Wrong", "tag": "Pitfall", "title": "If you COPY . . before npm ci…", "body": "<p>Any code change invalidates the dependency layer and everything after it. Order from least to most frequently changing.</p>", "metrics": {"cache": ["miss every build", "bad"]}}, {"short": "Multi", "tag": "Size", "title": "Multi-stage builds: compile in one stage, copy only the output", "body": "<p>No compilers or dev dependencies in the final image: smaller and fewer vulnerabilities.</p>", "set": {"img": {"badge": "runtime only"}}, "metrics": {"size": ["~110 MB → 60 MB", "good"]}}, {"short": "Push", "tag": "Ship", "title": "Tag and push to a registry", "body": "<p>Tag with the git commit (api:3f9c2a1), not just \"latest\", so you know exactly what runs.</p>", "show": ["df", "bld", "img", "reg"], "flow": [["img", "reg", "#f59e0b", "push api:3f9c2a1"]]}, {"short": "Pull", "tag": "Run", "title": "The server pulls only missing layers", "body": "<p>Shared base layers are already there.</p>", "show": ["df", "bld", "img", "reg", "srv"], "flow": [["reg", "srv", "#22c55e", "pull"]]}, {"short": "Run", "tag": "Run", "title": "docker run -p 8080:3000 -e DB_URL=… api:3f9c2a1", "body": "<p>Port mapping, config through environment variables, a non-root user.</p>", "set": {"srv": {"badge": "running"}}}, {"short": "Data", "tag": "Data", "title": "Mount a volume for data that must survive", "body": "<p>Containers are disposable; volumes aren't.</p>", "show": ["df", "bld", "img", "reg", "srv", "vol"], "flow": [["srv", "vol", "#14b8a6", "writes"]], "note": {"kind": "key", "text": "Order Dockerfile steps by change frequency, use multi-stage builds, tag with commit SHAs, keep state in volumes."}}]}

> [!NOTE] The previous chapter explained what a container *is* at the kernel level (namespaces, cgroups, overlayfs). This chapter is the hands-on tool that made containers mainstream: **Docker**.

> [!STORY] A new developer joins your team. The old onboarding doc is twelve pages: install Postgres 16 (not 15!), Redis, the right Node version, set six environment variables, run three migration scripts… It takes two days, and something always differs from everyone else's setup. With Docker, onboarding becomes: install Docker, clone the repo, run `docker compose up`. Five minutes later, the app, its database and its cache are running exactly as they do for everyone else. That experience is why Docker took over the industry within a few years of its 2013 launch.

> [!ANALOGY] A **Dockerfile** is a recipe. An **image** is a frozen, packaged meal made from that recipe, identical every time. A **container** is one serving of that meal, heated up and being eaten. You can heat up many servings from the same packaged meal, and throwing one away doesn't affect the others.

## Why Docker mattered


Containers existed before Docker (FreeBSD jails, Solaris zones, LXC). Docker (2013) made them **usable**: a simple CLI, a portable **image format** a **build file** anyone can read, and a public **registry** to share images. "It works on my machine" became "ship the machine". The same artifact runs on a laptop, in CI, and in production.

## Architecture

::widget Stepper {"type":"flow","cols":3,"title":"What happens on `docker run -p 8080:80 nginx`","nodes":[["docker CLI","Parses your command and calls the Docker Engine REST API over a UNIX socket (/var/run/docker.sock) or TCP."],["dockerd (Docker daemon)","Manages images, containers, networks and volumes. Checks if nginx:latest exists locally; if not, pulls it."],["Registry (Docker Hub)","Serves the image manifest (list of layer digests + config) and layer blobs. Layers already present locally are skipped."],["containerd","High-level runtime: stores image layers as snapshots (overlayfs), creates the container bundle, supervises it via a shim process."],["runc","Low-level OCI runtime: creates namespaces and cgroups, sets up the root filesystem, applies seccomp/capabilities, execs nginx as PID 1, then exits."],["Networking","dockerd creates a veth pair onto the docker0 bridge, assigns an IP, and adds iptables DNAT so host port 8080 forwards to container port 80."]]}

On macOS and Windows, **Docker Desktop** runs a small Linux VM (containers need a Linux kernel) and forwards ports and files into it, which is why bind-mount file I/O is slower there.

Alternatives with the same image format: **Podman** (daemonless, rootless by default, CLI-compatible), **nerdctl** (containerd CLI), **Buildah** **Colima**/**OrbStack** on Mac.

## Images, tags and digests

- An image reference is `[registry/][namespace/]name[:tag][@digest]`, e.g. `ghcr.io/acme/api:1.4.2` or `nginx@sha256:9f3a…`.
- **Tags are mutable pointers** (`latest` just means "whatever was pushed last without a tag"). **Digests are immutable** content hashes, pin by digest for reproducible production deploys.
- **Multi-architecture images**: one tag points to a **manifest list** with variants for `linux/amd64`, `linux/arm64`, etc.; Docker pulls the one matching your CPU.

## The essential CLI

```bash
# images
docker pull postgres:16
docker images                                  # list local images
docker build -t acme/api:dev .                 # build from ./Dockerfile
docker tag acme/api:dev ghcr.io/acme/api:1.4.2
docker push ghcr.io/acme/api:1.4.2
docker image history acme/api:dev              # layers and their sizes
docker rmi acme/api:dev && docker image prune  # remove / clean dangling images

# containers
docker run -d --name db -e POSTGRES_PASSWORD=dev -p 5432:5432 -v pgdata:/var/lib/postgresql/data postgres:16
docker run --rm -it alpine sh                  # throwaway interactive container
docker ps -a                                   # running (and stopped) containers
docker logs -f --tail 100 db                   # follow logs (stdout/stderr)
docker exec -it db psql -U postgres            # run a command inside a running container
docker stop db && docker start db              # SIGTERM, then SIGKILL after 10 s
docker inspect db                              # full JSON config: IP, mounts, env, health
docker stats                                   # live CPU/memory/net/IO per container
docker cp db:/etc/hosts ./hosts                # copy files in/out
docker rm -f db
docker system df && docker system prune -a     # disk usage / reclaim space (careful!)
```

Key `docker run` flags: `-d` detached, `-it` interactive TTY, `--rm` delete on exit, `-p host:container` publish ports, `-e`/`--env-file` environment, `-v`/`--mount` storage, `--network`, `--restart unless-stopped`, `--memory 512m --cpus 1.5`, `--user 1000:1000`, `--read-only`, `--cap-drop ALL`, `--health-cmd`.

## The container lifecycle

`created → running → (paused) → stopped (exited) → removed`. A container lives as long as its **main process** (PID 1) does. If that process exits, the container stops, which is why you run services in the foreground (`nginx -g 'daemon off;'`), not as daemons. The exit code tells you why: 0 success, 1 app error, **137** = SIGKILL (often OOM or a `docker stop` timeout), **143** = SIGTERM.

Restart policies: `no`, `on-failure[:N]`, `always`, `unless-stopped`.

## Dockerfile reference

| Instruction | Purpose | Notes |
|---|---|---|
| `FROM image AS name` | base image / start a build stage | pin versions; multiple FROMs = multi-stage |
| `WORKDIR /app` | set the working directory | creates it; prefer over `RUN cd` |
| `COPY src dst` | copy files from the build context | `--from=stage` copies from another stage; `--chown`, `--chmod` |
| `ADD` | like COPY, plus remote URLs and auto-extracting tarballs | prefer COPY unless you need that |
| `RUN cmd` | execute at build time, creating a layer | chain related commands; clean caches in the same RUN |
| `ENV K=V` | environment variable (build and runtime) | persists in the image, never put secrets here |
| `ARG K=default` | build-time variable | `--build-arg`; also visible in history, not for secrets |
| `EXPOSE 8080` | document the listening port | doesn't publish anything by itself |
| `USER app` | run subsequent steps and the container as this user | create the user first; avoid root |
| `ENTRYPOINT ["bin"]` | the executable | exec form (JSON array) so it's PID 1 and receives signals |
| `CMD ["--flag"]` | default arguments (or default command) | overridden by args to `docker run` |
| `HEALTHCHECK CMD …` | container health | Docker/Compose mark it healthy/unhealthy |
| `VOLUME /data` | declare a mount point | creates anonymous volumes if not mounted |
| `LABEL k=v` | metadata | OCI labels for source, version |
| `STOPSIGNAL`, `SHELL`, `ONBUILD` | less common | |

**ENTRYPOINT vs CMD**: with `ENTRYPOINT ["python", "app.py"]` and `CMD ["--port", "8080"]`, `docker run img --port 9000` replaces only CMD. The **shell form** (`CMD python app.py`) wraps in `/bin/sh -c`, so your app isn't PID 1 and **won't receive SIGTERM** containers then take 10 s to stop and get SIGKILLed. Use the exec form.

### A production Dockerfile for a Node.js API

```dockerfile
# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22.11

# ---- deps: install production dependencies only ----
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---- build: full deps + compile TypeScript ----
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

# ---- runtime: small, non-root ----
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s CMD node -e "fetch('http://localhost:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]          # forwards signals, reaps zombies
CMD ["node", "dist/server.js"]
```

And a `.dockerignore` (keeps the build context small and secrets out):

```text
node_modules
dist
.git
.env*
*.log
Dockerfile*
docker-compose*.yml
```

## Build cache and BuildKit

Each instruction produces a layer cached by its inputs (the instruction text, files copied, the parent layer). When one layer changes, **every layer after it is rebuilt**. So:

1. Put rarely changing steps first (base image, system packages, dependency manifests + install).
2. Put frequently changing steps last (`COPY . .`, build).
3. Combine `apt-get update && apt-get install … && rm -rf /var/lib/apt/lists/*` in one RUN (separate RUNs leave stale indexes cached and bloat layers).

**BuildKit** (default builder) adds: parallel stage builds, **cache mounts** (`--mount=type=cache` for package manager caches that persist across builds without entering the image), **secret mounts** (`RUN --mount=type=secret,id=npmrc …` with `docker build --secret id=npmrc,src=$HOME/.npmrc`, the secret never lands in a layer), SSH forwarding for private Git deps, and remote cache export/import for CI (`--cache-to type=registry`, `--cache-from`).

**Multi-platform builds** with `docker buildx`:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/acme/api:1.4.2 --push .
```

(ARM-based cloud instances like Graviton are cheaper; Apple Silicon laptops are arm64, build for what production runs.)

## Storage: volumes, bind mounts, tmpfs

| Type | Syntax | Lives | Use for |
|---|---|---|---|
| **Named volume** | `-v pgdata:/var/lib/postgresql/data` | managed by Docker (`/var/lib/docker/volumes`) | database data, anything persistent |
| **Bind mount** | `-v "$PWD":/app` or `--mount type=bind,src=…,dst=…` | a host path | local development (live code reload), config files, sockets |
| **tmpfs** | `--tmpfs /tmp` | memory only | scratch space, secrets at runtime |

The container's own writable layer disappears with `docker rm`, and copy-on-write makes it slow for heavy I/O. Back up volumes with a throwaway container: `docker run --rm -v pgdata:/data -v "$PWD":/backup alpine tar czf /backup/pg.tgz /data`.

## Networking

- **bridge** (default): containers get private IPs on `docker0`; outbound via NAT; inbound only through published ports (`-p`).
- **User-defined bridge networks** (`docker network create app`): containers on the same network resolve each other **by name** via Docker's embedded DNS (`127.0.0.11`), `postgres://db:5432` just works. Always prefer these over the default bridge and over linking by IP.
- **host**: share the host network stack (no isolation, no port mapping; Linux only).
- **none**: no networking.
- **overlay**: multi-host networks (Swarm); **macvlan**: give a container its own MAC/IP on the LAN.

Gotchas: `localhost` inside a container is the container itself, not your machine (use `host.docker.internal` on Docker Desktop); binding your app to `127.0.0.1` inside the container makes it unreachable through `-p`, bind to `0.0.0.0`; publishing ports with Docker can **bypass host firewalls** like ufw because Docker inserts its own iptables rules, publish to `127.0.0.1:5432:5432` for local-only services.

## Docker Compose: multi-container apps

Compose describes an application's services, networks and volumes in one YAML file and runs them together, ideal for local development, integration tests in CI, and small single-host deployments.

```yaml
# compose.yaml
services:
  api:
    build: { context: ., target: runtime }
    image: acme/api:dev
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app
      REDIS_URL: redis://cache:6379
    env_file: [.env]
    depends_on:
      db:    { condition: service_healthy }     # wait for health, not just "started"
      cache: { condition: service_started }
    restart: unless-stopped
    deploy:
      resources: { limits: { cpus: "1.0", memory: 512M } }
    develop:
      watch:                                    # `docker compose watch`: live sync for dev
        - { action: sync, path: ./src, target: /app/src }
        - { action: rebuild, path: package.json }

  worker:
    image: acme/api:dev
    command: ["node", "dist/worker.js"]
    environment: { REDIS_URL: redis://cache:6379 }
    depends_on: [cache]

  db:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: app, POSTGRES_DB: app }
    volumes: [pgdata:/var/lib/postgresql/data, ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      retries: 10

  cache:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes: [redisdata:/data]

volumes:
  pgdata:
  redisdata:
```

```bash
docker compose up -d --build       # build and start everything (one network, service-name DNS)
docker compose ps
docker compose logs -f api
docker compose exec db psql -U app
docker compose run --rm api npm test
docker compose down                # stop and remove containers + network (add -v to delete volumes!)
```

Compose features worth knowing: **profiles** (optional services like `--profile debug`), multiple files and overrides (`compose.override.yaml` for dev), `.env` interpolation (`${TAG:-latest}`), `depends_on` with health conditions, and `docker compose config` to see the resolved file.

Compose is not an orchestrator across machines: for production at scale you move to **Kubernetes** (next chapter) or managed container services (ECS, Cloud Run). Many teams keep Compose for local dev and CI.

## Debugging containers

```bash
docker logs --since 10m api                     # app output (log to stdout/stderr, not files!)
docker inspect --format '{{.State.ExitCode}} {{.State.OOMKilled}}' api
docker exec -it api sh                           # shell in (if the image has one)
docker run --rm -it --entrypoint sh acme/api:dev # override entrypoint to poke at the image
docker debug api                                 # attach a toolbox to slim/distroless containers (Docker Desktop)
docker events                                    # daemon events stream (OOM, die, health_status)
docker top api                                   # processes inside, as seen from the host
nsenter -t $(docker inspect -f '{{.State.Pid}}' api) -n ss -tlnp   # enter only its network namespace (Linux)
```

Common issues: container exits immediately (main process ended or crashed, check logs and exit code); "port already allocated"; app unreachable (listening on 127.0.0.1 inside); permission denied on volumes (UID mismatch between host and container user); image too big (no multi-stage, dev deps included, caches not cleaned); slow builds (cache-busting order, large build context, check `.dockerignore`).

## Security checklist

- Minimal, pinned base images (slim/distroless/Alpine/Chainguard), rebuilt regularly; scan with **Docker Scout** Trivy or Grype; generate SBOMs (`docker buildx build --sbom=true`).
- **Non-root `USER`** `--read-only` root filesystem with tmpfs for writable paths, `--cap-drop ALL` (add back only what's needed), `--security-opt no-new-privileges`.
- **Never bake secrets** into images (ENV, ARG, COPY of .env), use BuildKit secrets at build time and runtime secret injection (orchestrator secrets, mounted files).
- **Never** run `--privileged` or mount `/var/run/docker.sock` into containers unless you fully understand that it grants root on the host.
- Consider **rootless Docker** or Podman; sign images (cosign / Docker Content Trust); set resource limits so one container can't starve the host.

## Production practices

- One process/concern per container; log to stdout/stderr; configuration via environment (12-factor app).
- Handle **SIGTERM** for graceful shutdown; use an init (tini, `--init`) if your app spawns children.
- Health checks; restart policies; resource limits.
- Tag images with the **git SHA** (plus semver), promote the **same image** through environments, deploy by digest.
- Keep images small: faster pulls → faster scaling and recovery.

> [!INTERVIEW] Docker questions: image vs container; how layers and the build cache work and how to order a Dockerfile; ENTRYPOINT vs CMD and exec vs shell form (signals!); volumes vs bind mounts; how containers on a user-defined network find each other; what `-p` does under the hood; multi-stage builds; how to keep secrets out of images; exit code 137; Docker vs a VM; Compose vs Kubernetes.

::quiz {"q":"Your container takes 10 seconds to stop and then gets killed. The Dockerfile has CMD node server.js. Why?","options":["Node is slow to exit","Shell form runs the app under /bin/sh -c, so the app isn't PID 1 and never receives SIGTERM; Docker SIGKILLs after the timeout","The image is too large","Docker always waits 10 seconds"],"answer":1,"explain":"Use the exec form CMD [\"node\", \"server.js\"] (and/or an init like tini) so signals reach the app."}

::quiz {"q":"How can a container named api reach a Postgres container named db?","options":["Only via its IP address","Put both on the same user-defined network (Compose does this) and connect to host 'db', Docker's embedded DNS resolves service names","Publish 5432 and use localhost","Use --link only"],"answer":1,"explain":"User-defined bridge networks provide name-based service discovery."}

::quiz {"q":"What's the safe way to use a private npm token during docker build?","options":["ENV NPM_TOKEN=…","ARG NPM_TOKEN and RUN npm ci","A BuildKit secret mount (RUN --mount=type=secret,...) so the token is never written into a layer","COPY .npmrc then delete it in a later step"],"answer":2,"explain":"ENV/ARG/COPY all persist in image layers or history; deleting later doesn't remove earlier layers."}

::quiz {"q":"Which change keeps the npm install layer cached when only source code changes?","options":["COPY . . before RUN npm ci","COPY package.json package-lock.json, RUN npm ci, then COPY . .","Use ADD instead of COPY","Use a bigger base image"],"answer":1,"explain":"Layers are invalidated from the first changed input onward."}
