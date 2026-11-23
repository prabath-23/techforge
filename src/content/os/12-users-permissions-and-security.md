---
title: Users, Permissions and OS Security
summary: How an operating system decides who may do what — user and group IDs, file permissions and ACLs from the kernel's view, privilege separation and root, capabilities that split root into pieces, mandatory access control (SELinux, AppArmor), seccomp system-call filtering, sandboxing in browsers and phones, and the hardware-backed defenses against memory attacks.
---

## One bug, whole machine

> [!STORY] For decades, a common server setup ran the web server as **root**, the all-powerful administrator account, because it needed to open port 80 (ports below 1024 required root). When a bug in the web server let attackers run their own code, they didn't just control the website — they controlled **the entire machine**: every file, every user's data, the ability to install hidden backdoors. Modern operating systems are built around a simple lesson from those years: **each program should have only the power it needs**, so one bug can't take over everything.

## Users, groups and IDs

The kernel doesn't know names like "asha"; it knows **numbers**:

- Every process runs with a **user ID (UID)** and one or more **group IDs (GIDs)**.
- Every file has an owner UID, a group GID and permission bits (Linux track, chapter 2).
- `/etc/passwd` and `/etc/group` just map numbers to names for humans.

When a process tries to open a file, the kernel compares the process's UID and GIDs with the file's owner, group and permission bits. This check happens **inside the kernel** on every `open()` system call (chapter 3), so a program can't skip it.

> [!ANALOGY] An office building where every employee has a badge number, and every door has a list of which badge numbers and departments may enter. The guard (the kernel) checks the badge at every door, every time. Your name doesn't matter; your badge number does.

**Access control lists (ACLs)** extend the basic owner/group/others model: "also let user 1005 read this file" (`setfacl`, `getfacl`).

## Root and privilege separation

**UID 0 (root)** bypasses most permission checks. Good design keeps root's power as small and short-lived as possible:

- **Drop privileges:** a server starts as root to do one privileged thing (open port 443, read a key file), then switches to an unprivileged user (`setuid()`) for everything else. nginx and OpenSSH work this way.
- **Privilege separation:** split a program into a tiny privileged part and a large unprivileged part that does the risky work (parsing network input). OpenSSH pioneered this: the code that talks to the internet runs as an unprivileged, sandboxed process.
- **sudo** grants specific users specific root commands, with logging.

## Capabilities: splitting root into pieces

Instead of all-or-nothing root, Linux divides root's powers into about 40 **capabilities**:

| Capability | Allows |
|---|---|
| `CAP_NET_BIND_SERVICE` | Bind to ports below 1024 |
| `CAP_NET_ADMIN` | Configure network interfaces, firewall rules |
| `CAP_SYS_ADMIN` | A huge grab-bag of admin operations (mount, and much more) — almost as powerful as root |
| `CAP_CHOWN` | Change file ownership |
| `CAP_SYS_PTRACE` | Debug or inspect other processes |
| `CAP_KILL` | Send signals to any process |

So the web server in the story needs only `CAP_NET_BIND_SERVICE`, not root:

```bash
sudo setcap 'cap_net_bind_service=+ep' /usr/local/bin/myserver
```

Containers use this heavily: Docker drops most capabilities by default, and Kubernetes lets you drop them all (`capabilities: drop: ["ALL"]`) and add back only what's needed (Cloud track).

## Mandatory access control: rules even root must follow

Normal permissions are **discretionary**: a file's owner decides who can access it. **Mandatory access control (MAC)** adds system-wide policies that programs — even root processes — can't override.

- **SELinux** (Red Hat, Android): labels every process and file with a type ("httpd_t", "httpd_sys_content_t") and allows only interactions the policy lists. A compromised web server can read web content but not `/home` or `/etc/shadow`, even as root.
- **AppArmor** (Ubuntu, Debian): path-based profiles per program — "this program may read `/etc/nginx/**`, write `/var/log/nginx/*`, nothing else".

> [!WARN] When SELinux blocks something, the first instinct is often `setenforce 0` (turn it off). That removes a whole layer of protection. Check the audit log (`ausearch -m avc`), then fix the file label or policy instead.

## seccomp: limiting system calls

Every interaction with the kernel is a system call (chapter 3). Most programs use only a few dozen of the ~350 available. **seccomp** lets a process install a filter: "from now on, I may only use these system calls" — anything else kills the process or returns an error.

- Docker applies a default seccomp profile blocking around 50 dangerous calls.
- Chrome's renderer processes and many server sandboxes use strict seccomp filters.
- It shrinks the **attack surface**: a kernel bug in a system call the program can't make can't be exploited through it.

## Sandboxing: browsers and phones

Modern platforms combine all these layers.

::widget Stepper {"type":"layers","title":"How a browser tab is sandboxed","what":"The layers of protection around a web page in a modern browser like Chrome. Malicious code must break through every layer to reach your files.","steps":["Press Play from the outside in.","For each layer, ask: what would an attacker who broke the layer above still be unable to do?","Notice that the renderer can't open files or network connections itself — it must ask the browser process."],"nodes":[["The browser process","Has your normal user permissions: can read files, use the network, show the UI. Runs no web page code itself."],["Site isolation","Each website runs in its own renderer process, so a malicious site can't read another site's memory (important since Spectre — Architecture track)."],["Renderer sandbox","The process that runs a page's HTML and JavaScript has almost no rights: no file access, no direct network, a strict seccomp filter, its own namespaces. To do anything, it asks the browser process over IPC, which checks the request."],["JavaScript engine","Runs the page's code with memory safety checks; bugs here are what attackers usually exploit first."],["The web page","Untrusted code from the internet. To harm you, an attacker typically needs a bug in the JavaScript engine AND a second bug to escape the sandbox — a 'chain', which is why these exploits are rare and valuable."]]}

Phones go further: **every app** is its own user ID (Android) or sandbox container (iOS), can only see its own files, and must ask the user for permissions like camera, location and contacts.

## Hardware help against memory attacks

Many attacks exploit memory bugs in C and C++ code (Architecture track, chapter 3). Modern OSes and CPUs make them much harder:

- **NX / DEP:** memory pages are either writable **or** executable, never both, so injected data can't be run as code.
- **ASLR:** program, library, stack and heap addresses are randomized on every run, so attackers can't predict where to jump.
- **Stack canaries:** a secret value before the return address; if a buffer overflow changes it, the program aborts.
- **Control-flow integrity, shadow stacks** (Intel CET) and **pointer authentication** (ARM PAC): the hardware checks that returns and indirect jumps go where they should.
- **Memory tagging** (ARM MTE): each memory allocation gets a tag, and pointers must carry the matching tag — catching use-after-free and overflow bugs.
- **Memory-safe languages** (Rust, Go, Java, Swift) remove whole classes of these bugs; Android, Windows and Linux are adding Rust code for exactly this reason.

> [!RECAP]
> - The kernel identifies processes by **UID/GID** and checks permissions on every system call; **ACLs** add finer rules.
> - **Root** is dangerous: drop privileges, separate privileged code, use **sudo**.
> - **Capabilities** split root into pieces (e.g. only bind low ports); containers drop most of them.
> - **SELinux/AppArmor** enforce mandatory policies even root can't bypass; **seccomp** limits which system calls a process may make.
> - Browsers and phones layer these into **sandboxes**; hardware features (**NX, ASLR, canaries, CET, PAC, MTE**) and **memory-safe languages** blunt memory attacks.

> [!INTERVIEW] Security-minded systems questions: why not run services as root, what Linux capabilities are, what seccomp does, how a browser sandbox works, and what ASLR and NX defend against.

::quiz {"q":"A web server needs to listen on port 443 but nothing else privileged. What's the least-privilege option?","options":["Run it as root","Grant only CAP_NET_BIND_SERVICE (or bind as root then drop privileges)","Disable SELinux","Make the binary setuid root"],"answer":1,"explain":"Give exactly the one power it needs."}

::quiz {"q":"What does seccomp do?","options":["Encrypts files","Restricts which system calls a process is allowed to make","Randomizes addresses","Manages users"],"answer":1,"explain":"It shrinks the kernel attack surface available to a compromised process."}

::quiz {"q":"What does ASLR make harder for an attacker?","options":["Guessing passwords","Predicting the memory addresses of code and data to jump to","Reading files","Sending network packets"],"answer":1,"explain":"Addresses change on every run."}
