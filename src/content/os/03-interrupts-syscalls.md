---
title: Interrupts, Exceptions and System Calls: How the Kernel Stays in Charge
summary: How a keypress, a network packet or a ticking timer can pull the CPU away from whatever it's doing; how the kernel handles that without losing the program's place; and what really happens inside a system call. This is the machinery behind "the OS is always in control".
---

## A CPU that only follows instructions has a problem

In chapter 1 we saw that a CPU core does one thing: fetch the next instruction, execute it, repeat. That raises two awkward questions.

**Question 1: How does the computer notice things happening in the outside world?** You press a key. A video call's audio packet arrives from the network. The SSD finishes reading a file. The CPU is busy running some program's instructions, how does it find out?

**Question 2: How does the kernel get the CPU back from a program?** Once the kernel lets a program run, the CPU is executing *that program's* instructions. If the program never asks the kernel for anything, say it's stuck in an infinite loop, how does the kernel ever get to run again?

The answer to both is the same mechanism: **interrupts**.

## Two ways to wait for something: polling and interrupts

> [!ANALOGY] Imagine you're waiting for a parcel. **Polling** is walking to the front door every 30 seconds to check whether it has arrived, you get nothing else done, and most trips are wasted. **Interrupts** are a doorbell: you get on with your work, and when the parcel arrives, the bell *interrupts* you. You go to the door, deal with the parcel, and then return to exactly what you were doing.

Early computers often polled: the CPU kept reading a device's "status" in a loop until it said "ready". That wastes huge amounts of CPU time. Modern computers use the doorbell approach. A device signals the CPU on a dedicated electrical path (or, today, by sending a tiny special message), and the CPU drops what it's doing to handle it.

> [!NOTE] Polling isn't always bad. When events arrive *constantly*, say, millions of network packets per second on a server, ringing the doorbell for each one costs more than just checking in a loop. High-performance network software (like DPDK) deliberately polls, and Linux automatically switches network cards from interrupts to polling under heavy load. Engineering is trade-offs all the way down.

## What exactly happens when an interrupt arrives?

This is the most important sequence in the whole chapter. Picture a program running a long calculation, and you press a key.

1. The keyboard controller signals the CPU: "I have something."
2. The CPU **finishes the instruction it's currently executing** (it never stops halfway through an instruction).
3. Before doing anything else, the CPU **saves the program's place**: where it was (the program counter), its stack location, and its status flags. It saves them on a special, protected **kernel stack** memory the program can't touch.
4. The CPU **switches to kernel mode** and looks up **which kernel function handles keyboard interrupts**. The kernel prepared a table of these handlers at boot (it's called the **interrupt descriptor table** or IDT, think of it as the building's emergency procedures binder: "for fire, do this; for flood, do that").
5. The **interrupt handler** runs: it reads which key was pressed from the keyboard controller and puts it in a queue for whichever app should receive it.
6. The handler finishes with a special "return from interrupt" instruction. The CPU **restores the saved place** and switches back to user mode.
7. The program continues from exactly the next instruction. It never knows it was interrupted.

All of this takes a few microseconds. Step through it:

::widget Sequence {"title":"A network packet arrives while a program is running","actors":["Your program","CPU","Kernel","Network card"],"msgs":[[0,0,"running a calculation (user mode)","Some program is busily computing. It has no idea anything is about to happen."],[3,3,"packet arrives; copied straight into RAM","The network card writes the packet directly into memory that the kernel set aside earlier. This is called DMA (direct memory access): the device copies data without the CPU's help."],[3,1,"'I have something!' (interrupt)","The card raises an interrupt, the doorbell. Each type of interrupt has a number, like a room number on the doorbell panel."],[1,1,"finish current instruction, save program's place","Between two instructions of your program, the CPU saves where it was onto the protected kernel stack."],[1,2,"jump to the network interrupt handler","Switch to kernel mode and run the handler the kernel registered for this interrupt number."],[2,2,"quick work: note the packet, schedule the rest","The handler does the bare minimum, acknowledge the card and note that packets are waiting, then schedules the heavier processing for a moment later."],[2,1,"return from interrupt","Restore the program's saved place and switch back to user mode."],[1,0,"continue exactly where it left off","The program resumes, unaware. If the packet was what some other program (say, your browser) was waiting for, the kernel will now let that program run soon."]]}

**What you just saw:** the device didn't have to wait for the CPU, and the CPU didn't waste time checking the device. The kernel got control briefly, did its job, and gave the CPU back as if nothing happened.

> [!TRY] On Linux, run `cat /proc/interrupts`. You'll see a table of every interrupt source (timer, network card queues, disk, USB…) and how many times each has fired on each CPU core since boot. Run it twice a few seconds apart and watch the numbers climb, thousands per second on a busy machine.

## Why interrupt handlers must be quick: "top halves" and "bottom halves"

While an interrupt handler runs, the CPU can't run the interrupted program, and further interrupts may be held back. A slow handler makes the whole computer feel sluggish: audio crackles, the mouse stutters, packets get dropped.

So operating systems split interrupt work into two parts:

- **The top half** runs immediately, in the interrupt itself. It does the absolute minimum, acknowledge the device, grab any data that would otherwise be lost, and **schedules** the rest. Microseconds.
- **The bottom half** runs shortly after, with interrupts allowed again. It does the heavy lifting, for a network packet, checking the headers, figuring out which connection it belongs to, and waking the program waiting for it.

> [!ANALOGY] A hospital emergency department. The **triage nurse** (top half) sees every arriving patient instantly, but only for a minute: check vital signs, assign a priority, send them to a bed. The **doctors** (bottom half) do the lengthy treatment afterwards. If the triage nurse personally treated every patient, the waiting room would overflow.

## The timer: the interrupt that makes multitasking work

Of all interrupts, one matters most: the **timer interrupt**. During boot, the kernel programs a hardware timer to ring at regular intervals (or at precise moments it chooses).

Every time the timer rings, the kernel gets control, **no matter what the running program is doing** even if it's stuck in `while (true) {}`. The kernel's timer handler:

- updates the clock and how much CPU time each program has used,
- runs any timers that are due ("wake this program in 500 ms"),
- asks the scheduler: **"has the current program had its fair share?"** If yes, it marks the program to be switched out. On the way back from the interrupt, instead of returning to the same program, the kernel **switches to a different one**.

This forced switching is called **preemption** the kernel *preempts* (takes the CPU away from) a program. It's what makes your computer feel responsive even when one app goes haywire.

> [!EXAMPLE] Open a browser console and run `while (true) {}`. That tab freezes (its JavaScript thread is stuck), but your other tabs, your music and your mouse keep working. On a multi-core machine the stuck thread will use 100% of one core, look in Activity Monitor or Task Manager, yet the timer interrupt still lets the kernel share every core with other programs.

> [!DEEP] Older kernels used a fixed "tick", 100, 250 or 1000 times per second. Modern kernels are **tickless**: an idle core sets no timer at all and sleeps deeply, which matters a lot for laptop battery life. A busy core sets the timer only for the next moment something actually needs to happen.

## Exceptions: when the program itself causes the interruption

Interrupts come from outside the program. **Exceptions** are caused by the **instruction the program is executing**. The CPU reacts the same way, save the place, switch to kernel mode, run a handler, but the reason is different:

| Exception | What caused it | What the kernel usually does |
|---|---|---|
| **Divide by zero** | The program divided an integer by 0 | Kills the program (you'll see "Floating point exception" on Linux, a confusingly old name) |
| **Invalid instruction** | The bytes at the program counter aren't a valid instruction | Kills the program |
| **General protection fault** | A forbidden instruction in user mode (chapter 1) | Kills the program |
| **Page fault** | The program touched memory that isn't currently available | **Often fixes the problem and resumes the program!** |

That last row is surprising and important. A page fault is often **not an error at all**. It might mean "this part of the program hasn't been loaded from disk yet" or "this memory was moved to disk to save RAM". The kernel quietly loads the data, then **re-runs the same instruction** which now succeeds. The program never notices. A lot of the magic of virtual memory (chapter 6) is built on page faults. Only when the program touched memory it genuinely has no right to does the kernel give up and send the famous **"Segmentation fault"**.

> [!TERM] **Segmentation fault (segfault)** the error a program gets when it accesses memory it isn't allowed to: following a null pointer, reading past the end of an array into unmapped memory, using memory after freeing it. The name is historical (from an old memory scheme called segmentation), but the mechanism today is a page fault that the kernel decides can't be fixed.

## System calls, in depth

::widget Scene {"title": "What happens inside read(fd, buf, 4096)", "sub": "crossing from user mode into the kernel and back", "nodes": [{"id": "app", "kind": "cube", "label": "Your program (user mode)", "x": 3.1, "y": 3.1, "color": "green"}, {"id": "libc", "kind": "doc", "label": "libc wrapper", "x": 6.5, "y": -0.3}, {"id": "k", "kind": "cube", "label": "Kernel (ring 0)", "x": 9.9, "y": -3.7, "color": "blue"}, {"id": "vfs", "kind": "cube", "label": "Filesystem + page cache", "x": 10.97, "y": -9.42, "color": "purple"}, {"id": "disk", "kind": "disk", "label": "SSD", "x": 18.25, "y": -8.95, "color": "dark"}, {"id": "cpu", "kind": "cpu", "label": "Other process", "x": 15.48, "y": 1.88, "color": "orange"}], "links": [["app", "libc"], ["libc", "k", {"label": "syscall"}], ["k", "vfs"], ["vfs", "disk", {"dashed": true}], ["k", "cpu", {"dashed": true}]], "metrics": [["mode", "CPU mode"], ["state", "Your process"], ["cost", "Cost so far"]], "steps": [{"short": "Call", "tag": "User", "title": "Your code calls read()", "body": "<p>Your program can't touch the disk directly, only the kernel can. It calls the C library function <code>read()</code>, which is just a thin wrapper.</p>", "show": ["app", "libc"], "flow": [["app", "libc", "#22c55e", "read(3, buf, 4096)"]], "metrics": {"mode": ["user"], "state": ["running"], "cost": ["~1 ns"]}}, {"short": "Trap", "tag": "Switch", "title": "The syscall instruction: a controlled door into the kernel", "body": "<p>The wrapper puts the system call number (read = 0 on x86-64 Linux) and arguments in registers and executes <code>syscall</code>. The CPU switches to <b>kernel mode</b> and jumps to the kernel's single, fixed entry point, the program can't choose where to land.</p>", "show": ["app", "libc", "k"], "flow": [["libc", "k", "#f59e0b", "syscall #0"]], "hot": [["libc", "k"]], "metrics": {"mode": ["kernel", "good"], "cost": ["~100 ns"]}}, {"short": "Page cache?", "tag": "Kernel", "title": "The kernel checks its page cache", "body": "<p>The kernel validates the file descriptor and buffer, then asks the filesystem. If the data is already cached in memory, it's copied into your buffer right away, microseconds.</p>", "show": ["app", "libc", "k", "vfs"], "flow": [["k", "vfs", "#3b82f6", "lookup page"]]}, {"short": "Go to disk", "tag": "Block", "title": "Not cached: request the SSD and put the process to sleep", "body": "<p>On a miss, the kernel queues a read to the SSD and marks your process <b>blocked</b>. Rather than waste the CPU for ~100 µs, the scheduler runs another process meanwhile.</p>", "show": ["app", "libc", "k", "vfs", "disk", "cpu"], "flow": [["vfs", "disk", "#a855f7", "read block"], ["k", "cpu", "#f59e0b", "run something else"]], "set": {"app": {"dim": true}}, "metrics": {"state": ["blocked", "bad"], "cost": ["~100 µs"]}}, {"short": "Interrupt", "tag": "Wake", "title": "The SSD finishes and raises an interrupt", "body": "<p>The disk signals completion with an <b>interrupt</b>. The kernel's handler marks the data ready, copies it into the page cache and your buffer, and makes your process <b>runnable</b> again.</p>", "flow": [["disk", "vfs", "#a855f7", "IRQ: done"], ["vfs", "k", "#3b82f6", "4096 bytes"]], "set": {"app": {"dim": false}}, "metrics": {"state": ["runnable"]}}, {"short": "Return", "tag": "User", "title": "sysret: back to user mode with the result", "body": "<p>The kernel returns the number of bytes read (or −1 and <code>errno</code>), switches back to <b>user mode</b>, and your program continues on the next line, unaware of the trip.</p>", "flow": [[["k", "libc", "app"], "#22c55e", "returns 4096"]], "note": {"kind": "key", "text": "System calls are the only door between programs and hardware. Each crossing costs ~100 ns plus the work itself, which is why buffering many small reads into one big one matters."}, "metrics": {"mode": ["user"], "state": ["running", "good"]}}]}


Chapter 1 introduced system calls as the "bank teller window" into the kernel. Now you can see that a system call is really just a **deliberate, polite exception**: the program executes a special instruction whose whole purpose is to enter the kernel.

### The contract between programs and the kernel

On a 64-bit Intel/AMD Linux machine, the rules are fixed and public:

- The program puts the **service number** in the register named `RAX`. Each service has a number: 0 is `read`, 1 is `write`, 2 is `open`, 57 is `fork` (create a new process), 59 is `execve` (run a program), 60 is `exit`.
- It puts up to six **arguments** in other registers (`RDI`, `RSI`, `RDX`, `R10`, `R8`, `R9`).
- It executes `syscall`.
- When control comes back, the **result** is in `RAX`. A negative number means an error (−2 means "no such file", for example), which the C library turns into `-1` plus a readable error code in `errno`.

Here's a complete program that prints a message **without using any library at all** talking straight to the kernel:

```asm
; hello.asm , build: nasm -felf64 hello.asm && ld hello.o -o hello
section .data
msg: db "hello, kernel", 10        ; the text, plus a newline (10)
section .text
global _start
_start:
    mov rax, 1        ; service 1 = write
    mov rdi, 1        ; where: file descriptor 1 = the screen (standard output)
    lea rsi, [msg]    ; what: the address of our text
    mov rdx, 14       ; how many bytes
    syscall           ; ask the kernel
    mov rax, 60       ; service 60 = exit
    xor rdi, rdi      ; exit code 0 ("success")
    syscall
```

Every program you've ever run, in any language, ultimately does this. Python's `print`, Java's `System.out.println` and JavaScript's `console.log` in Node all end up executing a `write` system call.

### The kernel never trusts the program

Look at the `write` call above: the program hands the kernel an **address** (`rsi`) and says "write 14 bytes from here". What if a malicious program passed the address of the **kernel's own memory** hoping the kernel would happily print out its secrets? Or passed an address that doesn't exist, hoping to crash the kernel?

So the kernel treats every pointer from a program as **untrusted**. Before using it, the kernel checks that the address range really belongs to the calling program's own memory, and it copies data with special routines that recover gracefully if the memory turns out to be invalid, returning an error ("bad address") instead of crashing. Modern CPUs even help: a feature called **SMAP** makes it an error for the kernel to accidentally touch user memory outside these careful routines.

> [!ANALOGY] The bank teller doesn't just take your word that "account 4471 is mine". They check your ID against the account before handing over a cent, every time, no exceptions.

### How expensive is a system call?

A simple system call costs roughly **0.1 to 1 microsecond** tiny, but around a hundred times more than an ordinary function call. Since the 2018 Meltdown and Spectre CPU flaws, the protective measures added to every kernel entry and exit made system calls noticeably slower. So performance-critical software avoids making millions of them:

- **The vDSO.** Some calls, most famously "what time is it?", are made so often that Linux maps a small piece of kernel-provided code and a constantly updated clock page directly into every program. Asking the time then needs **no kernel entry at all**.
- **Batching.** Instead of one call per operation, newer interfaces like **io_uring** (chapter 10) let a program submit hundreds of read/write requests at once.

> [!TERM] **Mode switch vs context switch** A system call is a **mode switch**: the *same* program moves from user mode into kernel mode and back. A **context switch** is when the CPU stops running one program and starts running a *different* one (chapter 4). A system call becomes a context switch only if the program has to wait (for example, reading from a network connection that has no data yet) and the kernel runs someone else meanwhile.

## Signals: the kernel interrupting a program

There's one more mechanism worth meeting here, because it looks like an interrupt *for programs*. A **signal** is a small notification the kernel delivers to a process:

- **SIGINT** you pressed Ctrl+C.
- **SIGTERM** "please shut down" (sent by `kill`, by Docker on `docker stop`, by Kubernetes before removing a pod).
- **SIGKILL** "die now"; cannot be caught or ignored.
- **SIGSEGV** you accessed invalid memory (the segfault, delivered as a signal).
- **SIGCHLD** one of your child processes finished.

A program can install a **handler** for most signals. When a signal arrives, the kernel pauses the program wherever it is, runs the handler, then lets it continue. This is how a well-behaved server catches SIGTERM to finish ongoing requests and save its state before exiting, so deploys don't drop customer requests.

> [!EXAMPLE] When Kubernetes replaces a running pod during a deployment, it first sends **SIGTERM** waits (30 seconds by default), and only then sends **SIGKILL**. An app that ignores SIGTERM gets killed mid-request, and users see errors on every deploy. Handling SIGTERM properly is one line of code in most languages, and a surprisingly common production bug when it's missing.

> [!RECAP]
> - **Interrupts** are a doorbell from hardware: the CPU saves the program's place, runs a kernel handler, then resumes the program exactly where it was.
> - Handlers are split into a quick **top half** and a deferred **bottom half** so the system stays responsive.
> - The **timer interrupt** guarantees the kernel regains control every few milliseconds, the basis of **preemptive multitasking**.
> - **Exceptions** are caused by the program's own instructions; a **page fault** is often fixed silently, and only unfixable ones become segfaults.
> - A **system call** is a deliberate entry into the kernel through one fixed doorway; the kernel validates every pointer it receives.
> - **Signals** are the kernel's way of interrupting a program (Ctrl+C, SIGTERM on shutdown).

> [!INTERVIEW] Be able to explain: what happens step by step when an interrupt arrives; how a program stuck in an infinite loop gets preempted (timer interrupt); the difference between an interrupt, an exception and a system call; why interrupt handlers must be short; and mode switch vs context switch. SRE and backend interviews often add: "why should your service handle SIGTERM?"

::quiz {"q":"How does the kernel get the CPU back from a program stuck in an infinite loop that never makes a system call?","options":["The program eventually crashes","The timer interrupt fires, enters the kernel, and the scheduler switches to another program","The CPU detects the loop","It can't, the computer must be restarted"],"answer":1,"explain":"The timer forces entry into the kernel regardless of what the program is doing."}

::quiz {"q":"A program touches a part of its own code that hasn't been loaded from disk yet. What happens?","options":["Segmentation fault","A page fault; the kernel loads the missing data and re-runs the same instruction, invisibly to the program","The CPU skips the instruction","The program is restarted from the beginning"],"answer":1,"explain":"Page faults are often a normal part of operation; only unfixable ones become segfaults."}

::quiz {"q":"Why is a system call a 'mode switch' but not necessarily a 'context switch'?","options":["Because system calls are free","The same program continues, just in kernel mode; a different program runs only if the call has to wait","Because the kernel is a separate program","They are the same thing"],"answer":1,"explain":"Entering the kernel doesn't change which process is running."}
