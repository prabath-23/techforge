---
title: Containers from the Inside — What a Container Really Is
summary: "It works on my machine" — and how containers solved it. A container isn't a tiny VM; it's an ordinary process the kernel has blindfolded (namespaces) and put on a budget (cgroups), started from a packaged filesystem made of layers. You'll even build one by hand with a few commands.
---

::widget Scene {"title": "A container is just an isolated process", "sub": "image layers, a writable layer, namespaces and limits", "nodes": [{"id": "img", "kind": "blocks", "label": "Image layers (read-only)", "x": 3.72, "y": 3.72, "count": 3, "color": "blue"}, {"id": "rw", "kind": "doc", "label": "Writable layer", "x": 4.0, "y": -4.0, "color": "orange"}, {"id": "proc", "kind": "cpu", "label": "Process: node server.js", "x": 7.72, "y": -0.28, "color": "green"}, {"id": "k", "kind": "cube", "label": "Shared host kernel", "x": 12.22, "y": -4.78, "color": "purple"}, {"id": "c2", "kind": "cpu", "label": "Another container", "x": 12.06, "y": 4.06, "color": "teal"}], "links": [["img", "proc"], ["rw", "proc"], ["proc", "k"], ["c2", "k"]], "metrics": [["what", "Mechanism"], ["effect", "Effect"]], "steps": [{"short": "Problem", "tag": "Problem", "title": "\"Works on my machine\"", "body": "<p>Different library versions, OS packages and config on every server. Containers ship the app with its whole environment.</p>", "show": ["img"], "metrics": {"what": ["—"], "effect": ["—"]}}, {"short": "Layers", "tag": "Image", "title": "An image is a stack of read-only layers", "body": "<p>Base OS files, then node runtime, then your code. Layers are shared between images and cached by hash.</p>", "set": {"img": {"badge": "ubuntu · node · app"}}, "metrics": {"what": ["layered image"], "effect": ["small, cacheable"]}}, {"short": "RW", "tag": "Union FS", "title": "Starting a container adds a thin writable layer on top", "body": "<p>Changes go there (copy-on-write). Delete the container and they're gone — store data in volumes.</p>", "show": ["img", "rw", "proc"], "metrics": {"what": ["overlay filesystem"]}}, {"short": "Proc", "tag": "Process", "title": "The app runs as a normal Linux process", "body": "<p>On the same kernel as everything else. No guest OS to boot — it starts in milliseconds.</p>", "show": ["img", "rw", "proc", "k"], "flow": [["proc", "k", "#22c55e", "syscalls"]], "metrics": {"what": ["ordinary process"], "effect": ["fast start", "good"]}}, {"short": "NS", "tag": "Namespaces", "title": "Namespaces change what it can see", "body": "<p>Own process list (it is pid 1), own hostname, own network interface, own mount tree.</p>", "set": {"proc": {"badge": "pid 1, own eth0"}}, "metrics": {"what": ["namespaces"], "effect": ["isolation of view"]}}, {"short": "CG", "tag": "cgroups", "title": "cgroups limit what it can use", "body": "<p>CPU 0.5, memory 512 MB. Exceed memory and only this container is OOM-killed.</p>", "set": {"proc": {"badge": "≤ 0.5 CPU, 512 MB"}}, "metrics": {"what": ["cgroups"], "effect": ["resource limits"]}}, {"short": "Neighbour", "tag": "Sharing", "title": "Another container on the same host can't see it", "body": "<p>Different namespaces, same kernel.</p>", "show": ["img", "rw", "proc", "k", "c2"], "flow": [["c2", "k", "#14b8a6", ""]]}, {"short": "Security", "tag": "Security", "title": "Harden it", "body": "<p>Run as a non-root user, drop capabilities, read-only root file system, seccomp profile. A kernel bug is shared by all containers on the host.</p>", "note": {"kind": "key", "text": "Container = image layers + writable layer + a process isolated by namespaces and limited by cgroups, on a shared kernel."}}]}


## "But it works on my machine!"

> [!STORY] A developer's app runs perfectly on their laptop. On the test server it crashes: the server has Python 3.9 instead of 3.12, a different version of an image library, and a missing system package. After a day of fixing that, it breaks in production for a third reason. For decades, "it works on my machine" was one of the most common phrases in software.

**Containers** solved this by packaging an application **together with everything it needs** — its runtime, libraries, system tools and settings — into one **image** that runs identically on a laptop, a test server and in production.

> [!ANALOGY] Before shipping containers were standardized in the 1950s, cargo was loaded piece by piece — sacks, barrels, crates — and every port handled it differently. Then came the standard steel container: pack it once, and every ship, crane, train and truck in the world can move it without caring what's inside. Software containers did the same for applications.

## A container is just a process

Here's the surprise: there's no such thing as a "container" inside the Linux kernel. A container is an **ordinary process** (or a group of processes) that the kernel has been told to:

1. **show a restricted view of the system** — using **namespaces**, and
2. **limit how much it can use** — using **cgroups**,
3. starting from a **packaged filesystem** — the **image**.

That's why containers start in milliseconds and add almost no overhead: there's no second operating system and no emulated hardware, unlike a VM (previous chapter). They all share the **host's kernel**.

::widget Stepper {"type":"layers","title":"Containers vs virtual machines","what":"The layers of a machine running three containers. Compare with a VM, which would have a full guest operating system (with its own kernel) for each app, on top of a hypervisor.","steps":["Press Play from the top.","Find the layer that containers share with each other (the kernel).","Ask: what does sharing the kernel make faster, and what does it make riskier?"],"nodes":[["App A · App B · App C","Your applications, each in its own container."],["Each container's libraries and tools","Each image brings its own userland — Python 3.12 in one, Node 22 in another, Java 21 in a third — so they never conflict."],["Container runtime (containerd + runc)","Sets up the namespaces and cgroups, mounts the image's files, and starts the app's process."],["ONE shared Linux kernel","All containers make system calls to the same kernel. This is why containers start instantly — and why isolation is weaker than in a VM."],["Hardware","CPU, memory, disk, network."]]}

## Namespaces: blinders

> [!ANALOGY] Horses in a busy city wear blinders so they only see the road ahead, not the chaos around them. **Namespaces** are blinders for processes: each one hides part of the system.

Each type of namespace gives the process its own private view of one thing:

| Namespace | What the container sees |
|---|---|
| **PID** | Its own process numbering — your app is process 1, and it can't see any other processes on the host |
| **Network** | Its own network interfaces, IP address, ports and firewall rules |
| **Mount** | Its own filesystem — the image's files, not the host's |
| **UTS** | Its own hostname |
| **IPC** | Its own shared memory and message queues |
| **User** | Its own user IDs — "root" inside the container can be an unprivileged user outside |

## Cgroups: a budget

**Control groups (cgroups)** limit and measure what a group of processes can use:

- **CPU:** "at most 2 CPUs' worth of time" or "a relative share of the CPU".
- **Memory:** "at most 512 MB". Exceed it and the kernel's out-of-memory killer stops the process — which in Kubernetes shows up as **`OOMKilled`** with exit code **137** (128 + signal 9, SIGKILL).
- **Disk I/O** and **number of processes** (which stops a runaway program from creating thousands of processes and freezing the machine).

> [!EXAMPLE] **Why a container with a "1 CPU" limit can be slow on an idle machine.** CPU limits are enforced in short periods (typically 100 ms). An app with 8 busy threads can use its whole 100 ms budget in the first 12.5 ms of a period, and then it's **frozen** for the remaining 87.5 ms, even though the server is otherwise idle. Requests caught in that freeze take far longer. This "CPU throttling" is one of the most common surprises in Kubernetes (OS track, chapter 5).

## Building a container with your bare hands

To prove there's no magic, here's a container made with standard Linux commands (needs a Linux machine and root):

```bash
# 1. Get a root filesystem: Alpine Linux's files, from its Docker image
mkdir -p /tmp/rootfs && docker export $(docker create alpine) | tar -C /tmp/rootfs -xf -

# 2. Start a shell in new namespaces (process, mount, hostname, IPC, network),
#    with /tmp/rootfs as its root directory
sudo unshare --pid --mount --uts --ipc --net --fork --mount-proc=/tmp/rootfs/proc \
     chroot /tmp/rootfs /bin/sh -c 'hostname mybox; ps aux; ip addr'

# 3. Put it on a memory budget with a cgroup
sudo mkdir /sys/fs/cgroup/demo
echo 100M | sudo tee /sys/fs/cgroup/demo/memory.max
echo <pid-of-the-shell> | sudo tee /sys/fs/cgroup/demo/cgroup.procs
```

Inside, `ps aux` shows only your shell as process 1, and `ip addr` shows just a loopback interface. That's a container. Real tools like Docker add security restrictions, networking and image management on top — but this is the core.

## Images and layers

An **image** is the packaged filesystem plus some settings (which program to run, environment variables, the working directory). Images are built in **layers**: each step in the build file adds a layer containing just the files that step changed.

```text
Layer 4:  your app's code                     (changes every build — small)
Layer 3:  your app's dependencies (node_modules / pip packages)
Layer 2:  Node.js runtime
Layer 1:  Debian base system                  (shared by thousands of images)
```

Layers are identified by a fingerprint of their contents, so they're **shared and cached**: if 20 images on a server use the same Debian base layer, it's stored and downloaded once. And rebuilding after a code change only rebuilds the top layer.

When a container runs, a filesystem trick called **overlayfs** stacks the read-only image layers and puts one thin **writable** layer on top for that container. If the container modifies a file from a lower layer, it's first copied up into the writable layer. When the container is deleted, its writable layer is deleted too — which is why **data you want to keep must go in a volume** (next chapter).

> [!ANALOGY] Overhead-projector transparencies stacked on top of each other. The bottom sheets are printed and never change; you can only draw on the clear sheet on top. Looking down through the stack, you see one combined picture.

## The standards and the tools

The **OCI** (Open Container Initiative) defines standard formats for images and for running containers, so an image built by Docker runs on any compliant tool. The software stack usually looks like this:

- **Docker** (the friendly command-line tool and its background service) → **containerd** (manages images and container lifecycles) → **runc** (actually creates the namespaces and cgroups and starts the process).
- **Kubernetes** talks to containerd (or CRI-O) directly.
- Images are stored in **registries**: Docker Hub, GitHub Container Registry, Amazon ECR, Google Artifact Registry.

## Container security

Because every container shares the host's kernel, a kernel bug or a careless setting can let a process **escape** its container. Good practice:

- **Don't run as root** inside the container.
- **Never** use `--privileged` or mount the Docker socket (`/var/run/docker.sock`) into a container unless you fully understand it — either one effectively hands over control of the host.
- Use small base images (fewer tools for an attacker to use, fewer vulnerabilities to patch), scan images for known vulnerabilities, and sign them.
- The runtime's defaults already help: dropped privileges ("capabilities"), and a **seccomp** filter that blocks dangerous system calls.
- For running untrusted code (like a public code-execution service), use micro-VMs or gVisor (previous chapter) instead of plain containers.

> [!RECAP]
> - Containers package an app with everything it needs, ending "it works on my machine".
> - A container is an **ordinary process** with **namespaces** (blinders: own processes, network, files, hostname) and **cgroups** (a budget: CPU, memory, processes).
> - Containers share the **host kernel**: fast and light, but weaker isolation than VMs.
> - **Images** are stacks of cached, shared **layers**; **overlayfs** adds a throwaway writable layer per container.
> - The stack: Docker → containerd → runc; images live in registries.
> - Secure them: non-root, no `--privileged`, small and scanned images.

> [!INTERVIEW] "What is a container?" → a process isolated with namespaces and limited with cgroups, started from a layered image, sharing the host kernel. Be ready to compare with VMs, explain layers and caching, and explain `OOMKilled` / exit code 137.

::quiz {"q":"Which Linux feature limits how much memory a container can use?","options":["Namespaces","cgroups","overlayfs","seccomp"],"answer":1,"explain":"Namespaces control what a process can see; cgroups control what it can use."}

::quiz {"q":"A container exits with code 137 and the status OOMKilled. What happened?","options":["The app called exit(137)","It exceeded its memory limit, and the kernel killed it with SIGKILL (128 + 9)","The image was corrupted","The network was down"],"answer":1,"explain":"Raise the limit if it's legitimately needed, or find the memory leak."}

::quiz {"q":"Why don't changes made inside a container survive when it's deleted?","options":["Containers are read-only","Changes go into a per-container writable layer that's deleted with the container; persistent data belongs in a volume","Docker deletes them on purpose for security","They're stored in RAM"],"answer":1,"explain":"Image layers are read-only and shared; each container gets its own thin, disposable layer."}
