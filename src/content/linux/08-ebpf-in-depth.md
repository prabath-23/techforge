---
title: eBPF in Depth: Safe Programs in the Linux Kernel for Security and Observability
summary: How eBPF lets you run sandboxed programs inside the kernel: the verifier, JIT, hook types (kprobes, tracepoints, LSM, XDP, tc, uprobes), maps and ring buffers for sending events to user space, CO-RE and BTF for portability, how security agents use it compared with auditd and kernel modules, and its limits and risks.
---

::widget Scene {"title": "An eBPF security sensor watching execve", "sub": "load → verify → attach → event in kernel → ring buffer → agent", "nodes": [{"id": "agent", "kind": "server", "label": "User-space agent", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "ver", "kind": "cube", "label": "Verifier", "x": 2.33, "y": -6.67, "color": "orange"}, {"id": "jit", "kind": "cpu", "label": "JIT → native code", "x": 6.83, "y": -11.17, "color": "purple"}, {"id": "hook", "kind": "cube", "label": "Hook: tracepoint sched_process_exec / LSM", "x": 12.72, "y": -5.28, "color": "teal"}, {"id": "rb", "kind": "queue", "label": "Ring buffer map", "x": 13.8, "y": 4.8, "color": "green"}, {"id": "proc", "kind": "cpu", "label": "Any process calling execve", "x": 17.22, "y": -9.78, "color": "dark"}], "links": [["agent", "ver"], ["ver", "jit"], ["jit", "hook"], ["proc", "hook"], ["hook", "rb"], ["rb", "agent"]], "metrics": [["stage", "Stage"], ["where", "Runs in"], ["cost", "Overhead"]], "steps": [{"short": "Load", "tag": "Load", "title": "The agent loads a small eBPF program (compiled C → BPF bytecode) with the bpf() syscall", "body": "<p>Needs CAP_BPF (and related capabilities), typically a privileged agent.</p>", "show": ["agent", "ver"], "flow": [["agent", "ver", "#3b82f6", "bpf(PROG_LOAD)"]], "metrics": {"stage": ["load"], "where": ["user → kernel"], "cost": ["-"]}}, {"short": "Verify", "tag": "Verifier", "title": "The verifier proves the program is safe before it runs", "body": "<p>Every path terminates, no out-of-bounds memory access, no unsafe pointer arithmetic, only allowed helpers. Unsafe programs are rejected, so eBPF can't crash the kernel like a buggy module.</p>", "set": {"ver": {"badge": "all paths safe ✓"}}, "metrics": {"stage": ["verify"]}}, {"short": "JIT", "tag": "JIT", "title": "The kernel JIT-compiles it to native machine code", "body": "<p>Runs at near-native speed.</p>", "show": ["agent", "ver", "jit"], "flow": [["ver", "jit", "#a855f7", "bytecode"]], "metrics": {"stage": ["JIT"]}}, {"short": "Attach", "tag": "Attach", "title": "Attach to a hook: tracepoint sched:sched_process_exec (and an LSM hook to block)", "body": "<p>Tracepoints are stable kernel ABI; kprobes can attach to almost any kernel function but may break across versions.</p>", "show": ["agent", "ver", "jit", "hook"], "flow": [["jit", "hook", "#14b8a6", "attach"]], "metrics": {"stage": ["attached"], "where": ["kernel"]}}, {"short": "Fire", "tag": "Event", "title": "Any process runs /bin/sh, the program fires inside the kernel", "body": "<p>It reads PID, parent, UID, filename, cgroup (container) from kernel structures via BTF-aware helpers.</p>", "show": ["agent", "ver", "jit", "hook", "proc"], "flow": [["proc", "hook", "#f59e0b", "execve(\"/bin/sh\")"]], "metrics": {"stage": ["event"], "cost": ["~sub-microsecond"]}}, {"short": "Filter", "tag": "Filter", "title": "Filter in the kernel: drop known-noisy events before they leave", "body": "<p>Huge saving versus shipping everything to user space like auditd.</p>", "set": {"hook": {"badge": "filter: not in allowlist"}}}, {"short": "RB", "tag": "Ring buffer", "title": "Write the event into a ring buffer map", "body": "<p>Shared memory between kernel and agent; ordered, efficient, with back-pressure if the agent falls behind.</p>", "show": ["agent", "ver", "jit", "hook", "proc", "rb"], "flow": [["hook", "rb", "#22c55e", "event"]], "metrics": {"stage": ["ring buffer"]}}, {"short": "Agent", "tag": "User space", "title": "The agent reads events, enriches them (container, image, user) and applies rules", "body": "<p>\"Web server process spawned a shell\" → alert. With an LSM program, it could deny the exec in-kernel.</p>", "flow": [["rb", "agent", "#3b82f6", "read"]], "metrics": {"stage": ["rules + alert", "good"], "where": ["user space"]}}, {"short": "Portable", "tag": "CO-RE", "title": "CO-RE + BTF: one compiled program runs on many kernel versions", "body": "<p>Field offsets are relocated at load time using the running kernel's type information.</p>", "note": {"kind": "key", "text": "eBPF = verified, JIT-compiled programs attached to kernel hooks, sending filtered events through maps/ring buffers. Safe, fast and portable, the modern basis for Linux EDR, observability and networking."}}]}

## From kernel modules to eBPF

> [!STORY] For years, Linux security agents had two choices: the **audit** subsystem, which is safe but verbose and slow under heavy load, or a custom **kernel module** which sees everything but can crash or corrupt the kernel, and must be rebuilt for every kernel version. eBPF changed that. Tools like Falco, Tetragon and the Linux sensors of most modern EDRs now run small, verified programs inside the kernel, collecting exactly the events they need at very low overhead.

## What eBPF is

**eBPF** (extended Berkeley Packet Filter) is a virtual machine inside the Linux kernel. You write small programs (usually restricted C), compile them to BPF bytecode, and load them with the `bpf()` system call. The kernel:

1. **Verifies** the program is safe.
2. **JIT-compiles** it to native code.
3. **Attaches** it to a hook, where it runs on each event.

Programs communicate with user space through **maps**.

## The verifier: why it's safe

The verifier walks every possible path through the program and rejects it unless:

- it always terminates (bounded loops only),
- every memory access is within bounds and to allowed memory,
- pointers aren't leaked or forged,
- only approved **helper functions** and kfuncs for that program type are called,
- the stack stays under its limit (512 bytes).

That's what lets eBPF run in the kernel without the crash risk of kernel modules. The price: programs must be written to satisfy the verifier, which can be fiddly.

## Hook types

| Hook | Attach to | Typical use |
|---|---|---|
| **Tracepoints** | stable, documented kernel events (`sched_process_exec`, `sys_enter_openat`) | portable process/file telemetry |
| **kprobes / fentry** | almost any kernel function entry/exit | deep visibility; may break across kernel versions |
| **uprobes / USDT** | functions in user-space programs and libraries | TLS plaintext from OpenSSL, app tracing |
| **LSM (BPF-LSM)** | Linux Security Module hooks (file open, exec, socket connect) | policy enforcement, **deny** operations |
| **XDP** | network driver, before the kernel stack | DDoS filtering, load balancing at millions of packets/s |
| **tc** | traffic control ingress/egress | packet filtering, Kubernetes networking (Cilium) |
| **cgroup hooks** | per-cgroup socket and device operations | container policy |
| **perf events** | CPU sampling | profiling (flame graphs) |

## Maps and getting data out

Maps are kernel data structures shared with user space: hash maps, arrays, LRU maps, per-CPU maps, and the **ring buffer** for streaming events. Programs also use maps to keep state (e.g. "PIDs we're tracking") and to receive configuration from the agent (allow-lists).

**Filtering in the kernel** is the big win: a sensor can drop 99% of uninteresting events before they're copied to user space.

## CO-RE and BTF

Kernel structures change between versions. **BTF** (BPF Type Format) describes the running kernel's types; **CO-RE** (compile once, run everywhere) lets the loader (libbpf) relocate field accesses at load time. One binary works across many kernels, essential for agents deployed to diverse fleets.

## eBPF for security agents

Compared with the alternatives:

| | auditd | kernel module | eBPF |
|---|---|---|---|
| Safety | high | low (can crash kernel) | high (verifier) |
| Performance | can struggle under load | high | high, with in-kernel filtering |
| Visibility | syscalls, configured rules | anything | most things via hooks |
| Portability | high | rebuild per kernel | high with CO-RE |
| Enforcement | no | yes | yes (LSM hooks, signals) |

Typical sensor events: process exec/exit with full ancestry and container context, file opens/writes on sensitive paths, network connects/accepts with process attribution, privilege changes (setuid, capabilities), module loads, and BPF program loads themselves.

## Limits and risks

- Needs a reasonably modern kernel (5.x+ for most features, BTF availability, BPF-LSM enabled).
- Loading programs requires privilege, and **attackers use eBPF too** (rootkits that hide processes or intercept traffic). Monitor `bpf()` calls and loaded programs (`bpftool prog list`), restrict unprivileged BPF.
- Verifier limits make complex logic awkward; do heavy analysis in user space.
- Kernel probes on hot paths still cost CPU; measure.

> [!RECAP]
> - eBPF runs verified, JIT-compiled programs on kernel hooks; maps share data with user space.
> - The **verifier** guarantees termination and memory safety, no crashing the kernel.
> - Hooks: tracepoints (stable), kprobes (deep), uprobes (user space), **LSM** (enforce), XDP/tc (networking).
> - **Ring buffers** + in-kernel filtering make high-volume telemetry cheap.
> - **CO-RE/BTF** give portability; monitor eBPF itself as an attack surface.

> [!INTERVIEW] For agent/HIDS roles: "Why use eBPF instead of auditd or a kernel module?", "What does the verifier check?", "Tracepoint vs kprobe?", "How would you block an exec with eBPF?", "How do you get events from kernel to user space efficiently?", "How could an attacker abuse eBPF?"

::quiz {"q": "What makes eBPF safer than a kernel module?", "options": ["It runs in user space", "The verifier proves termination and memory safety before the program runs", "It cannot read kernel data", "It is interpreted slowly"], "answer": 1, "explain": "Unsafe programs are rejected at load time."}

::quiz {"q": "Which hook type can deny an operation such as executing a file?", "options": ["Tracepoint", "BPF-LSM", "uprobe", "perf event"], "answer": 1, "explain": "LSM hooks are enforcement points."}

::quiz {"q": "What problem do CO-RE and BTF solve?", "options": ["Encryption", "Running one compiled eBPF program across different kernel versions", "Faster networking", "Container isolation"], "answer": 1, "explain": "Field offsets are relocated at load time."}
