---
title: Host Intrusion Detection (HIDS): Agents, File Integrity, Log Analysis and Active Response
summary: How a host-based intrusion detection system works end to end: the agent–manager architecture, file integrity monitoring with baselines and real-time hooks, log collection with decoders and rules, rootkit and configuration checks, kernel audit sources (auditd, eBPF, ETW, Sysmon), alert levels and tuning, active response, and how HIDS fits beside EDR and SIEM.
---

::widget Scene {"title": "A HIDS catching a web-shell", "sub": "agent → file integrity + logs → manager rules → alert → active response", "nodes": [{"id": "atk", "kind": "user", "label": "Attacker", "x": 3.72, "y": 3.72, "color": "red"}, {"id": "host", "kind": "server", "label": "Web server + HIDS agent", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "fim", "kind": "doc", "label": "FIM baseline (hashes)", "x": 2.33, "y": -6.67, "color": "orange"}, {"id": "mgr", "kind": "cube", "label": "HIDS manager (decoders + rules)", "x": 13.22, "y": -5.78, "color": "purple"}, {"id": "siem", "kind": "db", "label": "SIEM / dashboard", "x": 14.62, "y": -13.38, "color": "teal"}, {"id": "ar", "kind": "cube", "label": "Active response", "x": 21.44, "y": -6.56, "color": "green"}], "links": [["atk", "host"], ["host", "fim"], ["host", "mgr", {"label": "encrypted events"}], ["mgr", "siem"], ["mgr", "ar"], ["ar", "host", {"dashed": true}]], "metrics": [["signal", "Signal"], ["rule", "Rule / level"], ["action", "Action"]], "steps": [{"short": "Agent", "tag": "Setup", "title": "Each host runs a lightweight agent reporting to a central manager", "body": "<p>The agent collects; the manager analyses. Communication is authenticated and encrypted; agents buffer events if the manager is unreachable.</p>", "show": ["host", "mgr"], "metrics": {"signal": ["-"], "rule": ["-"], "action": ["-"]}}, {"short": "Baseline", "tag": "FIM", "title": "File integrity monitoring: hash watched paths and store a baseline", "body": "<p>/etc, /usr/bin, web roots, config files, hashes, owner, permissions, size. Changes are detected by periodic scans or real-time hooks (inotify, fanotify, Windows file-system events).</p>", "show": ["host", "mgr", "fim"], "set": {"fim": {"badge": "baseline: 18,240 files"}}}, {"short": "Brute", "tag": "Logs", "title": "The attacker brute-forces SSH first", "body": "<p>The agent tails /var/log/auth.log (or journald). Decoders parse lines into fields: srcip, user, program.</p>", "show": ["atk", "host", "mgr", "fim"], "flow": [["atk", "host", "#ef4444", "SSH guesses"], ["host", "mgr", "#a855f7", "auth failures"]], "metrics": {"signal": ["sshd: Failed password ×40"], "rule": ["5716 (level 5)"]}}, {"short": "Correlate", "tag": "Rules", "title": "A frequency rule fires: 8 failures from one IP in 120 s", "body": "<p>Composite rules build on simpler ones: single failure (low) → many failures (high) → success after many failures (critical).</p>", "set": {"mgr": {"badge": "rule 5712: brute force (lvl 10)"}}, "metrics": {"rule": ["5712 (level 10)", "bad"]}}, {"short": "AR1", "tag": "Active response", "title": "Active response blocks the IP for 10 minutes", "body": "<p>The manager tells the agent to run a script (firewall-drop). Responses are time-limited to avoid locking out real users permanently.</p>", "show": ["atk", "host", "mgr", "fim", "ar"], "flow": [["mgr", "ar", "#22c55e", "trigger"], ["ar", "host", "#22c55e", "iptables drop"]], "metrics": {"action": ["IP blocked 600 s", "good"]}}, {"short": "Shell", "tag": "Intrusion", "title": "Later, via a vulnerable upload form, a PHP web-shell lands in /var/www/uploads", "body": "<p>No login involved, log rules alone may miss it.</p>", "flow": [["atk", "host", "#ef4444", "upload shell.php"]], "set": {"host": {"badge": "new file in web root"}}, "metrics": {"signal": ["new file shell.php"]}}, {"short": "FIM", "tag": "FIM alert", "title": "FIM detects a new executable file in the web root", "body": "<p>Real-time monitoring reports who-data (which process/user created it) when the audit subsystem is enabled.</p>", "flow": [["host", "mgr", "#f59e0b", "syscheck: added"]], "set": {"fim": {"badge": "added: shell.php"}}, "metrics": {"rule": ["FIM added file (level 7)"]}}, {"short": "Proc", "tag": "Behaviour", "title": "The web server process spawns /bin/sh", "body": "<p>auditd/eBPF execve events: apache → sh → curl. A rule for \"web server spawning a shell\" fires at high severity.</p>", "flow": [["host", "mgr", "#ef4444", "execve: www-data → sh"]], "metrics": {"signal": ["www-data ran sh, curl"], "rule": ["web shell behaviour (level 12)", "bad"]}}, {"short": "Alert", "tag": "Alert", "title": "Alert to the SIEM with host, file, hash, parent process and rule", "body": "<p>Mapped to MITRE ATT&CK T1505.003 (web shell). The analyst sees the brute force, the file and the shell together.</p>", "show": ["atk", "host", "mgr", "fim", "siem", "ar"], "flow": [["mgr", "siem", "#14b8a6", "high alert"]], "metrics": {"action": ["analyst paged"]}}, {"short": "Contain", "tag": "Respond", "title": "Quarantine the file and isolate the host", "body": "<p>Then investigate the upload bug, check other hosts for the same hash, and restore from known-good images.</p>", "flow": [["ar", "host", "#22c55e", "quarantine + isolate"]], "metrics": {"action": ["contained", "good"]}, "note": {"kind": "key", "text": "HIDS = agent sources (logs, FIM, audit, rootcheck) → manager decoders and rules with levels and correlation → alerts to SIEM → time-boxed active response."}}]}

## What the network couldn't see

> [!STORY] An attacker exploits a file-upload bug in a company's web application and drops a small PHP web-shell. Every request travels inside HTTPS, so the network intrusion detection system sees nothing unusual. What the attacker can't hide is what happens *on the server*: a new file appears in the web root, and the web server process, which normally never starts shells, suddenly runs `/bin/sh` and `curl`. A **host-based** intrusion detection system watches exactly those things.

## HIDS vs NIDS

- **NIDS** (network-based) inspects traffic on the wire. It sees many hosts at once but struggles with encryption and can't see local activity.
- **HIDS** (host-based) runs on each machine and sees files, processes, logs, users and configuration, after decryption, with full local context.

Most organisations use both, plus EDR (chapter 10) and a SIEM (chapter 11).

## Architecture: agents and a manager

Products such as **OSSEC** and its descendant **Wazuh** Tripwire, Samhain and many commercial tools follow a similar design:

- An **agent** on each host collects data, keeps a local queue, and sends events over an authenticated, encrypted channel.
- A central **manager** (server) decodes events, applies rules, stores alerts and triggers responses. Large deployments cluster managers and index alerts in a search backend.
- Agents are **enrolled** with keys; the manager pushes **centralised configuration** to agent groups (web servers, databases, Windows workstations).

Agent design concerns: low CPU and memory, tamper resistance, running with enough privilege to read logs and audit data, safe upgrades, and behaviour when the manager is down (buffer, then flush without flooding).

## Data sources

### 1. Log analysis

The agent reads system and application logs (`/var/log/auth.log`, journald, Windows Event Log, web server logs, database logs). On the manager:

- **Decoders** parse raw lines into fields (timestamp, program, user, source IP, action) using pre-matches and regular expressions.
- **Rules** match decoded fields and assign a **level** (severity, e.g. 0–15). Rules form a tree: a child rule only evaluates if its parent matched, which keeps evaluation fast.
- **Correlation:** frequency and time-window rules ("8 failed logins from the same IP in 120 seconds"), and sequences ("successful login after many failures").

### 2. File integrity monitoring (FIM)

FIM detects unauthorised changes to important files:

1. Build a **baseline** hashes (SHA-256), size, owner, permissions, inode, timestamps, for monitored paths.
2. Detect changes by **scheduled scans** or in **real time** (inotify/fanotify on Linux, file-system notifications on Windows).
3. With **who-data** (via auditd or Windows auditing), record which user and process made the change.
4. Report added, modified and deleted files with diffs for text configuration files.

Tuning is everything: log files and caches change constantly; monitor binaries, configuration, web roots, startup locations and SSH keys, and ignore noisy paths.

### 3. Kernel and audit telemetry

- **Linux:** `auditd` rules (execve, file opens on sensitive paths, privilege changes), or **eBPF** sensors for low-overhead process, file and network events.
- **Windows:** Event Tracing for Windows (ETW), Security event log, and **Sysmon** for detailed process creation, network connections, driver loads and registry changes.

These enable behavioural rules: "a web server process spawned a shell", "a user added an SSH key", "a new service was installed".

### 4. Rootkit and configuration checks

- **Rootcheck** looks for hidden processes (comparing `/proc` with system call results), hidden ports, known rootkit files, and suspicious kernel modules.
- **Security configuration assessment (SCA)** checks hosts against benchmarks such as CIS (password policy, SSH settings, disabled services) and reports compliance.
- **Inventory** of packages, open ports and running processes feeds vulnerability detection (chapter 12).

## Alerts and tuning

A fresh HIDS deployment is noisy. Good practice:

- Start in **monitor mode**; review the top rules by volume weekly.
- Write **local rules** that lower levels for known-benign patterns (a backup job touching files at 2 a.m.), narrowly, by host group and process.
- Map rules to **MITRE ATT&CK** techniques to see coverage gaps.
- Measure precision: alerts that led to action vs ignored.

## Active response

The manager can run commands on agents when rules fire: block an IP with the host firewall, disable a user, kill a process, quarantine a file, or isolate the host. Rules of thumb:

- Make responses **time-limited** and reversible (unblock after 10 minutes).
- Allow-list your own infrastructure (monitoring systems, office IPs) so an attacker can't trick you into blocking them.
- Start with low-risk actions; require human approval for destructive ones.

## HIDS in the bigger picture

HIDS overlaps with **EDR** which adds richer endpoint telemetry, investigation and response at scale. HIDS alerts flow into a **SIEM** for correlation with network, identity and cloud events. FIM and configuration checks also satisfy compliance requirements (PCI DSS requires file integrity monitoring).

> [!RECAP]
> - HIDS watches the host: **logs, file integrity, kernel/audit events, rootkits, configuration**.
> - Agent → encrypted channel → manager with **decoders, rules, levels and correlation**.
> - FIM = baseline hashes + scheduled or real-time detection + who-data; tune noisy paths.
> - Behavioural rules from auditd/eBPF/Sysmon catch attacks logs miss.
> - Active response must be time-limited, allow-listed and reversible.
> - Feed alerts to a SIEM; map coverage to MITRE ATT&CK.

> [!INTERVIEW] With HIDS experience, expect: "How does your agent detect file changes in real time?", "How do decoders and rules work?", "How did you reduce false positives?", "How do you protect the agent from tampering?", "HIDS vs EDR?", "How would you scale the manager to 50,000 agents?"

::quiz {"q": "Why can a HIDS see a web-shell that a network IDS misses?", "options": ["HIDS decrypts all traffic", "It sees files and processes on the host after decryption, like a new file and a web server spawning a shell", "Network IDS is always off", "Web-shells use UDP"], "answer": 1, "explain": "Host context complements network visibility."}

::quiz {"q": "In FIM, what is the baseline?", "options": ["A firewall rule", "Recorded hashes and attributes of monitored files used to detect changes", "A list of users", "The SIEM index"], "answer": 1, "explain": "Later scans compare against it."}

::quiz {"q": "Why should active responses be time-limited?", "options": ["To save disk space", "To avoid permanent self-inflicted outages or being tricked into blocking legitimate systems", "Because rules expire", "Agents can't store state"], "answer": 1, "explain": "Reversible actions limit damage from false positives."}
