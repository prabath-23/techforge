---
title: Windows Internals for Security Engineers: Processes, Tokens, Registry, Services and ETW
summary: The Windows concepts detection and endpoint engineers need: processes, threads and handles, access tokens, integrity levels and UAC, privileges like SeDebugPrivilege, LSASS and credentials, services and drivers, the registry and persistence locations, DLL loading and hijacking, Event Tracing for Windows, Sysmon and the Security log events that matter.
---

::widget Scene {"title": "Persistence on Windows: where malware hides to survive reboot", "sub": "an attacker sets three persistence mechanisms; Sysmon events reveal each", "nodes": [{"id": "mal", "kind": "cpu", "label": "Malware (user context)", "x": 3.72, "y": 3.72, "color": "red"}, {"id": "run", "kind": "doc", "label": "HKCU\\...\\Run key", "x": 2.83, "y": -7.17, "color": "orange"}, {"id": "task", "kind": "doc", "label": "Scheduled task", "x": 8.72, "y": -1.28, "color": "orange"}, {"id": "svc", "kind": "doc", "label": "Service (needs admin)", "x": 14.61, "y": 4.61, "color": "orange"}, {"id": "sysmon", "kind": "cube", "label": "Sysmon / ETW", "x": 13.72, "y": -6.28, "color": "purple"}, {"id": "siem", "kind": "db", "label": "SIEM", "x": 18.22, "y": -10.78, "color": "teal"}], "links": [["mal", "run"], ["mal", "task"], ["mal", "svc"], ["run", "sysmon", {"dashed": true}], ["task", "sysmon", {"dashed": true}], ["svc", "sysmon", {"dashed": true}], ["sysmon", "siem"]], "metrics": [["tech", "Technique"], ["event", "Telemetry"], ["note", "Note"]], "steps": [{"short": "Foothold", "tag": "Start", "title": "Malware runs as the user at medium integrity", "body": "<p>It wants to survive a reboot.</p>", "show": ["mal"], "metrics": {"tech": ["-"], "event": ["-"], "note": ["standard user token"]}}, {"short": "Run", "tag": "Run key", "title": "Writes HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater", "body": "<p>Runs at every logon. No admin needed.</p>", "show": ["mal", "run"], "flow": [["mal", "run", "#ef4444", "RegSetValue"]], "metrics": {"tech": ["T1547.001 Run keys"], "event": ["Sysmon 13 (registry value set)"]}}, {"short": "Task", "tag": "Scheduled task", "title": "Creates a scheduled task that runs every hour", "body": "<p>schtasks /create or the COM API.</p>", "show": ["mal", "run", "task"], "flow": [["mal", "task", "#ef4444", "create task"]], "metrics": {"tech": ["T1053.005 Scheduled task"], "event": ["Security 4698, TaskScheduler 106"]}}, {"short": "Elevate", "tag": "Privilege", "title": "Tries to install a service, fails without admin", "body": "<p>Services run as SYSTEM; creating one needs an administrator token (and UAC elevation for an admin user).</p>", "show": ["mal", "run", "task", "svc"], "set": {"svc": {"badge": "access denied"}}, "metrics": {"note": ["UAC: admin needs high integrity"]}}, {"short": "Service", "tag": "Service", "title": "After stealing admin credentials, it creates a service", "body": "<p>Runs as SYSTEM at boot.</p>", "flow": [["mal", "svc", "#ef4444", "CreateService"]], "set": {"svc": {"badge": "installed (SYSTEM)"}}, "metrics": {"tech": ["T1543.003 Windows service"], "event": ["System 7045, Security 4697"]}}, {"short": "Sensor", "tag": "Telemetry", "title": "Sysmon and ETW record each change with process, user and command line", "body": "<p>Process creation (Sysmon 1 / Security 4688 with command lines), registry (12–14), network (3), image loads (7).</p>", "show": ["mal", "run", "task", "svc", "sysmon"], "flow": [["run", "sysmon", "#a855f7", ""], ["task", "sysmon", "#a855f7", ""], ["svc", "sysmon", "#a855f7", ""]]}, {"short": "Detect", "tag": "Detect", "title": "SIEM rules: unsigned binary in AppData added to a Run key; service from a temp path", "body": "<p>Plus baselining: new autoruns compared to the fleet.</p>", "show": ["mal", "run", "task", "svc", "sysmon", "siem"], "flow": [["sysmon", "siem", "#14b8a6", "events"]], "metrics": {"note": ["3 persistence alerts", "good"]}}, {"short": "Hunt", "tag": "Hunt", "title": "Hunt with Autoruns-style inventories across all hosts", "body": "<p>Rare entries (seen on 1 of 20,000 machines) are worth a look.</p>", "note": {"kind": "key", "text": "Persistence lives in Run keys, scheduled tasks, services, WMI subscriptions and startup folders. Log registry, task and service creation with process context, and baseline what's normal."}}]}

## Why endpoint engineers need Windows internals

Most corporate endpoints run Windows, and most intrusions pass through it: phishing on a laptop, credential theft from memory, lateral movement to servers, domain takeover. Whether you're writing an EDR sensor, HIDS rules or SIEM detections, you need to know what's normal on Windows, and what attackers abuse.

## Processes, threads and handles

- A **process** has a virtual address space, an **access token** (its security identity), a handle table and one or more **threads**.
- Every process has a **parent**; parent–child relationships (Word → PowerShell) are the backbone of behavioural detection. Parent PIDs can be spoofed, sensors record the real creator too.
- **Handles** are references to kernel objects (files, registry keys, processes). Opening a handle to another process with `PROCESS_VM_READ` is how credential dumpers read LSASS memory.

## Tokens, integrity levels and UAC

An **access token** holds the user SID, group SIDs, **privileges** and an **integrity level**:

- **Integrity levels:** Low (sandboxed apps like browser renderers), Medium (normal user processes), High (elevated admin), System. A lower-integrity process can't write to higher-integrity objects.
- **UAC:** administrators run with a filtered medium-integrity token; elevation ("Run as administrator") gives a high-integrity token. UAC is a convenience boundary, not a strong security boundary, many bypasses exist.
- **Privileges** like `SeDebugPrivilege` (open any process), `SeImpersonatePrivilege` (impersonate clients, abused by "potato" attacks from service accounts), `SeBackupPrivilege` (read any file) are powerful and watched.
- **Impersonation:** services temporarily act as a client user.

## LSASS and credentials

The **Local Security Authority Subsystem (lsass.exe)** handles logons and caches credential material (NTLM hashes, Kerberos tickets) in memory. Dumping LSASS memory (Mimikatz, procdump) is a top attacker goal. Defences: **Credential Guard** (isolates secrets with virtualisation-based security), **LSA protection** (RunAsPPL), EDR rules on handle access to LSASS, and avoiding admin logons to untrusted machines.

## Services and drivers

- **Services** are background processes managed by the Service Control Manager, often running as **SYSTEM**. Creating one needs admin rights, and it's a classic persistence and lateral-movement method (PsExec creates a service remotely).
- **Drivers** run in the kernel. Attackers load vulnerable signed drivers ("bring your own vulnerable driver") to kill EDR processes. Microsoft's vulnerable driver blocklist and HVCI help.

## The registry

A hierarchical database of configuration: `HKLM` (machine), `HKCU` (current user), with hives stored on disk. Security-relevant locations:

- **Run / RunOnce** keys, programs started at logon.
- **Services** `HKLM\SYSTEM\CurrentControlSet\Services`.
- **Image File Execution Options** (debugger hijacking), **AppInit_DLLs** **Winlogon** shell/userinit values.
- COM object registrations (**COM hijacking**).

## Persistence mechanisms to know

Run keys and startup folder, scheduled tasks, services, WMI event subscriptions, COM hijacking, DLL search-order hijacking, logon scripts, browser extensions, and Office add-ins. Sysinternals **Autoruns** lists them all, the same inventory is worth collecting fleet-wide.

## DLL loading and hijacking

When a program loads a DLL by name, Windows searches a sequence of directories. If an attacker can place a DLL with the expected name earlier in the search path (the application's folder, for example), the program loads it, **DLL search-order hijacking** and **side-loading** (a legitimate signed EXE loading a malicious DLL beside it). Detect via image-load events of unsigned DLLs from user-writable paths.

## Telemetry sources

- **Security event log** (with audit policy configured): 4624/4625 logons, 4672 special privileges, 4688 process creation (enable command-line logging), 4697/7045 service installs, 4698 scheduled tasks, 4720 account created, 4769 Kerberos service tickets.
- **Sysmon** (free, Sysinternals): 1 process create (with hashes and parent), 3 network connection, 7 image load, 8 CreateRemoteThread, 10 process access (LSASS!), 11 file create, 12–14 registry, 22 DNS query. Driven by an XML config, community configs are a good start.
- **ETW** the kernel's high-performance tracing framework; EDRs subscribe to providers (including the Threat-Intelligence provider for memory operations, available to protected anti-malware processes).
- **PowerShell logging** script block logging (4104) captures de-obfuscated script content; AMSI lets security products scan scripts at runtime.

> [!RECAP]
> - Processes have tokens, handles and parents, parent-child chains drive detection.
> - Integrity levels and privileges define what a process can do; UAC isn't a hard boundary.
> - LSASS holds credentials: protect it (Credential Guard, PPL) and alert on access.
> - Services, drivers, registry Run keys, tasks, WMI and COM are persistence points.
> - DLL hijacking abuses search order; watch unsigned image loads from writable paths.
> - Collect Security events, **Sysmon** ETW and PowerShell logs with good configs.

> [!INTERVIEW] "How would you detect credential dumping?", "What are integrity levels?", "List five persistence techniques and how you'd detect them", "What does Sysmon event 10 show?", "How does DLL side-loading work?", "What is ETW and why do EDRs use it?"

::quiz {"q": "What do attackers usually need to dump credentials from LSASS?", "options": ["Nothing", "A handle to lsass.exe with memory-read access, typically requiring admin/SeDebugPrivilege", "Internet access", "A browser"], "answer": 1, "explain": "Alert on unusual process access to LSASS."}

::quiz {"q": "Which is a persistence mechanism that needs no admin rights?", "options": ["Installing a driver", "HKCU Run key", "Creating a service", "Editing HKLM"], "answer": 1, "explain": "Per-user Run keys are writable by the user."}

::quiz {"q": "Which Sysmon event records one process opening another (e.g. LSASS access)?", "options": ["Event 1", "Event 3", "Event 10", "Event 22"], "answer": 2, "explain": "ProcessAccess."}
