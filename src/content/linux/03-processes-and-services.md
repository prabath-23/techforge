---
title: Processes, Jobs and Services — ps, signals and systemd
summary: Seeing what's running with ps and top, what process states and load average really mean, sending signals (and why kill -9 should be your last resort), background jobs, and running your app as a proper service with systemd — automatic restarts, logs with journalctl, and resource limits.
---

## The app that died when the engineer logged out

> [!STORY] An engineer starts the company's API on a new server with `node server.js &` and goes home. Overnight the SSH session times out — and the API dies with it. The next day they use `nohup`; it survives the logout, but when it crashes at 3 am nothing restarts it, and its logs vanish into a file nobody watches. A five-line **systemd** unit file would have handled all three problems: start on boot, restart on crash, collect logs.

## Seeing processes

Every running program is a **process** with a **PID** (process ID), a parent (PPID), an owner and a state (OS track, chapter 4).

```bash
ps aux                          # every process, with CPU%, memory%, command
ps -ef --forest                 # who started whom, as a tree
pgrep -a node                   # find processes by name
top                             # live view; press P (CPU), M (memory), 1 (per-CPU), q (quit)
htop                            # a friendlier top, if installed
```

### Reading the top header

```text
load average: 3.12, 2.80, 1.95
%Cpu(s): 62.0 us, 8.0 sy, 0.0 ni, 25.0 id, 4.5 wa, 0.5 st
MiB Mem :  15890 total,    412 free,   9120 used,   6358 buff/cache
```

- **Load average** (1, 5 and 15 minutes): the average number of processes running or waiting to run (on Linux, also those stuck waiting for disk). Compare it with the **number of CPUs**: a load of 3 on 4 CPUs is fine; on 1 CPU it's overloaded.
- **us / sy**: time in your programs vs in the kernel. **wa**: waiting for disk I/O. **st**: time stolen by other virtual machines on the same host.
- **free** memory being low is normal — Linux uses spare memory as **cache**. Look at **available** memory instead (`free -h`).

### Process states (the S column)

| State | Meaning |
|---|---|
| **R** | Running or ready to run |
| **S** | Sleeping — waiting for something (a network request, a timer). Most processes. |
| **D** | Uninterruptible sleep — usually waiting on disk or network storage. Many D processes means I/O trouble. |
| **Z** | Zombie — finished, but its parent hasn't collected its exit status yet |
| **T** | Stopped (e.g. by Ctrl-Z) |

## Signals: talking to processes

A **signal** is a small notification the kernel delivers to a process.

> [!ANALOGY] Signals are like ways of asking someone to leave a party. **SIGTERM** is a polite "we're closing soon" — they finish their drink, say goodbye and get their coat. **SIGKILL** is a bouncer carrying them out mid-sentence: no goodbye, no coat, and anything they were holding hits the floor.

| Signal | Number | Default effect | Typical use |
|---|---|---|---|
| **SIGTERM** | 15 | Terminate (can be handled) | Ask a program to shut down gracefully — `kill PID`'s default |
| **SIGINT** | 2 | Terminate | What Ctrl-C sends |
| **SIGKILL** | 9 | Kill immediately (can't be caught) | Last resort when a process won't respond |
| **SIGHUP** | 1 | Terminate | Many daemons treat it as "reload your config" |
| **SIGSTOP / SIGCONT** | 19 / 18 | Pause / resume | What Ctrl-Z and `fg` use |

```bash
kill 4821            # polite SIGTERM
kill -HUP 1203       # ask nginx to reload its config
pkill -f "worker.py" # signal by command line
kill -9 4821         # last resort
```

> [!WARN] Go straight to `kill -9` and the program can't flush buffers, finish writing files, close database connections or remove lock files — which can corrupt data. Send SIGTERM, wait a few seconds, then escalate. Your own programs should **handle SIGTERM** by finishing in-flight requests and exiting (Kubernetes sends SIGTERM before killing a pod).

## Jobs in your terminal

```bash
long_task &          # start in the background
jobs                 # list background jobs
fg %1                # bring job 1 to the foreground
Ctrl-Z, then bg      # pause the current job, then continue it in the background
```

Background jobs still belong to your session. For long tasks on a remote server, use **tmux** (or screen): a session that keeps running after you disconnect, and that you can reattach to later. For real services, use systemd.

## Services with systemd

**systemd** is the first process started on most Linux systems (PID 1). It starts everything else and supervises long-running **services**.

```ini
# /etc/systemd/system/api.service
[Unit]
Description=Bookshop API
After=network-online.target

[Service]
User=api
WorkingDirectory=/opt/api
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
Restart=on-failure          # restart if it crashes
RestartSec=2
MemoryMax=1G                # kill it if it exceeds 1 GB (uses cgroups, Cloud track)

[Install]
WantedBy=multi-user.target  # start at boot
```

```bash
sudo systemctl daemon-reload        # after editing unit files
sudo systemctl enable --now api     # start now and at every boot
systemctl status api                # running? recent log lines?
sudo systemctl restart api
journalctl -u api -f                # follow its logs
journalctl -u api --since "1 hour ago" -p err   # only errors from the last hour
```

That one file solves the story: the service runs as its own unprivileged user, starts at boot, restarts on crash, has a memory limit, and its stdout/stderr go to the **journal**, searchable with `journalctl`.

> [!NOTE] systemd can do much more: **timers** (a modern replacement for cron), socket activation, sandboxing options like `ProtectSystem=strict` and `NoNewPrivileges=true`, and dependencies between services.

> [!RECAP]
> - `ps`, `pgrep`, `top`/`htop` show processes; compare **load average** with CPU count; look at **available** memory, not free.
> - States: **R** running, **S** sleeping, **D** stuck on I/O, **Z** zombie.
> - **Signals**: SIGTERM first (graceful), SIGKILL last; SIGHUP often means reload. Handle SIGTERM in your own apps.
> - Use **tmux** for long interactive tasks, **systemd** for services: restart policies, boot start, users, limits, and **journalctl** logs.

> [!INTERVIEW] Common questions: what load average means, SIGTERM vs SIGKILL, what a zombie process is, how to keep a process running after logout, and how you'd run an app as a reliable service on a VM.

::quiz {"q":"A 4-CPU server has a load average of 3.5. Is it overloaded?","options":["Yes, anything over 1 is overloaded","Not necessarily — compare load with the number of CPUs","Load average measures memory","Only if it's over 100"],"answer":1,"explain":"About 4 runnable processes on 4 CPUs means they're all busy but not queueing much."}

::quiz {"q":"Why prefer SIGTERM over SIGKILL?","options":["SIGTERM is faster","SIGTERM lets the program clean up — flush data, close connections — before exiting","SIGKILL is deprecated","They're identical"],"answer":1,"explain":"SIGKILL can't be caught, so nothing gets cleaned up."}

::quiz {"q":"Which systemd setting restarts a service when it crashes?","options":["WantedBy","Restart=on-failure","After=network.target","ExecStart"],"answer":1,"explain":"Combined with enable, it also starts at boot."}
