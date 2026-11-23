---
title: Virtualization — How One Physical Server Becomes Many
summary: What really happens when you "launch a server" in the cloud. How a hypervisor lets dozens of operating systems share one machine safely, the hardware tricks that make it fast, how AWS Lambda starts a fresh tiny virtual machine in a fraction of a second, live migration, and the IaaS/PaaS/serverless spectrum.
---

::widget Scene {"title": "Virtualization: one server, many virtual machines", "sub": "what happens when you launch a VM in the cloud", "nodes": [{"id": "u", "kind": "laptop", "label": "You: \"launch t3.medium\"", "x": 3.72, "y": 3.72}, {"id": "api", "kind": "server", "label": "Cloud control plane", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "host", "kind": "server", "label": "Physical host (64 cores)", "x": 12.22, "y": -4.78, "color": "dark"}, {"id": "hv", "kind": "cube", "label": "Hypervisor", "x": 17.18, "y": 0.18, "color": "orange"}, {"id": "v1", "kind": "cube", "label": "VM A", "x": 12.5, "y": -12.5, "color": "green"}, {"id": "v2", "kind": "cube", "label": "VM B", "x": 16.22, "y": -8.78, "color": "teal"}, {"id": "v3", "kind": "cube", "label": "Your VM", "x": 19.94, "y": -5.06, "color": "purple"}, {"id": "ebs", "kind": "disk", "label": "Network disk", "x": 23.94, "y": -9.06, "color": "pink"}], "links": [["u", "api"], ["api", "host"], ["host", "hv"], ["hv", "v1"], ["hv", "v2"], ["hv", "v3"], ["v3", "ebs", {"dashed": true}]], "metrics": [["step", "Step"], ["res", "Your share"]], "steps": [{"short": "Request", "tag": "Request", "title": "You ask for 2 vCPUs and 4 GB RAM", "body": "<p>An API call. You never pick a physical machine.</p>", "show": ["u", "api"], "flow": [["u", "api", "#3b82f6", "RunInstances"]], "metrics": {"step": ["request"], "res": ["—"]}}, {"short": "Place", "tag": "Placement", "title": "The scheduler picks a host with room", "body": "<p>Spreading across racks and zones so one failure doesn't take out all your VMs.</p>", "show": ["u", "api", "host"], "flow": [["api", "host", "#3b82f6", "place here"]], "metrics": {"step": ["placement"]}}, {"short": "HV", "tag": "Hypervisor", "title": "The hypervisor carves out a virtual machine", "body": "<p>It sits between hardware and guests, giving each its own virtual CPUs, memory and devices.</p>", "show": ["u", "api", "host", "hv", "v1", "v2", "v3"], "flow": [["hv", "v3", "#f59e0b", "create"]], "metrics": {"step": ["create VM"]}}, {"short": "CPU", "tag": "CPU", "title": "vCPUs are time slices of real cores", "body": "<p>Hardware virtualization (Intel VT-x, AMD-V) lets guest code run directly on the CPU at near-native speed; only privileged instructions trap to the hypervisor.</p>", "set": {"v3": {"badge": "2 vCPU"}}, "metrics": {"res": ["2 vCPU"]}}, {"short": "Mem", "tag": "Memory", "title": "Memory: a second layer of address translation", "body": "<p>Guest virtual → guest physical → host physical, done in hardware (EPT/NPT).</p>", "set": {"v3": {"badge": "2 vCPU · 4 GB"}}, "metrics": {"res": ["2 vCPU · 4 GB"]}}, {"short": "Disk", "tag": "Storage", "title": "The disk is usually on the network", "body": "<p>So the VM can move to another host, and the disk survives host failure.</p>", "show": ["u", "api", "host", "hv", "v1", "v2", "v3", "ebs"], "flow": [["v3", "ebs", "#ec4899", "block I/O"]]}, {"short": "Boot", "tag": "Boot", "title": "The guest OS boots as if on real hardware", "body": "<p>Your VM has its own kernel. It can't see VM A or VM B.</p>", "metrics": {"step": ["booted", "good"]}}, {"short": "Noisy", "tag": "Sharing", "title": "Noisy neighbours", "body": "<p>A busy VM can still compete for caches and memory bandwidth. \"Burstable\" instance types share CPU credits; dedicated hosts avoid sharing.</p>", "set": {"v1": {"badge": "100% CPU"}}}, {"short": "Nitro", "tag": "Modern", "title": "Modern clouds offload networking and storage to dedicated cards", "body": "<p>AWS Nitro moves almost all hypervisor work off the main CPU, so you get nearly all of it.</p>", "set": {"v1": {"badge": null}}, "note": {"kind": "key", "text": "Hypervisors share one physical machine among isolated VMs using hardware-assisted CPU and memory virtualization; disks and networks are virtualized too."}}]}


## You never get a whole computer

When you click "Launch instance" in AWS, Google Cloud or Azure, a server appears within a minute, with its own operating system, its own IP address and the CPU and memory you chose. But nobody walked into a data center and plugged in a machine for you. You got a **virtual machine (VM)** — a slice of a much bigger physical server that's shared with other customers, who are completely invisible to you.

> [!ANALOGY] An apartment building. One physical structure (the server) is divided into many apartments (VMs). Each tenant has their own locked front door, kitchen and address, and can decorate however they like — they don't share a living room, and they can't walk into a neighbor's flat. The building manager (the **hypervisor**) controls the plumbing and electricity, divides them fairly, and makes sure no tenant can tamper with another's supply.

The software that makes this possible is the **hypervisor** (also called a virtual machine monitor). It lets several complete operating systems — say, three copies of Linux and one of Windows — run on the same hardware at the same time, each believing it has the machine to itself.

## Why this is hard

Remember from the OS track: an operating system kernel expects to run in **kernel mode**, with full control over the hardware. It switches page tables, handles interrupts, talks directly to devices.

If two operating systems on the same machine both did that for real, chaos: one would overwrite the other's memory map, steal its interrupts, or reprogram the disk controller under it. So the hypervisor must let each **guest** operating system *believe* it's in full control, while actually keeping control itself.

### The original approach: trap and emulate

Run each guest kernel with **reduced** privileges. Whenever it tries something privileged (like switching page tables), the CPU **traps** into the hypervisor (OS track, chapter 3), which performs the operation on the guest's **virtual** hardware and then resumes the guest. The guest never notices.

For years, this didn't fully work on Intel and AMD processors: a handful of instructions behaved differently in reduced-privilege mode **without** trapping, so the hypervisor couldn't catch them. Engineers found two workarounds:

- **Binary translation** (VMware, 1999): scan the guest's code as it runs and rewrite the problematic instructions on the fly. Impressive engineering.
- **Paravirtualization** (Xen, 2003): modify the guest operating system so it **asks** the hypervisor politely instead of trying privileged operations. Fast, but requires a modified guest.

### The fix: hardware support

In 2005–2006, Intel (**VT-x**) and AMD (**AMD-V**) added virtualization support directly into their CPUs. The CPU gained a new mode in which a guest kernel runs in its *own* kernel mode, and specific events automatically exit to the hypervisor. A few years later came **nested page tables** (Intel EPT, AMD NPT): the CPU's memory hardware translates addresses twice — from the guest's virtual addresses to the guest's idea of physical memory, and then to real physical memory — so the hypervisor no longer has to intercept every page-table change.

These features are why virtualization became cheap enough to build the entire cloud on.

> [!NOTE] Translating addresses twice makes a TLB miss (OS track, chapter 6) much more expensive inside a VM — potentially two dozen memory lookups instead of four. That's one reason databases running in VMs benefit so much from **huge pages**.

### Virtual devices

A VM also needs a disk and a network card. Three ways to provide them, from slowest to fastest:

::widget Stepper {"type":"flow","cols":4,"title":"How a VM gets devices, from slowest to fastest","what":"Four ways a hypervisor can give a virtual machine a network card or disk, ordered from slowest to fastest.","steps":["Press Play.","Notice how each step involves the hypervisor less in each data transfer.","Ask: why does the fastest option need special hardware support?"],"nodes":[["Full emulation","The hypervisor pretends to be a real, well-known device (say, an old Intel network card), register by register. Works with any unmodified OS, but every access traps — slow."],["Paravirtual devices (virtio)","The guest uses a special driver that knows it's virtualized, and shares a queue of requests with the host — similar to io_uring in the OS track. Few traps, batched work. The standard in most clouds."],["Host-kernel backends","The device's work is handled directly in the host's kernel or a fast user-space data path, skipping extra hops."],["Direct device assignment (SR-IOV)","A physical network card presents itself as many 'virtual functions', and each VM gets one directly. The IOMMU keeps each VM confined to its own memory. Close to bare-metal speed."]]}

## Kinds of hypervisors

- **Type 1 ("bare metal")** runs directly on the hardware: VMware ESXi, Microsoft Hyper-V, Xen and **KVM** — which turns the Linux kernel itself into a hypervisor. This is what clouds use.
- **Type 2 ("hosted")** runs as an app on a normal operating system: VirtualBox, VMware Fusion, Parallels on a Mac. Great for running Windows on your laptop.

With **KVM**, every VM is simply a normal Linux process, and each virtual CPU is a thread. So Linux's ordinary scheduler, memory manager and resource limits manage VMs too. Google Cloud and many other clouds are built on KVM.

## How the biggest clouds do it

> [!EXAMPLE] **AWS Nitro.** Since 2017, AWS has moved almost all the "building manager" work — networking, storage, security, monitoring — off the main server CPU and onto dedicated add-in cards called Nitro cards, leaving only a very thin hypervisor. Nearly all of the server's CPU and memory go to customers, and there's no way for an AWS operator to log into a host and look at customer memory. Google (Titan security chips) and Azure (Azure Boost) have their own versions of this idea.

## Micro-VMs: how serverless isolates millions of customers

**Containers** (next chapter) start in milliseconds but share one operating system kernel, which is weaker isolation when you're running untrusted code from millions of strangers. Full VMs are strongly isolated but traditionally take many seconds to boot. **Micro-VMs** get the best of both.

> [!EXAMPLE] **Firecracker** is a tiny VM manager AWS wrote in Rust for **AWS Lambda** and **Fargate**. It supports only the handful of devices a function actually needs, boots a VM in about **125 milliseconds** with about 5 MB of overhead, and runs thousands of these micro-VMs on one physical server. Every time a Lambda function scales up, a fresh micro-VM appears — each customer's code sealed in its own VM.

Similar ideas: **gVisor** (Google; a user-space kernel that intercepts a container's system calls, used by Cloud Run) and **Kata Containers** (each container in its own lightweight VM).

## Moving a running VM without stopping it

Hardware needs maintenance. Instead of rebooting customers' VMs, clouds can **live-migrate** them to another physical server: copy the VM's memory over while it keeps running, re-copy any pages that changed meanwhile, then pause for a few milliseconds to copy the last bits and resume on the new machine.

> [!EXAMPLE] Google Compute Engine live-migrates VMs routinely for host maintenance and security patches. Most customers never notice that their "server" moved to a different physical machine.

## The catch: noisy neighbors

VMs on the same physical server share some things: CPU caches, memory bandwidth, network capacity. A neighbor running a heavy workload can make your application slower in unpredictable ways — a **noisy neighbor**. Clouds reduce this by never letting two customers share a physical CPU core (which also blocks a class of CPU security attacks like Spectre), limiting disk and network rates, and offering **dedicated hosts** for customers who need them.

> [!NOTE] **"Burstable" instances** (AWS's T family, for example) give you a baseline share of a CPU plus "credits" to run faster for short bursts. They're cheap for websites that are mostly idle — and confusing when a busy app runs out of credits and suddenly slows down.

## IaaS, PaaS, FaaS, SaaS: how much do you manage?

| Model | You manage | The provider manages | Examples |
|---|---|---|---|
| **IaaS** (infrastructure) | Operating system and everything above it | Hardware, virtualization, network | EC2, Compute Engine, Azure VMs |
| **Containers as a service** | Your containers | The cluster and (partly) the nodes | EKS, GKE, AKS, ECS |
| **PaaS** (platform) | Your app's code | Servers, OS, runtime, scaling | Heroku, App Engine, Cloud Run |
| **FaaS** (functions / "serverless") | Individual functions | Everything else, including scaling to zero | AWS Lambda, Cloud Functions |
| **SaaS** (software) | Settings and your data | The whole application | Gmail, Slack, Salesforce |

> [!ANALOGY] **Pizza as a service.** Making pizza at home = running your own servers. Take-and-bake = IaaS (they provide the pizza, you provide the oven and the cooking). Delivery = PaaS (you just eat — and set the table). Eating at a restaurant = SaaS (everything's done for you).

This is called the **shared responsibility model**: the provider secures the hardware and the platform; you're responsible for what you put on it — your data, your access permissions, and (on IaaS) patching your operating system.

> [!RECAP]
> - A **hypervisor** lets many operating systems share one physical server, each isolated like an apartment.
> - Early tricks (binary translation, paravirtualization) gave way to **hardware support** (VT-x/AMD-V and nested page tables).
> - Devices are virtualized by emulation, fast **virtio** drivers, or direct assignment (**SR-IOV**).
> - Clouds use type-1 hypervisors like **KVM**; AWS **Nitro** moves the overhead onto dedicated cards.
> - **Micro-VMs** (Firecracker) give VM-strength isolation with near-container startup — the basis of AWS Lambda.
> - **Live migration** moves running VMs; **noisy neighbors** are the cost of sharing.
> - IaaS → PaaS → FaaS → SaaS: the further right, the less you manage.

> [!INTERVIEW] Know: VM vs container (a VM has its own kernel on a hypervisor; containers share the host's kernel); type 1 vs type 2 hypervisors; why hardware virtualization mattered; and the IaaS/PaaS/FaaS spectrum with the shared responsibility model. "How does AWS Lambda isolate customers?" → Firecracker micro-VMs.

::quiz {"q":"What does a hypervisor do?","options":["Speeds up the CPU","Lets several operating systems share one physical machine, each isolated and believing it has the hardware to itself","Compresses memory","Routes network packets between data centers"],"answer":1,"explain":"Like a building manager dividing one building into separate apartments."}

::quiz {"q":"How does AWS Lambda give each customer strong isolation while starting quickly?","options":["Each function runs on its own physical server","Each runs in a Firecracker micro-VM that boots in about 125 ms","All functions share one container","It doesn't isolate customers"],"answer":1,"explain":"Micro-VMs combine VM-level isolation with near-container startup speed."}

::quiz {"q":"In which model do you manage the least?","options":["IaaS","PaaS","FaaS","SaaS"],"answer":3,"explain":"With SaaS you only configure the application and manage your data."}
