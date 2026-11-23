---
title: Threads and Scheduling — Who Gets the CPU Next?
summary: Why one program sometimes needs several "workers" inside it (threads), and how the operating system decides, hundreds of times a second, which of hundreds of waiting workers gets to run — from simple queues to the algorithm inside today's Linux.
---

## Two problems, one chapter

This chapter answers two questions that come up the moment you have more work than CPU cores:

1. **How can one program do several things at once?** A music app has to play audio, respond to your clicks *and* download the next song — simultaneously. The answer is **threads**.
2. **When 500 threads want to run and there are only 8 cores, who goes next, and for how long?** The answer is the **scheduler**.

## Part 1: Threads — several workers in one kitchen

> [!ANALOGY] In chapter 4, a **process** was a cook following a recipe in their own kitchen. A **thread** is an extra cook working in the **same kitchen**. They share the fridge, the counters and the pantry (the process's memory and open files), but each has their own hands and their own place in the recipe (their own registers, program counter and stack). Two cooks in one kitchen can chop and stir at the same time — but they'd better not both grab the same knife.

Why would a program want several threads?

- **To stay responsive.** If a photo editor applied a slow filter on the same thread that draws the window, the window would freeze until the filter finished. With two threads, one runs the filter while the other keeps the interface responsive. This is why apps say "Don't block the UI thread".
- **To use several cores.** A single thread can only run on one core at a time. A video encoder with 8 threads can keep all 8 cores busy and finish roughly 8 times faster.
- **To wait efficiently.** A web server handling 100 clients can give each client a thread; while one thread waits for a slow database, others keep serving.

### Threads vs processes

| | Separate processes | Threads in one process |
|---|---|---|
| Memory | Private — completely separate | **Shared** — every thread sees the same variables |
| Talking to each other | Needs special mechanisms (pipes, sockets) | Just read and write shared variables (carefully!) |
| A crash | Kills only that process | Kills **all** threads of the process |
| Cost to create and switch | Higher | Lower |

> [!EXAMPLE] **Chrome uses processes, not just threads, for its tabs — on purpose.** If tabs were threads in one process, one buggy web page could crash every tab, and a malicious page could read another tab's memory (say, your bank). Separate processes make each tab a separate locked room. The cost is extra memory, which is why Chrome is famously memory-hungry. It's a deliberate trade of memory for safety and stability.

### How threads are actually made

On Linux, threads and processes are created by the same system call, `clone`, which takes a list of things the new task should **share** with its creator: memory, open files, and so on. Share nothing and you get a new process (like `fork`). Share almost everything and you get a thread. To Linux, a thread is just a process that shares its kitchen.

Many modern languages add another layer: **lightweight threads** managed by the language itself rather than the OS.

- **Go's goroutines**, **Java's virtual threads** and **Erlang's processes** are tiny (they start with a few kilobytes of stack) and are multiplexed onto a handful of real OS threads by the language's own scheduler.
- That's why a Go server can comfortably run a **million** goroutines, while a million OS threads would exhaust memory.

> [!TERM] **Concurrency vs parallelism.** *Concurrency* is dealing with many things at once — structuring a program as several tasks that can make progress independently (even on one core, by taking turns). *Parallelism* is literally doing many things at the same instant, on several cores. A single-core computer can be concurrent but never parallel.

## Part 2: The scheduler — the CPU's traffic controller

Look at Activity Monitor or `top`: hundreds of threads. Most are asleep, waiting for something (chapter 4). But dozens may be **ready** to run at any moment, and there are only a few cores. Every few milliseconds — and every time a thread blocks or wakes up — the kernel's **scheduler** decides which ready thread runs on which core next.

> [!ANALOGY] The scheduler is like the host at a busy restaurant deciding which waiting party gets the next free table. Seat whoever arrived first? Seat the quick two-person lunch before the twelve-person banquet? Make sure the regulars don't wait forever? Every choice makes someone happier and someone else wait longer.

### What makes a schedule "good"?

There isn't one answer — that's what makes scheduling interesting. Different goals pull in different directions:

- **Response time** — how quickly does something start after you ask? (You press a key; how soon does the letter appear?) This is what makes a computer *feel* fast.
- **Throughput** — how much total work gets done per second? Matters for servers and batch jobs.
- **Fairness** — does everyone get a reasonable share, or can some threads be starved?
- **Low overhead** — every switch between threads costs time (chapter 4), so switching too often wastes the CPU.

Giving each thread tiny turns improves response time but increases switching overhead. Letting threads run longer improves throughput but makes everything feel laggy. Every scheduling algorithm is a different compromise.

## Classic scheduling algorithms, tried for yourself

Use this simulator throughout the next sections. Each colored block in the timeline is one process using the CPU; numbers below are time units.

::widget SchedulerSim {}

### First-Come, First-Served (FCFS)

Run jobs in the order they arrive, each to completion. Like a single supermarket checkout lane.

The problem is the **convoy effect**: you're buying a bottle of water, but you're stuck behind someone with three overflowing carts. Short jobs wait behind long ones, so average waiting time is terrible. Select FCFS in the simulator: P2, P3 and P4 all wait for P1's 7 units even though P3 needs only 1.

### Shortest Job First (SJF)

Always run the job that needs the least time. Supermarkets do a version of this with the "10 items or fewer" lane. It's **mathematically optimal** for average waiting time: finishing short jobs first means fewer people wait.

But there are two catches:

1. **The OS can't see the future.** It doesn't know how long a thread will run before it next blocks. Real systems *estimate* from past behavior ("this thread usually runs for about 2 ms").
2. **Starvation.** If short jobs keep arriving, a long job may *never* run.

**Shortest Remaining Time First (SRTF)** is the preemptive version: if a new job arrives that's shorter than what's left of the current one, switch to it immediately. Compare SJF and SRTF in the simulator.

### Round Robin (RR)

Every ready thread gets a fixed **time slice** (a *quantum*, say 10 ms) in turn. When its slice runs out, it goes to the back of the line. Like a teacher answering students' questions one at a time, giving each student two minutes before moving to the next hand.

Round Robin gives great response time and fairness. The quantum is everything:

- **Too big** and it turns back into FCFS (one long job runs for ages).
- **Too small** and the CPU spends more time *switching* than *working*.

> [!TRY] In the simulator, choose Round Robin, set the context switch cost to 1, and change the quantum from 4 to 1. Watch the red switching blocks multiply and the average turnaround get worse — that's overhead eating your CPU.

### Priority scheduling and the Mars rover that kept rebooting

Some work is more urgent than other work: the audio thread must never miss its deadline, while a background backup can wait. **Priority scheduling** always runs the highest-priority ready thread. To prevent starvation, systems use **aging**: the longer a thread waits, the more its priority rises.

Priority scheduling has a famous trap called **priority inversion**, and it nearly ruined a NASA mission.

> [!STORY] In 1997, NASA's **Mars Pathfinder** landed safely — and then started rebooting itself every few days, losing data each time. The cause: a **low**-priority weather task held a lock on a shared data bus. A **high**-priority task needed that lock, so it waited. Meanwhile **medium**-priority tasks kept running, never letting the low-priority task finish and release the lock. The high-priority task was effectively waiting on medium-priority work it didn't care about. A watchdog timer noticed the critical task wasn't running and reset the whole computer. Engineers on Earth diagnosed it, then uploaded a fix enabling **priority inheritance**: while a low-priority task holds a lock that a high-priority task needs, it temporarily *inherits* the high priority, so it can finish quickly and release the lock.

### Multi-Level Feedback Queue (MLFQ): learning from behavior

How do you get SJF-like results without knowing job lengths in advance? **Watch how each thread behaves, and adjust.** MLFQ keeps several queues at different priorities:

1. New threads start in the top (highest-priority, shortest-slice) queue.
2. A thread that **uses its whole slice** is probably a long-running number-cruncher, so it moves **down** a level.
3. A thread that **gives up the CPU early** (it's waiting for a keypress or the network) is probably interactive, so it **stays high**.
4. Every so often, **boost** everyone back to the top, so long jobs aren't starved forever and threads that change behavior get re-evaluated.

The effect: your text editor (short bursts, lots of waiting) stays at high priority and feels instant, while a video export (always computing) sinks to a lower level and runs whenever nothing interactive needs the CPU. Windows and macOS use variations of this idea.

## How Linux actually does it: fairness by bookkeeping

From 2007 to 2023, Linux used the **Completely Fair Scheduler (CFS)**; since kernel 6.6 it uses **EEVDF**, which builds on the same core idea. That idea is surprisingly simple.

### The core idea: track who's been shortchanged

Imagine an ideal CPU that could run every ready thread at the same time, each at a fraction of full speed. With 4 ready threads, each would get exactly 25% of the CPU, continuously. Real CPUs can't do that, so Linux **keeps score** instead.

Each thread has a number called its **virtual runtime** (`vruntime`): roughly, *how much CPU time it has received so far*. The rule is: **always run the thread with the smallest vruntime** — the one that has been shortchanged the most. As it runs, its vruntime grows, until someone else is now the most shortchanged, and they run next.

> [!ANALOGY] Picture kids taking turns on one swing. A parent keeps a tally of how many minutes each kid has had. Whoever has the lowest tally gets the swing next. Nobody needs a fixed schedule, and nobody can hog it — it's fair by bookkeeping.

To find the smallest vruntime quickly among thousands of threads, Linux keeps ready threads in a **red-black tree** sorted by vruntime (a self-balancing tree, covered in the Data Structures track). The leftmost node is always next.

### Priorities as "weights"

Not all threads deserve equal shares. On Linux you can set a **nice value** from −20 (most important) to +19 (least important). Instead of "always run the most important first", niceness changes the *rate at which vruntime grows*: an important thread's tally grows **slower**, so it comes back to the swing more often. Each step of niceness is roughly a 10% difference in CPU share.

> [!TRY] On Linux or macOS, run a heavy command with lower priority: `nice -n 10 make -j8`. Your desktop stays responsive while the build uses whatever CPU is left over. See the nice values of running processes in the `NI` column of `top`.

### Why interactive apps feel snappy

Your text editor spends almost all its time asleep, waiting for keystrokes. While it sleeps, it accumulates almost no vruntime. When you press a key and it wakes up, it has the *lowest* vruntime around, so it runs **immediately**. CFS doesn't need special rules to detect "interactive" programs; the bookkeeping does it automatically.

**EEVDF** (2023) adds one more idea: each thread also gets a **virtual deadline** based on how long a slice it asked for. Threads that need short, frequent slices (audio, UI) can be served sooner without getting more total CPU — better *latency* while keeping the same *fairness*.

### Real-time scheduling

Some work cannot wait at all: audio playback, robot motor control, a car's braking system. Linux has separate **real-time** scheduling classes (`SCHED_FIFO`, `SCHED_RR`, `SCHED_DEADLINE`) that always beat normal threads. Use them carefully: a buggy real-time thread stuck in a loop can starve everything else on that core.

## Many cores: who runs *where*?

With 8 or 64 cores, the scheduler also decides **which core** runs each thread.

- Linux keeps a **separate run queue for each core**, so cores don't fight over one shared list.
- It **load-balances** periodically, moving threads from busy cores to idle ones. An idle core can also *steal* work.
- It prefers to keep a thread on the **same core**, because that core's caches still hold the thread's data — moving it means a slow, cold start (**cache affinity**).
- On big servers with several CPU sockets, memory attached to one socket is faster for that socket's cores (**NUMA**). The scheduler tries to keep threads near their memory.

> [!EXAMPLE] **Why containers sometimes get mysteriously slow.** In Kubernetes, setting a CPU *limit* of "1 CPU" uses Linux's CFS bandwidth control: the container may use 100 ms of CPU time per 100 ms period. A container with 8 busy threads can burn through those 100 ms in the first 12.5 ms — then it's **frozen** for the remaining 87.5 ms, even if the machine is otherwise idle. Requests that hit that freeze take 80+ ms longer. This "CPU throttling" is one of the most common causes of unexplained latency spikes in Kubernetes, and why many teams set CPU *requests* but no CPU *limits*.

> [!RECAP]
> - **Threads** are multiple workers inside one process, sharing its memory. They make apps responsive and let one program use several cores — at the cost of needing careful coordination.
> - The **scheduler** picks which ready thread runs on which core, trading off response time, throughput, fairness and overhead.
> - **FCFS** suffers the convoy effect; **SJF** is optimal but needs the future; **Round Robin** is fair but sensitive to its time slice; **priority** scheduling needs aging and **priority inheritance** (Mars Pathfinder).
> - **MLFQ** learns from behavior: threads that wait a lot stay high priority.
> - **Linux** runs the thread with the smallest **virtual runtime** (fairness by bookkeeping), weighted by **nice** values; sleepy interactive threads naturally get to run first when they wake.
> - On many cores, the scheduler balances load while trying to keep threads near their cached data.

> [!INTERVIEW] Expect: process vs thread; concurrency vs parallelism; why Round Robin's quantum matters; why SJF is optimal but impractical; priority inversion and its fix (cite Mars Pathfinder); how Linux CFS uses vruntime and a red-black tree; and, for backend/SRE roles, why containers get CPU-throttled.

::quiz {"q":"Why does Chrome run each tab in a separate process rather than as threads of one process?","options":["Processes are faster","A crash or malicious page in one tab can't affect other tabs, because processes don't share memory","Threads can't run JavaScript","To use less memory"],"answer":1,"explain":"Isolation costs memory but buys stability and security."}

::quiz {"q":"In Linux's fair scheduler, which ready thread runs next?","options":["The one with the highest nice value","The one with the smallest virtual runtime — the most shortchanged","The one that arrived first","A random one"],"answer":1,"explain":"The leftmost node of the vruntime-ordered red-black tree."}

::quiz {"q":"What fixed Mars Pathfinder's repeated reboots?","options":["A faster CPU","Enabling priority inheritance, so a low-priority task holding a needed lock temporarily runs at high priority","Removing the weather task","Switching to Round Robin"],"answer":1,"explain":"Priority inheritance resolves priority inversion."}
