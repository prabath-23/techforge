---
title: What an Operating System Actually Is
summary: Why every computer needs a "manager" program, what that manager does all day, and how the computer stops one badly behaved app from wrecking everything else. Everything else in this track builds on the picture you'll form here.
---

## Start with something you did today

Right now your laptop is probably doing a dozen things at once. A browser with twenty tabs. Music playing. A chat app pinging. Maybe a code editor, a video call, a file syncing to the cloud.

Here's the strange part: your laptop's processor might have only 8 cores, and each core can execute **exactly one instruction at a time**. Your apps don't know about each other. Spotify has no idea Chrome exists. None of them was written to "share nicely". And yet the music doesn't stutter, your typing appears instantly, and a crashing tab doesn't take your whole machine down.

Something is quietly running the show. That something is the **operating system** (OS) — Windows, macOS, Linux, Android, iOS. This chapter explains what it is, what problems it solves, and the one hardware trick that makes it all possible.

> [!ANALOGY] Think of a busy restaurant kitchen. The **stoves and counters** are the hardware (CPU, memory, disk). The **cooks** are your apps — each just wants to cook its own dish. Without a **head chef**, cooks would fight over burners, grab each other's ingredients, and one cook's grease fire would burn down the kitchen. The operating system is that head chef: it decides who gets which burner and for how long, gives each cook their own shelf, and has the authority to throw out a cook who misbehaves.

## First, what does the hardware actually look like?

Before we can understand the manager, we need an honest picture of what's being managed. Strip away the marketing and a computer is three things.

**1. The CPU (processor).** A CPU core is a machine that does one simple loop, billions of times per second:

1. **Fetch** the next instruction from memory.
2. **Decode** it ("add these two numbers", "copy this value", "jump to that place").
3. **Execute** it.
4. Move on to the next instruction.

Which instruction is "next"? The core keeps that address in a tiny storage slot called the **program counter**. The core also has a few dozen other tiny, ultra-fast slots called **registers**, where it keeps the numbers it's working on right now.

> [!TERM] **Register** — a tiny storage slot *inside* the CPU, holding one number (64 bits on modern machines). Reading one takes less than a nanosecond. A CPU core has only a few dozen of them, so they're used for "what I'm working on this very instant".

**2. Memory (RAM).** A huge numbered list of bytes — billions of them. Every byte has an address, like house numbers on a very long street. Programs and their data must be in RAM for the CPU to work on them. RAM is fast compared to a disk, but *slow* compared to the CPU: fetching something from RAM takes about 100 nanoseconds, during which a modern core could have executed hundreds of instructions. (That's why CPUs keep small copies of recently used memory in **caches** right next to the core.)

**3. Devices.** Everything else: SSD, network card, keyboard, screen, GPU, speakers, the clock chip. The CPU sends them commands, and they signal back when something happens ("a key was pressed", "a network packet arrived").

Now the crucial insight:

> [!NOTE] **The CPU has no idea what a "program", "file", "user" or "app" is.** It only knows "execute the instruction at the address in the program counter". Every concept you use daily — apps, windows, files, folders, users, passwords, internet connections — is an illusion carefully constructed by the operating system out of those raw parts.

## What the operating system does all day

Every OS textbook frames it a little differently, but the job boils down to three things.

### Job 1: Sharing — giving every program the illusion of its own computer

Your apps are written as if each one owns the whole machine: its own CPU, its own memory starting at address zero, its own screen. The OS makes that illusion true enough:

- **Sharing the CPU.** The OS lets one program run for a few milliseconds, then pauses it and lets another run, then another — hundreds of times per second. It's so fast that everything *looks* simultaneous, the way a film's 24 still frames per second look like motion. The part of the OS that decides who runs next is the **scheduler** (chapter 5).
- **Sharing memory.** Each program gets its own private **address space** — its own "street" of memory addresses — that no other program can see. Chrome's address 1000 and Spotify's address 1000 are completely different bytes of real RAM. This is **virtual memory** (chapter 6).
- **Sharing devices.** Apps don't talk to the SSD directly; they ask the OS to "open the file `notes.txt`", and the OS figures out which disk blocks that means. Same for the network, the screen and the speakers.

> [!EXAMPLE] Open your Activity Monitor (Mac), Task Manager (Windows) or run `top` (Linux). You'll see hundreds of processes and a CPU usage that adds up across all of them. Every one of those believes it's running continuously. In reality, each gets tiny time slices, handed out by the scheduler.

### Job 2: Coordination — making many things happen at once without chaos

Once lots of things run at the "same" time, they bump into each other. Two programs write to the same file. Two threads update the same bank balance. A network packet arrives in the middle of everything. The OS has to coordinate *its own* internal bookkeeping (which is shared by all CPU cores) and give programs tools to coordinate too — **locks**, **semaphores**, **queues**. That's chapter 8.

### Job 3: Keeping data safe — even when the power goes out

RAM forgets everything when power is cut. The OS organizes the raw storage of an SSD into **files and folders** (a **file system**, chapter 9), and uses careful techniques so that if your laptop dies mid-save, you don't come back to a corrupted disk.

## The big problem: what stops an app from cheating?

Here's a question that should bother you. If the OS is just another program running on the same CPU, what stops Chrome from simply… ignoring it? What stops a buggy game from overwriting the memory where your password manager keeps your passwords? What stops a virus from talking to the disk directly and erasing it?

If the answer were "programs promise to behave", computers would be hopeless. One bug or one malicious app would ruin everything.

The answer is a **hardware feature built into the CPU itself: privilege levels**.

### Two modes: "kernel mode" and "user mode"

The CPU has a switch inside it that says what "mode" it's currently in:

- **Kernel mode** (also called *supervisor mode* or *ring 0*): everything is allowed. The CPU will execute any instruction and touch any memory or device.
- **User mode** (*ring 3*): restricted. Certain dangerous instructions are simply forbidden, and certain memory is off-limits.

The core of the operating system — the part called the **kernel** — runs in kernel mode. Every app you use runs in user mode.

> [!TERM] **Kernel** — the heart of the operating system: the part that runs with full hardware privileges and manages the CPU, memory and devices. "Linux" strictly means the Linux kernel; a full OS like Ubuntu adds tools, libraries and a desktop on top.

What's forbidden in user mode? Things like:

- Turning off interrupts (which would stop the OS from ever regaining control).
- Changing which memory map is active (which would let you see other programs' memory).
- Talking directly to devices like the disk controller.
- Halting the CPU.

If a user-mode program tries one of these, the CPU doesn't execute it. Instead it immediately **stops the program and jumps into the kernel** to report "this program tried something illegal". The kernel typically kills the program. On Linux and macOS you see this as the famous **"Segmentation fault"**; on Windows, "this app has stopped working".

> [!ANALOGY] It's like a hotel. Guests (apps) get a key card that opens **only their own room** and public areas. The hotel staff (kernel) have a master key. A guest can't open another guest's room — not because they promised not to, but because the lock physically won't open. If they try to force a door, security shows up. The *hardware* enforces the rules; nobody has to trust the guests.

Memory is protected the same way. Every chunk of memory carries a flag saying "kernel only" or "user allowed", and the CPU checks it on **every single access**. The kernel's own memory is marked kernel-only, so apps can't read or corrupt it.

### So how does an app ever do anything useful?

If apps can't touch the disk, network or screen, how does Spotify play music or Chrome load a page? They **ask the kernel**, through a tightly controlled doorway called a **system call** (syscall).

A system call is like a bank teller window. You can't walk into the vault yourself. You go to the window, fill in a slip saying exactly what you want ("withdraw ₹500 from account X"), and the teller — who *can* enter the vault — checks you're allowed and does it for you.

Concretely, when Spotify wants to read a song file, it puts a number meaning "read" and the details (which file, where to put the data) into registers, then executes one special instruction (`syscall` on Intel/AMD chips, `svc` on ARM). That instruction does three things at once, in hardware:

1. Switches the CPU from user mode to kernel mode.
2. Jumps to **one fixed entry point** in the kernel that the kernel registered at boot. The app cannot choose where in the kernel it lands — only *which service* it's asking for.
3. Remembers where the app was, so it can resume afterwards.

The kernel checks the request ("does this app have permission to read this file? is the buffer it gave me really its own memory?"), does the work, puts the result in a register, and switches back to user mode — returning to exactly where the app left off.

Step through a real one: a program printing "hi" to the terminal.

::widget Sequence {"title":"What really happens when a program prints \"hi\"","actors":["Your program","C library","CPU","Kernel"],"msgs":[[0,1,"printf(\"hi\")","Your code calls an ordinary library function. Still in user mode — nothing special yet."],[1,1,"prepare: RAX=1 (write), RDI=1 (screen), RSI=address of \"hi\", RDX=2 bytes","The library translates your request into the kernel's format: a service number (1 means 'write' on Linux) and the details, placed into CPU registers."],[1,2,"syscall instruction","The one special instruction. The CPU saves where we were, flips to kernel mode, and jumps to the kernel's single registered entry point."],[2,3,"enter kernel","The kernel saves all of the program's registers so it can restore them later, then looks up service #1: write."],[3,3,"check permissions & copy the 2 bytes","The kernel verifies that the address really belongs to this program (not to the kernel or another app), then copies the bytes safely."],[3,3,"hand bytes to the terminal","The kernel passes 'hi' to whatever 'screen' means for this program — a terminal window, a file, or a pipe into another program."],[3,2,"return 2 (bytes written)","Result goes in a register. The CPU switches back to user mode at exactly the instruction after syscall."],[2,0,"printf returns","Your program continues, unaware of everything that happened — total time: well under a microsecond."]]}

**What you just saw:** the app never touched the terminal. It *asked*, through the one doorway, and the kernel did the work after checking it was allowed. Every file you open, every network request your browser makes, every window that appears on screen goes through this same doorway — Linux has about 450 different system calls.

> [!TRY] On Linux, run `strace ls` in a terminal. You'll see every system call the `ls` command makes — dozens of `openat`, `read`, `write` and `close` calls just to list a folder. On macOS, `sudo dtruss ls` does something similar.

## Three ways into the kernel

A system call is one way the CPU switches into kernel mode. There are exactly three, and it's worth knowing all of them, because together they explain how the OS stays in control:

| Way in | Who causes it | Example |
|---|---|---|
| **System call** | The app, deliberately | "Please read this file." |
| **Exception** (fault) | The app, by accident — its instruction failed | Dividing by zero; touching memory it doesn't own; touching memory that's been temporarily moved to disk |
| **Interrupt** | A hardware device, at any moment | A key was pressed; a network packet arrived; **the timer went off** |

That last one — the timer — is the secret to the whole illusion of multitasking. The kernel programs a hardware timer to "ring" every few milliseconds. When it rings, the CPU is *forced* into the kernel, no matter what the app was doing — even if the app is stuck in an infinite loop. The kernel then decides whether it's time to switch to a different program. Without that timer, one app that never made a system call could hog the CPU forever. (Chapter 3 is all about this.)

> [!EXAMPLE] Ever had an app freeze while the rest of your computer kept working fine — the mouse still moved, other windows still responded? That's the timer interrupt doing its job. The frozen app is stuck, but every few milliseconds the kernel takes the CPU back and gives other programs their turn. In the 1990s, Windows 3.1 and classic Mac OS used *cooperative* multitasking with no such forced switching, and one frozen app really could freeze the entire computer.

## The kernel is not "a program running in the background"

A very common misconception is that the kernel is like any other app, just running quietly in the background. It isn't. The kernel is **code and data that sit in every program's memory map**, marked "kernel only". It runs in three situations:

1. **On behalf of a program**, when that program makes a system call or causes an exception. (So a system call doesn't need to "switch to another program" — the same program simply continues, but in kernel mode.)
2. **When hardware interrupts**, briefly, to handle the event.
3. **In a few helper threads** of its own, which do background housekeeping (like writing cached data to disk).

> [!DEEP] This design is why a 2018 CPU flaw called **Meltdown** was so serious. It let ordinary programs trick some Intel CPUs into speculatively reading kernel memory — which was mapped into every program — before the permission check kicked in. The fix (called KPTI) mostly removed the kernel from programs' memory maps, which made every system call measurably slower. A hardware shortcut became a security hole overnight.

## How big is the kernel, and what's inside?

Where should code like a Wi-Fi driver or a file system live — inside the privileged kernel, or outside it? Different operating systems answer differently:

- **Monolithic kernels** (Linux, and in practice Windows): almost everything lives inside the kernel — scheduler, memory manager, file systems, network stack, device drivers. Parts call each other directly, so it's fast. The downside: a bug in any driver runs with full privileges and can crash the whole machine (the infamous Windows "blue screen" is usually a buggy driver).
- **Microkernels** (QNX in many cars, seL4, MINIX 3 — which runs inside Intel's management chips): the kernel keeps only the bare minimum. Drivers and file systems run as separate, *unprivileged* programs. A crashing driver is just a crashed program that can be restarted. The cost: more back-and-forth messages, so it's slower.
- **Hybrids** (macOS, Windows by design) mix both approaches.

> [!EXAMPLE] In July 2024, a faulty update to the CrowdStrike security driver — which runs *inside* the Windows kernel — crashed about 8.5 million Windows machines worldwide, grounding flights and taking hospitals and banks offline. Because the driver ran in kernel mode, its bug brought down the entire operating system, not just itself. That's the monolithic-kernel trade-off in one news story.

## The full picture

Here are all the layers you'll meet in this track, from your app down to the silicon. Walk through them:

::widget Stepper {"type":"layers","title":"The layers of a running computer","what":"Each band is one layer of software or hardware. Higher layers ask lower layers to do things for them; only the kernel is allowed to touch the hardware.","steps":["Press Play to go from your app down to the hardware.","For each layer, ask: what does it hide from the layer above?","Notice where the line between user mode and kernel mode falls (between layers 3 and 4)."],"nodes":[["1. Your apps (browser, editor, Spotify)","Ordinary programs in <b>user mode</b>. They can compute freely, but can't touch hardware or other programs' memory."],["2. Libraries (the C library, language runtimes)","Friendly wrappers. <code>printf</code>, <code>fopen</code>, Python's <code>open()</code> and Java's <code>FileReader</code> all eventually become system calls."],["3. The system-call doorway","The narrow, guarded entrance into the kernel. About 450 services on Linux: read, write, open, fork, mmap, socket…"],["4. The kernel (kernel mode)","Scheduler, memory manager, file systems, network stack, device drivers. Full hardware access — and responsibility for keeping everyone safe."],["5. Hardware","CPU cores, memory, SSD, network card, timer chip. Executes instructions and enforces the user/kernel boundary on every single access."]]}

## Where this track goes next

Each chapter tackles one of the questions raised above, in the order a computer actually encounters them:

1. **How does the computer start?** Power button to login screen (chapter 2).
2. **How does the kernel take control back?** Interrupts, the timer and system calls in depth (chapter 3).
3. **What exactly is a "running program"?** Processes (chapter 4).
4. **Who runs next?** Threads and scheduling (chapter 5).
5. **How does private memory work?** Virtual memory (chapter 6), and how memory is handed out (chapter 7).
6. **How do parallel things stay correct?** Concurrency (chapter 8).
7. **How are files stored safely?** File systems (chapter 9).
8. **How do programs talk to devices and each other?** I/O and IPC (chapter 10).

> [!RECAP]
> - The **hardware** only executes instructions; apps, files and users are illusions the OS builds.
> - The OS has three jobs: **share** the hardware so each app feels it has its own machine, **coordinate** things happening at once, and **keep data safe**.
> - The **kernel** runs in privileged **kernel mode**; apps run in restricted **user mode**. The CPU itself enforces the difference, so apps can't cheat.
> - Apps get things done by asking the kernel through **system calls** — a single guarded doorway.
> - The kernel regains control through **system calls**, **exceptions** and **interrupts** — and the **timer interrupt** is what makes multitasking unbreakable.

> [!INTERVIEW] "What's the difference between user mode and kernel mode?" and "What happens during a system call?" are classic questions. A strong answer mentions that the CPU enforces privilege in hardware, that syscalls enter the kernel at a fixed entry point chosen by the kernel (not the app), that the kernel validates arguments, and that a syscall is a *mode switch*, not a switch to a different program.

::quiz {"q":"A user-mode program tries to execute an instruction that disables interrupts. What happens?","options":["Interrupts are disabled, but only for that program","The CPU refuses: it traps into the kernel, which usually kills the program","The instruction is silently ignored","The entire computer stops responding"],"answer":1,"explain":"Privileged instructions are blocked in user mode by the CPU itself, which hands control to the kernel to deal with the offender."}

::quiz {"q":"Which of these is NOT a way the CPU switches into the kernel?","options":["A hardware timer interrupt","A program touching memory it doesn't own","Calling an ordinary function in a library","Executing the syscall instruction"],"answer":2,"explain":"A library function call is just a normal jump within user mode. Only when the library executes syscall (or something faults or interrupts) does the CPU enter the kernel."}

::quiz {"q":"Why can a frozen app on a modern OS not freeze the whole computer?","options":["The app politely gives up the CPU","The timer interrupt forces the CPU back into the kernel every few milliseconds, so other programs still get turns","Each app has its own CPU core","The GPU takes over"],"answer":1,"explain":"Preemptive multitasking relies on the timer interrupt; cooperative systems of the 1990s could be frozen by one stuck app."}
