---
title: Watching a Live System — /proc, strace, perf and eBPF
summary: How to see what the kernel and your programs are really doing while they run — reading /proc and /sys, tracing system calls with strace, sampling CPU usage with perf and flame graphs, and eBPF, the technology that lets you safely run tiny programs inside the kernel to observe almost anything in production.
---

::widget Scene {"title": "strace: watching a program talk to the kernel", "sub": "why does this app hang on startup?", "nodes": [{"id": "app", "kind": "cpu", "label": "myapp", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "st", "kind": "cube", "label": "strace", "x": 2.64, "y": -6.36, "color": "orange"}, {"id": "k", "kind": "cube", "label": "Kernel", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "fs", "kind": "doc", "label": "Files", "x": 9.0, "y": -9.0}, {"id": "net", "kind": "cloud", "label": "Network", "x": 16.44, "y": -1.56}], "links": [["app", "k"], ["st", "app", {"dashed": true}], ["k", "fs"], ["k", "net"]], "metrics": [["call", "Last syscall"], ["clue", "Clue"]], "steps": [{"short": "Hang", "tag": "Problem", "title": "myapp hangs for 30 s on startup, no logs", "body": "<p>Code is a black box. But every interaction with the world goes through system calls.</p>", "show": ["app", "k"], "metrics": {"call": ["?"], "clue": ["—"]}}, {"short": "Attach", "tag": "Attach", "title": "strace -f -tt -p <pid>", "body": "<p>Uses ptrace to stop at every system call and print it with arguments and timing.</p>", "show": ["app", "k", "st"], "flow": [["st", "app", "#f59e0b", "ptrace"]]}, {"short": "Open", "tag": "Trace", "title": "openat(\"/etc/myapp.conf\") = 3", "body": "<p>Config file found and opened.</p>", "show": ["app", "k", "st", "fs"], "flow": [[["app", "k", "fs"], "#3b82f6", "openat"]], "metrics": {"call": ["openat = 3"]}}, {"short": "ENOENT", "tag": "Trace", "title": "openat(\"/opt/certs/ca.pem\") = -1 ENOENT", "body": "<p>A missing file — a clue, but it carried on.</p>", "flow": [["k", "app", "#ef4444", "ENOENT"]], "metrics": {"call": ["openat = ENOENT"], "clue": ["missing CA file?"]}}, {"short": "Connect", "tag": "Trace", "title": "connect(5, 10.0.3.9:5432) …", "body": "<p>Then nothing for 30 seconds.</p>", "show": ["app", "k", "st", "fs", "net"], "flow": [[["app", "k", "net"], "#f59e0b", "connect…"]], "set": {"net": {"badge": "no reply"}}, "metrics": {"call": ["connect (blocked)"]}}, {"short": "Timeout", "tag": "Trace", "title": "= -1 ETIMEDOUT after 30.0 s", "body": "<p>It's waiting on a database at an old IP. Firewall drops the packets, so it waits for the timeout.</p>", "flow": [["k", "app", "#ef4444", "ETIMEDOUT"]], "metrics": {"clue": ["wrong DB address", "good"]}}, {"short": "Summary", "tag": "Summary", "title": "strace -c gives a per-syscall summary", "body": "<p>Counts and total time per call — e.g. thousands of tiny read() calls show missing buffering.</p>"}, {"short": "Toolbox", "tag": "More tools", "title": "The wider toolbox", "body": "<p>ltrace (library calls), perf (CPU profiles), lsof (open files and sockets), /proc/&lt;pid&gt;/ (status, stack, fds), bpftrace (low-overhead tracing in production).</p>", "note": {"kind": "key", "text": "When a program misbehaves silently, watch its system calls: files it can't find, connections that hang, and where the time goes."}}]}


## The program that was "doing nothing"

> [!STORY] A service takes 30 seconds to start, but its logs show nothing between "starting" and "ready". The CPU is idle. The developers add log lines everywhere and still can't find it. Then someone runs `strace -f -tt` on the startup: the program is calling `connect()` to an old, decommissioned license server, and waiting for the 30-second timeout. Nothing in the code mentioned it — it was inside a third-party library. **The kernel sees every interaction a program has with the outside world**; the tools in this chapter let you see what the kernel sees.

> [!ANALOGY] A program is a sealed factory. Logs are the reports the factory chooses to send you. **Observability tools** are like watching the factory's loading dock (strace: every delivery in and out), timing each machine on the floor (perf: where the time goes), and installing tiny sensors anywhere you like without stopping production (eBPF).

## /proc and /sys: the kernel's live dashboard

`/proc` is a virtual filesystem — nothing is stored on disk; the kernel generates the contents when you read them (chapter 9).

```bash
cat /proc/loadavg                # load averages
cat /proc/meminfo                # detailed memory usage
cat /proc/pressure/cpu           # PSI: how much time tasks waited for CPU (also memory, io)

pid=$(pgrep -n myapp)
cat /proc/$pid/status            # state, memory (VmRSS), threads, capabilities
ls -l /proc/$pid/fd              # every open file and socket
cat /proc/$pid/limits            # resource limits (max open files…)
cat /proc/$pid/stack             # kernel stack: where it's blocked inside the kernel (root)
tr '\0' ' ' < /proc/$pid/cmdline # exact command line
```

Tools like `ps`, `top` and `free` simply read and format these files. `/sys` exposes devices and kernel settings, and **cgroup** files there show a container's actual resource limits and usage.

> [!NOTE] **Pressure stall information (PSI)** in `/proc/pressure/` answers a question load average can't: "what percentage of time were tasks **stalled** waiting for CPU, memory or I/O?" It's one of the best single signals of resource contention, and Kubernetes and systemd use it.

## strace: watching system calls

Every time a program reads a file, opens a connection, allocates memory from the OS or sleeps, it makes a system call (chapter 3). **strace** intercepts and prints each one.

```bash
strace -f -tt -T -e trace=network,file -p 4821
#  -f   follow threads and child processes
#  -tt  timestamps     -T  time spent in each call
#  -e   only network and file-related calls

strace -c ./app        # summary: which syscalls, how many, how much time
```

```text
09:14:02.118 connect(7, {sa_family=AF_INET, sin_port=htons(443), sin_addr=inet_addr("10.2.0.9")}, 16) = -1 ETIMEDOUT <30.004>
09:14:32.130 openat(AT_FDCWD, "/etc/app/license.key", O_RDONLY) = -1 ENOENT (No such file or directory) <0.000021>
```

Typical discoveries: timeouts to forgotten hosts, thousands of tiny `read()` calls (missing buffering), files the program looks for in the wrong place, and lock waits (`futex`).

> [!WARN] Traditional strace uses `ptrace`, which stops the program on **every** system call — it can slow a busy process down 10–100×. Use it briefly, or prefer eBPF-based tools in production.

## perf: where does the CPU time go?

When a program is slow because it's **busy** (not waiting), you need a **profiler**. Linux's **perf** samples what each CPU is executing, thousands of times per second, and counts where the samples land.

```bash
perf top                                   # live: hottest functions across the system
perf record -F 99 -g -p 4821 -- sleep 30   # sample one process's call stacks for 30 s
perf report                                # browse the results
perf stat -e cycles,instructions,cache-misses,branch-misses ./app   # hardware counters
```

Hardware counters connect directly to the Architecture track: instructions per cycle, cache misses (chapter 5) and branch mispredictions (chapter 4).

### Flame graphs

A **flame graph** turns thousands of sampled call stacks into one picture:

::widget Stepper {"type":"layers","title":"How to read a flame graph","what":"A flame graph drawn as layers: the bottom is where every stack starts, and each layer up is a function called by the one below. Width shows how much CPU time a function (and everything it calls) used.","steps":["Press Play from the top (the leaf functions) down to the bottom (main).","Remember: wide means expensive; the x-axis is NOT time order.","Find the wide plateau at the top — that's where the CPU actually spends its time."],"nodes":[["Top edge: json_escape_string — 41% wide","A function at the very top is where the CPU is actually executing. A wide 'plateau' here is the hot spot to optimize."],["serialize_response — 55% wide","Calls json_escape_string and a few other functions. Most of its width is explained by the plateau above."],["handle_request — 80% wide","The request handler; its other children (database calls, logging) are thinner towers beside serialize_response."],["worker_loop — 95% wide","The thread's main loop."],["main / thread start — 100% wide","Every sampled stack starts here, so it spans the full width."]]}

Read it from the **top**: the widest boxes at the top edge are where CPU time is spent. In this example, escaping strings while building JSON takes 41% of the CPU — a clear target. Flame graphs were invented by Brendan Gregg and are now built into most profilers.

> [!NOTE] Profilers for managed runtimes (Java's async-profiler, Go's pprof, Python's py-spy) produce the same kind of flame graphs with your language's function names — usually the first tool to reach for when an app is CPU-bound.

## eBPF: programmable observability inside the kernel

**eBPF** lets you load small, safe programs into the running kernel and attach them to almost any event: a system call, a kernel function, a network packet, a disk I/O, a function inside your application, a CPU timer.

> [!ANALOGY] Adding a sensor to a running engine without stopping it, and with a guarantee the sensor can't damage the engine. The kernel's **verifier** checks every eBPF program before it runs — it must terminate, can't access arbitrary memory, and can't crash the kernel.

How it works:

1. You write a small program (in restricted C, or through higher-level tools).
2. The kernel's **verifier** proves it's safe; a JIT compiler turns it into machine code.
3. It runs on each event, recording data into **maps** (shared key-value tables) that a user-space tool reads.

Because it runs inside the kernel and summarizes data there, overhead is very low — safe for production.

```bash
# Ready-made tools from the bcc / bpftrace collections
execsnoop          # every new process started, with arguments (great for finding hidden scripts)
opensnoop -p 4821  # every file opened by a process
biolatency         # histogram of disk I/O latency
tcpconnect         # every outgoing TCP connection
tcpretrans         # TCP retransmissions as they happen
runqlat            # how long threads wait for a CPU

# bpftrace one-liner: count system calls by process name
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'
```

eBPF also powers much more than debugging: **Cilium** uses it for Kubernetes networking and security policies, Meta and Cloudflare use it for DDoS protection and load balancing at packet speed, and many modern observability and security products (Falco, Pixie, Parca) are built on it.

## Choosing the right tool

| Question | Tool |
|---|---|
| What is it doing right now? Why is it stuck? | `/proc/PID/stack`, `strace -p`, `py-spy dump`, `jstack` |
| Where is CPU time going? | `perf`, language profiler → flame graph |
| Which files, connections, processes is it touching? | `strace`, `lsof`, `opensnoop`, `tcpconnect`, `execsnoop` |
| Is it waiting on disk, CPU or memory? | PSI, `vmstat`, `iostat`, `runqlat`, `biolatency` |
| Something rare in production with low overhead? | eBPF / bpftrace |

> [!RECAP]
> - **/proc** and **/sys** are the kernel's live view: per-process status, open files, limits, kernel stacks, **PSI** pressure.
> - **strace** shows every system call (with timing) — great for hangs and mystery behavior, but slow in production.
> - **perf** samples CPU stacks and hardware counters; **flame graphs** show where time goes (read from the top; width = cost).
> - **eBPF** runs verified, safe programs inside the kernel at almost any event with low overhead — the foundation of modern observability, networking and security tools.

> [!INTERVIEW] Senior and SRE interviews ask how you'd find why a process is slow or hung, what strace shows, how to read a flame graph, and what eBPF is and why it's safe to use in production.

::quiz {"q":"A service hangs at startup with idle CPU. Which tool most directly shows what it's waiting on?","options":["perf top","strace (system calls with timing), or /proc/PID/stack","df","free"],"answer":1,"explain":"An idle, stuck process is usually blocked in a system call."}

::quiz {"q":"In a flame graph, what does a box's width represent?","options":["When the function ran","The share of sampled CPU time spent in that function and everything it called","Memory used","Number of lines of code"],"answer":1,"explain":"The x-axis is not time order."}

::quiz {"q":"Why is eBPF safe to run in a production kernel?","options":["It runs in user space only","A verifier checks each program — it must terminate and can't access arbitrary memory — before it runs","It's read-only","It only runs at boot"],"answer":1,"explain":"Safety is enforced before the program is ever loaded."}
