---
title: Virtualization and Containers from the Kernel's Point of View
summary: How one physical machine pretends to be many — hypervisors and hardware virtualization (VT-x, nested page tables), what a virtual machine really is, how containers are built from just two kernel features (namespaces and cgroups), why containers share a kernel and what that means for security, and lightweight VMs like Firecracker and gVisor that blend the two.
---

::widget Scene {"title": "Containers vs virtual machines", "sub": "what the kernel actually does when you docker run", "nodes": [{"id": "hw", "kind": "slab", "label": "Hardware", "x": 7.44, "y": 7.44, "color": "dark"}, {"id": "hv", "kind": "cube", "label": "Hypervisor", "x": 3.72, "y": 3.72, "color": "orange"}, {"id": "vm", "kind": "server", "label": "VM: own kernel + OS", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "host", "kind": "cpu", "label": "Host Linux kernel", "x": 15.44, "y": -0.56, "color": "purple"}, {"id": "c1", "kind": "cube", "label": "Container A", "x": 8.17, "y": -3.83, "color": "green"}, {"id": "c2", "kind": "cube", "label": "Container B", "x": 12.17, "y": -7.83, "color": "teal"}], "links": [["vm", "hv"], ["hv", "hw"], ["c1", "host"], ["c2", "host"]], "metrics": [["iso", "Isolation by"], ["boot", "Start time"], ["over", "Overhead"]], "steps": [{"short": "VM", "tag": "VMs", "title": "A VM emulates a whole computer", "body": "<p>The hypervisor uses CPU virtualization (VT-x/AMD-V) so each VM runs its own full kernel.</p>", "show": ["hw", "hv", "vm"], "metrics": {"iso": ["hardware virtualization"], "boot": ["~seconds–minutes"], "over": ["a full OS each"]}}, {"short": "Strong", "tag": "VMs", "title": "Strong isolation, but heavy", "body": "<p>Each VM carries a kernel, init system and GBs of image. Great for running different OSes or untrusted tenants.</p>", "focus": ["vm"]}, {"short": "Container", "tag": "Containers", "title": "A container is just a Linux process", "body": "<p>No second kernel. The host kernel gives it a restricted view of the system.</p>", "show": ["hw", "hv", "vm", "host", "c1", "c2"], "metrics": {"iso": ["kernel features"], "boot": ["~milliseconds"], "over": ["almost none"]}}, {"short": "PID", "tag": "Namespaces", "title": "PID namespace: it sees itself as pid 1", "body": "<p>It can't see or signal other processes on the host.</p>", "set": {"c1": {"badge": "pid 1 (host pid 48213)"}}}, {"short": "Mount", "tag": "Namespaces", "title": "Mount namespace + its image as the root file system", "body": "<p>It sees Ubuntu's files even though the host runs something else — same kernel underneath.</p>", "set": {"c1": {"badge": "own / from image"}}}, {"short": "Net", "tag": "Namespaces", "title": "Network namespace: its own interfaces, IP and ports", "body": "<p>Both containers can listen on port 80; a virtual Ethernet pair connects each to a bridge.</p>", "set": {"c2": {"badge": "own eth0, port 80"}}}, {"short": "Cgroups", "tag": "Limits", "title": "cgroups limit CPU and memory", "body": "<p>Container A: 0.5 CPU, 512 MB. Exceed memory → the kernel's OOM killer stops it, not the host.</p>", "set": {"c1": {"badge": "cgroup: 0.5 CPU, 512 MB"}}}, {"short": "Caps", "tag": "Hardening", "title": "Fewer capabilities, seccomp filters, non-root user", "body": "<p>Even root inside the container is restricted.</p>"}, {"short": "Risk", "tag": "Trade-off", "title": "Shared kernel = shared risk", "body": "<p>A kernel exploit in one container can reach the host. For hostile multi-tenant code, use VMs or micro-VMs (Firecracker, gVisor).</p>", "note": {"kind": "key", "text": "VMs virtualize hardware (own kernel each). Containers are processes isolated by namespaces and limited by cgroups on one shared kernel."}}]}


## Two ways to share a building

> [!STORY] A cloud provider has a server with 192 CPU cores and 1.5 TB of memory, and thousands of customers who each want "a server". Selling the whole machine to one customer wastes most of it. So the provider splits it — either by giving each customer what looks like a **complete separate computer** with its own operating system (a virtual machine), or by giving each customer an **isolated room** inside one shared operating system (a container). Both are illusions created by the OS and the hardware. Knowing exactly how each illusion works tells you what each one can and can't protect you from.

> [!ANALOGY] Virtual machines are like separate houses on one plot of land: each has its own foundations, plumbing and front door (its own kernel). Containers are like apartments in one building: separate locked units, but sharing the same foundations, plumbing and building manager (one shared kernel). Apartments are cheaper and faster to set up; houses are more isolated.

## Virtual machines

A **virtual machine (VM)** runs a complete guest operating system — its own kernel and all — on virtual hardware. A program called a **hypervisor** creates that virtual hardware and shares the real hardware among VMs.

- **Type 1 (bare metal):** the hypervisor runs directly on the hardware — KVM (part of the Linux kernel), Xen, VMware ESXi, Microsoft Hyper-V. Clouds use these (AWS's Nitro is based on KVM).
- **Type 2 (hosted):** runs as an app on a normal OS — VirtualBox, VMware Workstation, Parallels.

### How a guest kernel is kept in check

A guest kernel expects full control of the CPU: to run in the most privileged mode, manage page tables and handle interrupts (chapters 3 and 6). It can't be allowed to actually do that, or it would control the real machine.

Early hypervisors used clever software tricks. Since around 2006, CPUs include **hardware virtualization** (Intel VT-x, AMD-V, ARM's EL2):

- The CPU gets an extra, even more privileged **hypervisor mode**. The guest kernel runs in "kernel mode" — but kernel mode **inside a VM**.
- When the guest does something sensitive (touches certain hardware, executes certain instructions), the CPU automatically **exits** to the hypervisor, which handles it and **resumes** the guest.
- **Nested page tables** (Intel EPT, AMD NPT): the guest manages its own page tables mapping its virtual addresses to "guest physical" addresses, and the hardware adds a second translation from guest physical to real physical memory, controlled by the hypervisor. The guest can never map memory it wasn't given.

Devices are virtualized too: either emulated, or (much faster) **paravirtualized** with **virtio** drivers that know they're in a VM, or passed directly to the VM through hardware support (SR-IOV, used by cloud network cards and GPUs).

The cost: each VM boots a whole OS (seconds to minutes) and uses memory for its own kernel. The benefit: **strong isolation** — the hardware enforces the boundary, and the attack surface is the hypervisor's small interface.

## Containers: isolation by the kernel itself

A **container** is just a normal process on the host — but the kernel shows it a restricted view of the system and limits its resources. There's no guest kernel. It's built from two kernel features.

::widget Stepper {"type":"hub","title":"What a container is made of","what":"The center is a container; each box is a kernel feature that creates part of the illusion. Remove all of them and you have an ordinary process.","steps":["Click the center first.","Click each namespace and note what it hides or virtualizes.","Find the feature that limits how much CPU and memory a container can use, rather than what it can see."],"nodes":[["A container = a process with restrictions","Run 'ps' on the host and you'll see the container's processes like any other. The kernel just gives them a private view of the system (namespaces) and resource limits (cgroups), plus security filters."],["PID namespace","The container sees its own process IDs, starting at 1. It can't see or signal processes outside."],["Mount namespace","Its own filesystem tree — the container image's layers become its root '/'. Host files are invisible unless mounted in."],["Network namespace","Its own network interfaces, IP address, routing table and ports. Connected to the host through a virtual Ethernet pair and a bridge."],["UTS, IPC and user namespaces","Its own hostname; its own shared-memory and semaphores; and (user namespace) its own user IDs — 'root' inside can be an unprivileged user outside."],["cgroups","Control groups limit and account for resources: at most 2 CPUs, at most 512 MB of memory (exceed it and the OOM killer acts), I/O bandwidth, number of processes."],["Security layers","Dropped capabilities, a seccomp filter and an AppArmor/SELinux profile (chapter 12) limit what the process may do even within its view."]]}

You can build a container by hand with standard tools:

```bash
# A shell in new PID, mount, network, UTS and IPC namespaces, with its own /proc
sudo unshare --pid --fork --mount-proc --net --uts --ipc bash
hostname sandbox    # only changes the hostname inside
ps aux              # only shows this shell and ps
```

Docker, containerd and Kubernetes automate exactly this, plus unpacking images, networking and lifecycle (Cloud track, chapters 2–4).

> [!NOTE] Because a container is just a process, starting one takes milliseconds and costs almost no extra memory — which is why you can run hundreds on one machine, and why "serverless" platforms can start them on demand.

## The security difference

All containers on a host share **one kernel**. The kernel has a very large interface (hundreds of system calls, filesystems, network protocols), and a single kernel bug can let a process **escape** its container and control the host and every other container on it.

> [!WARN] Treat ordinary containers as a strong **resource and packaging** boundary but a weaker **security** boundary than VMs. Don't run untrusted customers' code in ordinary containers side by side. Running a container as `--privileged`, or mounting the Docker socket into it, removes most of the isolation altogether — it's effectively root on the host.

## The best of both: lightweight VMs and sandboxes

When you need container speed **and** VM-strength isolation — for example, running thousands of untrusted customers' functions:

- **Firecracker** (built by AWS for Lambda and Fargate): a minimal hypervisor using KVM, exposing only a handful of virtual devices. MicroVMs boot in about **125 ms** with a few MB of overhead. Each customer's function runs in its own microVM.
- **Kata Containers:** runs each container (or Kubernetes pod) inside its own lightweight VM, transparently.
- **gVisor** (Google): a user-space "kernel" written in Go that intercepts the container's system calls and implements them itself, so the container never talks directly to the real kernel. Used by Google Cloud Run and App Engine.
- **WebAssembly** runtimes: sandboxed bytecode with no direct system access at all, for very lightweight isolation.

| | Containers | Lightweight VMs / gVisor | Full VMs |
|---|---|---|---|
| Startup | ~milliseconds | ~100 ms | seconds to minutes |
| Overhead | Minimal | Small | A full OS per VM |
| Isolation boundary | Shared kernel | Hypervisor or user-space kernel | Hypervisor |
| Typical use | Your own services | Multi-tenant serverless | General cloud servers |

> [!RECAP]
> - **VMs** run a full guest OS on virtual hardware made by a **hypervisor**; **hardware virtualization** (VT-x, nested page tables) traps sensitive operations and isolates memory. Strong isolation, more overhead.
> - **Containers** are ordinary processes with **namespaces** (PID, mount, network, UTS, IPC, user) and **cgroups**, plus capabilities and seccomp. Fast and light, but they **share the kernel**.
> - Kernel bugs or privileged settings can enable **container escapes**; don't mix untrusted tenants in plain containers.
> - **Firecracker, Kata and gVisor** combine container speed with stronger isolation.

> [!INTERVIEW] A very common question: "What's the difference between a container and a VM?" Answer from the kernel's view — namespaces and cgroups vs a hypervisor and guest kernel — and discuss startup time, overhead and isolation, then mention Firecracker or gVisor for multi-tenant workloads.

::quiz {"q":"Which two kernel features are containers primarily built from?","options":["Hypervisors and virtio","Namespaces and cgroups","Swap and paging","TCP and UDP"],"answer":1,"explain":"Namespaces control what a process sees; cgroups control what it can use."}

::quiz {"q":"Why are containers considered a weaker security boundary than VMs?","options":["They're slower","All containers on a host share one kernel, so a kernel bug can lead to escape","They can't use networking","They have no file permissions"],"answer":1,"explain":"VMs are separated by the much smaller hypervisor interface."}

::quiz {"q":"What does Firecracker provide?","options":["A container image format","Very lightweight VMs that start in ~125 ms, giving VM isolation with near-container speed","A Linux distribution","A load balancer"],"answer":1,"explain":"It powers AWS Lambda and Fargate."}
