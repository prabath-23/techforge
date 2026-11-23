---
title: Processes — What a "Running Program" Really Is
summary: The difference between a program and a process, everything the OS keeps track of for each one, how new processes are born (fork and exec), how they die (and why "zombies" exist), and what the CPU actually does when it switches from one program to another.
---

::widget Scene {"title": "How a shell runs ls: fork, exec, wait", "sub": "one command, three system calls, a zombie and a reaper", "nodes": [{"id": "sh", "kind": "laptop", "label": "bash (pid 100)", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "ch", "kind": "cpu", "label": "child (pid 101)", "x": 8.72, "y": -1.28, "color": "orange"}, {"id": "k", "kind": "cube", "label": "Kernel process table", "x": 2.83, "y": -7.17, "color": "purple"}, {"id": "out", "kind": "doc", "label": "Terminal", "x": 13.72, "y": -6.28}], "links": [["sh", "ch"], ["sh", "k", {"dashed": true}], ["ch", "out"]], "metrics": [["call", "System call"], ["state", "Child state"]], "steps": [{"short": "Type", "tag": "Start", "title": "You type ls and press Enter", "body": "<p>bash parses the line and finds /usr/bin/ls on PATH.</p>", "show": ["sh"], "metrics": {"call": ["—"], "state": ["—"]}}, {"short": "Fork", "tag": "fork", "title": "fork(): the kernel clones bash", "body": "<p>A new process with a copy of bash's memory, open files and environment. Copy-on-write makes it cheap: pages are shared until someone writes.</p>", "show": ["sh", "ch", "k"], "flow": [["sh", "ch", "#f59e0b", "fork()"]], "set": {"ch": {"badge": "a copy of bash"}}, "metrics": {"call": ["fork()"], "state": ["running bash code"]}}, {"short": "Return", "tag": "fork", "title": "fork returns twice", "body": "<p>In the parent it returns 101 (the child's pid); in the child it returns 0. That's how each knows its role.</p>", "set": {"sh": {"badge": "fork → 101"}, "ch": {"badge": "fork → 0"}}}, {"short": "Redirect", "tag": "Setup", "title": "The child sets up redirections", "body": "<p>For `ls > out.txt` it would open the file and dup2 it onto stdout — before exec, so ls just writes to fd 1.</p>"}, {"short": "Exec", "tag": "exec", "title": "execve(\"/usr/bin/ls\"): replace the program", "body": "<p>Same pid, same open files — brand new code and memory. bash's code in the child is gone.</p>", "set": {"ch": {"label": "ls (pid 101)", "badge": "exec"}}, "metrics": {"call": ["execve()"], "state": ["running ls"]}}, {"short": "Wait", "tag": "wait", "title": "Meanwhile the parent calls waitpid(101)", "body": "<p>bash sleeps until the child finishes. (With `ls &` it wouldn't wait.)</p>", "set": {"sh": {"badge": "waiting"}}, "metrics": {"call": ["waitpid()"]}}, {"short": "Run", "tag": "Run", "title": "ls writes the listing to the terminal", "body": "<p>It inherited bash's stdout.</p>", "show": ["sh", "ch", "k", "out"], "flow": [["ch", "out", "#22c55e", "file names"]]}, {"short": "Exit", "tag": "Exit", "title": "ls calls exit(0)", "body": "<p>Memory and files are released, but a small entry stays in the process table holding the exit status.</p>", "set": {"ch": {"badge": "zombie", "dim": true}}, "metrics": {"call": ["exit(0)"], "state": ["zombie"]}}, {"short": "Reap", "tag": "Reap", "title": "The parent's waitpid returns status 0 and the entry is removed", "body": "<p>bash prints the next prompt. $? is 0.</p>", "flow": [["k", "sh", "#22c55e", "status 0"]], "set": {"ch": {"badge": "reaped"}, "sh": {"badge": null}}, "metrics": {"state": ["gone", "good"]}}, {"short": "Orphan", "tag": "Edge", "title": "If a parent never waits, zombies pile up", "body": "<p>If a parent dies first, its children are re-parented to init (pid 1), which reaps them. Containers need a proper init for this reason.</p>", "note": {"kind": "key", "text": "fork clones, exec replaces, wait reaps. Every command you type follows this pattern."}}]}

## A recipe and a cook

> [!ANALOGY] A **program** is a recipe written in a cookbook: a fixed set of instructions sitting on a shelf. A **process** is someone actually *cooking* that recipe right now — with ingredients on the counter, a pot on the stove, and a finger marking which step they're on. The same recipe can be cooked by three people at once, each at a different step with their own ingredients. Three cooks, one recipe: three processes, one program.

That's the core idea of this chapter:

- A **program** is a file on disk — for example `/Applications/Google Chrome.app` or `/usr/bin/python3`. It's just bytes: machine instructions plus some data. It does nothing by itself.
- A **process** is a program **while it's running**, together with everything the OS keeps track of for it: its memory, where it is in the instructions, which files it has open, who it's running as.

When you open Chrome, the OS creates a process. Open a second Chrome window and Chrome typically creates more processes — usually one per tab — from the very same program file.

> [!TRY] Open Activity Monitor (Mac), Task Manager → Details (Windows) or run `ps aux` (Linux/Mac). Count how many processes are running right now. On a typical laptop it's 300–600. Each has a **PID** (process ID), a unique number the OS uses to identify it. Now open five browser tabs and count again.

## What the OS keeps for every process

For each process, the kernel keeps a record — a **process control block**. On Linux it's a structure called `task_struct`, about 10 kilobytes of bookkeeping per process. It holds everything needed to pause a process and later resume it as if nothing happened:

| What | Why it's needed | Real-life comparison |
|---|---|---|
| **Process ID (PID)** and parent's PID | To identify it and know who created it | Employee ID number |
| **State** — running, ready, waiting, finished | So the scheduler knows whether it can run | "At desk", "on break", "in a meeting" |
| **Saved CPU registers**, including the program counter | To resume exactly where it stopped | A bookmark plus your notes in the margin |
| **Memory map** — which memory belongs to it | Private memory, protected from others | Your own locked desk drawer |
| **Open files and network connections** | So reads and writes go to the right place | The documents currently on your desk |
| **User and permissions** | Decides what it's allowed to touch | Your access badge |
| **Scheduling info** — priority, CPU time used | Fairness between processes (chapter 5) | Timesheet |

> [!NOTE] **Threads** (chapter 5) are a closely related idea: several "cooks" sharing **one** kitchen. Threads of the same process share the memory and open files but each has its own place in the instructions and its own stack. On Linux, each thread actually gets its own `task_struct`; threads of one process simply share the same memory and file tables.

## A process's memory: one private street

Each process gets its own **address space** — its own private "street" of memory addresses that only it can see (chapter 6 explains how the hardware pulls this off). Every process lays out that street the same way. Explore it — call some functions and allocate some memory, and watch the pieces grow:

::widget AddressSpace {"what":"The memory layout of one running process, with high addresses at the top. The stack (for function calls) grows downward; the heap (for memory you allocate) grows upward; the code and global variables sit at the bottom.","steps":["Click “call f()” a few times: each function call adds a stack frame with its local variables.","Keep clicking until the stack overflows — this is what a 'stack overflow' error really is.","Click malloc() to grow the heap, then return/free() to undo."]}

From bottom to top:

- **Code (text).** The program's machine instructions, loaded from the program file. Marked **read-only and executable**, so a bug can't accidentally overwrite the program's own instructions.
- **Data and BSS.** Global variables. Globals with an initial value (`int count = 5;`) are stored in the file; globals that start at zero are just *reserved*, which is why a program can declare a huge zeroed array without the file getting any bigger.
- **Heap.** Memory you ask for while running: `malloc` in C, `new` in Java/C++, every object and list you create in Python or JavaScript. It grows upward as you allocate.
- **Shared libraries and mapped files.** Common code like the C library, loaded once and shared between processes.
- **Stack.** Each function call pushes a **frame** holding its local variables and where to return to; returning pops it. It grows downward. Its size is limited (usually 8 MB on Linux), which is why infinite recursion ends in a **stack overflow**.
- **Kernel memory.** Mapped at the very top of every process but marked kernel-only (chapter 1).

> [!EXAMPLE] **Why can two programs both use address 0x1000?** Because each process has its own street. Address 0x1000 in Chrome and address 0x1000 in Spotify are mapped to completely different places in real RAM. This is also why a bug in one program can't scribble over another program's data: there's simply no address it could write to that reaches the other program's memory.

> [!TRY] On Linux, run `cat /proc/self/maps`. You'll see the actual memory map of the `cat` process that's printing it: where its code is, where its heap and stack are, and which libraries are loaded. Run it twice — the addresses change each time. That's **ASLR** (address space layout randomization), which shuffles the layout so attackers can't predict where things are.

## How a process is born: fork and exec



On Linux and macOS, new processes are created with two system calls that seem odd at first, but turn out to be beautifully flexible.

### fork(): make a copy of me

`fork()` creates a **new process that is an almost-exact copy of the one that called it**: same code, same memory contents, same open files, same position in the program. The original is called the **parent**; the copy is the **child**.

Here's the strange part: `fork()` is called **once** but **returns twice** — once in the parent and once in the child. The return value tells each one who it is: the parent gets the child's PID, and the child gets 0.

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    int apples = 5;
    pid_t pid = fork();                  // after this line, TWO processes are running this code

    if (pid == 0) {                      // I am the child
        apples = 100;
        printf("child: I have %d apples\n", apples);    // 100
        return 0;
    }
    waitpid(pid, NULL, 0);               // I am the parent: wait for my child to finish
    printf("parent: I have %d apples\n", apples);       // still 5!
}
```

The child changed `apples` to 100, but the parent still sees 5. After `fork`, they have **separate copies** of all memory. Changing one doesn't affect the other — just like two cooks following the same recipe in separate kitchens.

### Copy-on-write: how fork avoids copying gigabytes

If a process uses 2 GB of memory, does `fork` copy all 2 GB? That would take ages, and it would be wasted work, because the child usually replaces itself with a different program immediately (see `exec` below).

Instead, the OS uses **copy-on-write**. Right after `fork`, parent and child **share the same physical memory**, and the OS marks all of it read-only for both. As long as they only *read*, they keep sharing. The moment either one *writes* to a piece of memory, the CPU raises a page fault (chapter 3), and the kernel makes a private copy of **just that one 4 KB page** for the writer. Pages nobody writes are never copied.

> [!ANALOGY] Two students share one printed copy of the lecture notes. As long as they only read, one copy is enough. The moment one wants to scribble on page 12, they photocopy *just page 12* and write on their copy. The other 199 pages stay shared.

::widget Stepper {"type":"flow","title":"Copy-on-write, step by step","what":"How one page of memory is shared after fork() and copied only when someone writes to it.","steps":["Press Play.","Watch when the copy actually happens (step 4).","Notice that reading never causes a copy."],"nodes":[["1. Before fork","The parent has a page of memory, say holding the variable apples = 5, at some location in real RAM. It's writable."],["2. fork()","The child gets a copy of the parent's memory map, not of the memory. Both maps point at the SAME physical page, now marked read-only for both. A share counter on the page says 2."],["3. Child reads apples","Reading a read-only page is allowed. No copy, no cost. Both still share."],["4. Child writes apples = 100","Writing to a read-only page makes the CPU raise a page fault. The kernel sees the page is shared, so it copies it (4 KB), points the child at the new copy and makes it writable. The parent still points at the original."],["5. Parent writes later","The parent faults too, but the share counter is now 1 (only the parent uses the original), so the kernel just makes it writable again. No copy needed."]]}

### exec(): become a different program

`exec()` (strictly, `execve`) **replaces the current process's program with a new one**. The process keeps its PID and its open files, but its memory is wiped and refilled with the new program, which starts from the beginning. `exec` never returns on success, because the code that called it no longer exists.

### Together: how every terminal command runs

When you type `ls` in a terminal, the shell does this:

1. **fork** — make a copy of itself.
2. In the child: **exec** the `ls` program. The copy turns into `ls`.
3. In the parent (the shell): **wait** until the child finishes, then show the prompt again.

Why two steps instead of one "start program" call? Because **between fork and exec, the child can set things up**. That's exactly how features like output redirection work. When you type `ls > files.txt`, the child opens `files.txt` and plugs it in as its "standard output" **before** calling exec. `ls` itself has no idea; it just writes to standard output as usual, and the text lands in the file.

```c
// The heart of every Unix shell, simplified
while (1) {
    char *line = read_command();           // e.g. "ls > files.txt"
    pid_t pid = fork();
    if (pid == 0) {                         // child
        int fd = open("files.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
        dup2(fd, 1);                        // make "standard output" (fd 1) point at the file
        execlp("ls", "ls", NULL);          // become ls — its output now goes to files.txt
    }
    waitpid(pid, NULL, 0);                  // parent: wait, then show the prompt again
}
```

> [!NOTE] Windows takes a different approach: one call, `CreateProcess`, creates a process and loads a program in a single step, with a long list of options to configure it. Both designs work; the Unix approach is famous for being small and composable.

## The life of a process

Every process moves through a few states during its life. Click through them:

::widget Stepper {"type":"cycle","title":"Process states","what":"The states a process moves between from creation until it finishes. Arrows show which transitions are possible.","steps":["Press Play to follow one lap of the cycle.","Ask: which states use the CPU? (only Running)","Notice that most processes spend most of their time Waiting."],"nodes":[["New","The process has just been created by fork(); the kernel is still setting up its record and memory map."],["Ready","Able to run, waiting for its turn on a CPU core. The scheduler (chapter 5) picks from these."],["Running","Actually executing on a CPU core. It leaves this state when the timer interrupt says its turn is over (back to Ready), when it has to wait for something (to Waiting), or when it finishes."],["Waiting (blocked)","Sleeping until something happens: a key press, data from the disk or network, a timer. It uses no CPU at all. When the event arrives, it moves back to Ready."],["Zombie","Finished, but its parent hasn't yet collected its exit code. Only a tiny record remains."]]}

> [!EXAMPLE] Look at Activity Monitor or `top`: most of your 400 processes show **0% CPU**. They're in the *Waiting* state — your chat app waiting for a message, the clock widget waiting for the next minute. Only a handful are *Running* or *Ready* at any moment. That's why a laptop can have hundreds of processes and still be fast.

## How a process dies: exit, zombies and orphans

When a process finishes, it calls `exit(code)` (or returns from `main`). By convention, exit code **0 means success** and anything else means some kind of failure. That's how scripts and CI pipelines know whether a step worked.

The kernel immediately frees the process's memory and closes its files, but it **keeps a tiny record** containing the exit code, so the parent can find out how the child ended. The parent collects it by calling `wait()`. Until it does, the finished process is a **zombie**: dead, but not yet fully gone.

> [!ANALOGY] A zombie is like a finished exam paper sitting on the teacher's desk waiting to be collected. The student (process) has left the room; only the paper (exit code) remains. If the teacher (parent) never collects papers, the desk eventually overflows.

Zombies use almost no resources — but each one still holds a **process ID**, and there's a limit on how many PIDs exist. A buggy server that creates child processes and never waits for them can fill the process table, and then no new process can start anywhere on the machine.

**Orphans** are the opposite situation: the **parent** dies first. The kernel then gives the orphaned child to **PID 1** (from chapter 2), which collects its exit code when it finishes. This adoption is part of PID 1's job — and why containers need a proper PID 1, as we saw in the boot chapter.

> [!TRY] Run `ps aux | grep defunct` on Linux. Any processes listed as `<defunct>` are zombies. The fix is never to "kill the zombie" (it's already dead!) — it's to make the parent call `wait()`, or to stop the parent so PID 1 adopts and cleans up its children.

## What happens when the CPU switches from one process to another

Finally, the moment that makes multitasking work: a **context switch**. Say the timer interrupt fires and the scheduler decides process A has had its turn and process B should run. The kernel:

1. **Saves A's state.** A's registers, including its program counter and stack pointer, are stored in A's process control block — its bookmark.
2. **Switches the memory map.** The CPU is told to use B's memory map instead of A's (by loading a special register; on Intel/AMD it's called `CR3`). From this instant, every address the CPU sees refers to B's private street.
3. **Restores B's state.** B's saved registers are loaded back into the CPU.
4. **Returns to user mode** — but into B, at exactly the instruction where B was last paused.

The switch itself takes a few microseconds. The **hidden cost** is bigger: B's data isn't in the CPU's caches (A's data is), and the CPU's address-translation cache was tuned for A (chapter 6). For a short while after each switch, B runs slower while the caches warm up again.

> [!EXAMPLE] This is why high-performance servers like **nginx** or **Redis** avoid having thousands of processes or threads constantly switching. They run roughly one worker per CPU core and handle many connections inside each one (chapter 10 explains how). Fewer switches means warmer caches and more requests per second.

Switching between two **threads of the same process** is cheaper, because they share one memory map, so step 2 is skipped.

> [!TRY] Run `vmstat 1` on Linux and look at the `cs` column: that's how many context switches happen per second. On an idle laptop it's a few hundred to a few thousand; on a busy server it can be hundreds of thousands.

> [!RECAP]
> - A **program** is a file; a **process** is a program running, plus everything the OS tracks for it (PID, state, saved registers, memory map, open files, permissions).
> - Each process has a private **address space**: code, globals, heap (grows up), libraries, stack (grows down).
> - **fork** copies a process (cheaply, thanks to **copy-on-write**); **exec** replaces it with a different program. Shells use fork → set up → exec.
> - Processes move between **Ready, Running and Waiting**; most are Waiting most of the time.
> - A finished process is a **zombie** until its parent collects its exit code with **wait**; **orphans** are adopted by PID 1.
> - A **context switch** saves one process's registers, switches the memory map, and restores another's; its hidden cost is cold caches.

> [!INTERVIEW] Classic questions: *What's the difference between a process and a thread?* (separate vs shared memory; cost of creating and switching). *What does fork return?* *Why is fork fast?* (copy-on-write). *What's a zombie process and how do you get rid of it?* (make the parent call wait, or stop the parent so PID 1 adopts and reaps it). *What happens in a context switch?*

::quiz {"q":"After fork(), the child sets a variable to 100. What value does the parent see?","options":["100 immediately","Its original value — parent and child have separate copies of memory","Undefined","The parent crashes"],"answer":1,"explain":"Copy-on-write gives the child its own copy of any page it writes to."}

::quiz {"q":"A process shows as <defunct> (a zombie). How do you get rid of it?","options":["kill -9 the zombie","Make its parent call wait() — or stop the parent so PID 1 adopts and reaps it","Reboot the computer","Free its memory"],"answer":1,"explain":"A zombie is already dead; it only remains until someone collects its exit code."}

::quiz {"q":"Why is switching between two threads of the same process cheaper than between two processes?","options":["Threads have no registers","They share the same memory map, so the address-space switch is skipped and caches stay useful","Threads run in kernel mode","The scheduler ignores threads"],"answer":1,"explain":"No memory-map switch means less work and warmer caches."}
