---
title: Debugging a Slow Server in 60 Seconds
summary: A repeatable first-response checklist for a struggling Linux machine — the ten commands that reveal whether the bottleneck is CPU, memory, disk or network — followed by deeper tools (strace, perf, lsof, eBPF) and three worked incidents from symptom to root cause.
---

::widget Scene {"title": "The first 60 seconds on a slow server", "sub": "USE method: utilisation, saturation, errors — in ten commands", "nodes": [{"id": "cpu", "kind": "cpu", "label": "CPU", "x": 0.0, "y": 0.0, "color": "purple"}, {"id": "mem", "kind": "blocks", "label": "Memory", "x": 4.0, "y": -4.0, "count": 9, "color": "teal"}, {"id": "disk", "kind": "disk", "label": "Disk", "x": 8.0, "y": -8.0, "color": "orange"}, {"id": "net", "kind": "router", "label": "Network", "x": 12.0, "y": -12.0, "color": "blue"}, {"id": "app", "kind": "server", "label": "App", "x": 12.82, "y": 0.82, "color": "green"}], "links": [["app", "cpu", {"dashed": true}], ["app", "mem", {"dashed": true}], ["app", "disk", {"dashed": true}], ["app", "net", {"dashed": true}]], "metrics": [["cmd", "Command"], ["saw", "Saw"], ["verdict", "Verdict"]], "steps": [{"short": "Up", "tag": "Load", "title": "uptime: load average 24 on 8 cores", "body": "<p>Load = runnable + waiting-on-disk tasks. Rising: 24, 12, 4 (1, 5, 15 min) means it just got worse.</p>", "show": ["cpu", "mem", "disk", "net", "app"], "metrics": {"cmd": ["uptime"], "saw": ["load 24 / 8 cores"], "verdict": ["overloaded — by what?"]}}, {"short": "Dmesg", "tag": "Errors", "title": "dmesg -T | tail: kernel errors?", "body": "<p>OOM kills, disk errors, network drops show up here first. Nothing today.</p>", "metrics": {"cmd": ["dmesg -T"], "saw": ["clean"]}}, {"short": "Vmstat", "tag": "Overview", "title": "vmstat 1: r = 3, b = 20, wa = 65%", "body": "<p>Few tasks running, many blocked on I/O, CPU mostly waiting for disk.</p>", "set": {"cpu": {"badge": "65% iowait"}}, "metrics": {"cmd": ["vmstat 1"], "saw": ["b=20, wa 65%"], "verdict": ["I/O bound"]}}, {"short": "CPU", "tag": "CPU", "title": "mpstat -P ALL 1: no core is busy", "body": "<p>Rules out CPU saturation.</p>", "set": {"cpu": {"dim": true}}, "metrics": {"cmd": ["mpstat"], "saw": ["cores idle/waiting"], "verdict": ["not CPU"]}}, {"short": "Mem", "tag": "Memory", "title": "free -m: plenty available, no swapping", "body": "<p>\"Used\" memory being high is normal — Linux uses free RAM as page cache.</p>", "set": {"mem": {"dim": true}}, "metrics": {"cmd": ["free -m"], "saw": ["available 9 GB"], "verdict": ["not memory"]}}, {"short": "Iostat", "tag": "Disk", "title": "iostat -xz 1: disk at 100% util, await 180 ms", "body": "<p>Saturated: requests queue for 180 ms each.</p>", "set": {"disk": {"badge": "100% util, 180 ms"}}, "metrics": {"cmd": ["iostat -xz 1"], "saw": ["util 100%"], "verdict": ["disk saturated", "bad"]}}, {"short": "Who", "tag": "Culprit", "title": "iotop / pidstat -d: who is doing the I/O?", "body": "<p>A log-rotation job compressing 40 GB at the same time as the database checkpoint.</p>", "set": {"disk": {"badge": "logrotate + DB"}}, "metrics": {"cmd": ["pidstat -d 1"], "saw": ["gzip 300 MB/s"]}}, {"short": "Net", "tag": "Network", "title": "sar -n DEV 1: network well below capacity", "body": "<p>Rules it out.</p>", "set": {"net": {"dim": true}}}, {"short": "Fix", "tag": "Fix", "title": "Throttle the job (ionice -c3) and move it off-peak", "body": "<p>Load drops back to 3; latency recovers.</p>", "set": {"disk": {"badge": "35% util"}, "cpu": {"dim": false, "badge": null}, "app": {"badge": "p99 normal"}}, "metrics": {"verdict": ["fixed", "good"]}}, {"short": "Method", "tag": "Method", "title": "USE: for every resource, check utilisation, saturation, errors", "body": "<p>A checklist beats guessing.</p>", "note": {"kind": "key", "text": "uptime → dmesg → vmstat → mpstat → pidstat → iostat → free → sar. Find the saturated resource, then the process causing it."}}]}


## "The server is slow"

> [!STORY] At 3 am the on-call engineer gets paged: API latency has tripled. She SSHes into one of the servers. She doesn't guess, and she doesn't restart things at random. She runs the same short list of commands she always runs, reading each one for a few seconds. By the sixth command she's found it: the disk is 100% busy because a log-rotation job is compressing a 30 GB file. She lowers its priority, latency returns to normal, and she writes a ticket to fix the rotation schedule. Total time: four minutes.

The list she used is a famous one, published by Brendan Gregg (then at Netflix) as "Linux performance analysis in 60,000 milliseconds". The idea behind it is the **USE method**: for every resource — CPU, memory, disk, network — check its **U**tilization, **S**aturation (queueing) and **E**rrors.

> [!ANALOGY] A doctor in an emergency room doesn't start with an MRI. They check pulse, breathing, blood pressure and temperature first — fast, cheap measurements that point to which system is in trouble. Then they order the right specialist test. These commands are the vital signs; strace and perf are the MRI.

## The first 60 seconds

```bash
uptime                 # 1. load averages — rising or falling?
dmesg -T | tail        # 2. kernel errors: OOM killer, disk errors, network drops
vmstat 1               # 3. run queue, memory, swap, I/O wait — every second
mpstat -P ALL 1        # 4. per-CPU usage — one core pegged?
pidstat 1              # 5. which processes use the CPU
iostat -xz 1           # 6. per-disk utilization, wait times, queue length
free -h                # 7. available memory, swap usage
sar -n DEV 1           # 8. network throughput per interface
sar -n TCP,ETCP 1      # 9. new connections, retransmits
top                    # 10. overall view to confirm
```

(`sar`, `mpstat`, `pidstat` and `iostat` come in the `sysstat` package.)

::widget Stepper {"type":"hub","title":"What each vital sign tells you","what":"The center is the USE method; each box is a resource, the command that checks it, and the numbers that mean trouble.","steps":["Click the center first.","Click each resource and note the 'trouble' numbers.","For the story above, find which box would have lit up."],"nodes":[["USE method","For every resource, check Utilization (how busy), Saturation (how much work is waiting) and Errors. A resource can be 60% utilized yet saturated in bursts."],["CPU","vmstat's 'r' column (runnable processes) consistently above the CPU count = saturated. mpstat: one core at 100% while others idle = a single-threaded bottleneck. High 'sy' = lots of kernel work (system calls, interrupts)."],["Memory","free: low 'available' and growing swap use = memory pressure. vmstat 'si/so' above zero = actively swapping, which is very slow. dmesg 'Out of memory: Killed process' = the OOM killer struck."],["Disk","iostat: %util near 100 and 'await' (milliseconds per I/O) far above normal = the disk is the bottleneck. vmstat 'wa' (I/O wait) high. Processes in state D in top."],["Network","sar -n DEV: throughput near the interface's limit. sar -n ETCP: retransmits rising = packet loss or congestion. ss -s: connection counts exploding."],["Errors","dmesg for hardware and kernel errors; application logs and journalctl for the app's own errors. Errors often explain everything else."]]}

## Going deeper

Once you know **which** resource, find **who** and **why**:

- **Which files and sockets does a process have open?** `lsof -p PID`; `lsof -i :5432`.
- **What is a process doing right now?** `strace -p PID -f -tt -e trace=network,file` shows its system calls live (OS track, chapter 3). A process stuck on `connect()` or `futex()` tells its own story. (strace slows the process down a lot — use briefly.)
- **Where is the CPU time going?** `perf top` shows the hottest functions live; `perf record -g -p PID` then **flame graphs** visualize whole call stacks.
- **Which process is doing the disk I/O?** `iotop` or `pidstat -d 1`.
- **eBPF tools** (`bcc`/`bpftrace`: `execsnoop`, `opensnoop`, `biolatency`, `tcpretrans`) safely trace the kernel in production with very low overhead.
- **Inside a runtime:** a thread dump (`jstack` for Java), `py-spy dump` for Python, or the language's profiler.

> [!NOTE] **Flame graphs** show every sampled call stack, with width proportional to time spent. Look for the widest "plateaus" at the top — those functions are where your CPU goes. Brendan Gregg invented them, and they're now built into most profilers.

## Three worked incidents

> [!EXAMPLE] **1. The noisy neighbor job.** *Symptom:* API latency triples. `iostat -xz 1` shows the data disk at 99% util with `await` jumping from 2 ms to 180 ms. `pidstat -d 1` shows `gzip` writing 200 MB/s. *Cause:* log rotation compressing a huge file at peak time. *Fix now:* `ionice -c3 -p <gzip pid>` (idle priority). *Fix forever:* rotate hourly, compress off-peak, or ship logs elsewhere.

> [!EXAMPLE] **2. The memory leak.** *Symptom:* a service gets slower over days, then restarts suddenly. `dmesg -T | grep -i oom` shows "Killed process 2231 (java)". `free -h` shows swap in use before the crash. *Cause:* an in-memory cache with no size limit. *Fix:* bound the cache (an LRU — DSA track), set container memory limits with alerting, and take heap dumps to confirm.

> [!EXAMPLE] **3. The single hot core.** *Symptom:* throughput plateaus while overall CPU is only 25% on a 4-core machine. `mpstat -P ALL 1` shows one core at 100%, three nearly idle. *Cause:* a single-threaded process (or one hot lock — OS track, synchronization). *Fix:* run more worker processes, or find the lock contention with `perf`.

## Habits that make the next incident shorter

- Know what **normal** looks like: keep dashboards of these same metrics (Cloud track, chapter 7) so you can compare.
- Change **one thing at a time** and write down what you did, with timestamps.
- **Mitigate first** (lower a job's priority, shift traffic, restart a leaking process), then find the root cause.
- Afterwards, turn the manual investigation into an alert or a runbook.

> [!RECAP]
> - Use the **USE method**: utilization, saturation and errors for CPU, memory, disk and network.
> - The first 60 seconds: `uptime`, `dmesg`, `vmstat`, `mpstat`, `pidstat`, `iostat`, `free`, `sar`, `top`.
> - Trouble signs: run queue above CPU count, swapping, disk `await` and %util high, retransmits, OOM kills.
> - Go deeper with `lsof`, `strace`, `perf` and flame graphs, `iotop`, eBPF tools and runtime profilers.
> - Mitigate first, change one thing at a time, and turn investigations into alerts and runbooks.

> [!INTERVIEW] SRE and senior backend interviews often ask "a server is slow — what do you do?" Show a structured approach (USE), name specific commands and what numbers you'd look for, and distinguish mitigation from root-cause analysis.

::quiz {"q":"vmstat shows the 'r' column steadily at 12 on a 4-CPU machine. What does it suggest?","options":["Disk is the bottleneck","CPU saturation — more runnable work than CPUs","Memory is fine","Network loss"],"answer":1,"explain":"Runnable processes are queueing for CPU time."}

::quiz {"q":"Overall CPU is 25% on 4 cores, but throughput won't increase. What should you check?","options":["Disk space","Per-CPU usage with mpstat — one core may be pegged by a single-threaded process or a lock","DNS","The kernel version"],"answer":1,"explain":"Averages hide a single saturated core."}

::quiz {"q":"Where do you look to confirm the OOM killer stopped your process?","options":["df -h","dmesg or journalctl -k for 'Out of memory: Killed process'","ss -s","crontab -l"],"answer":1,"explain":"The kernel logs every OOM kill."}
