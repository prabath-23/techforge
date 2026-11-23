---
title: Multicore, Cache Coherence and Memory Ordering
summary: What happens when several cores share memory — how caches stay consistent (the MESI protocol), why the hardware and compiler can reorder your memory operations, memory models and the happens-before relationship, atomics and memory barriers, how locks are actually built, NUMA, and Amdahl's law on the limits of parallel speedup.
---

::widget Scene {"title": "Multicore and Amdahl's law", "sub": "a 10-minute job on 1, 2, 8 and 64 cores", "nodes": [{"id": "job", "kind": "cells", "label": "job: 90% parallel, 10% serial (minutes)", "x": 3.1, "y": 3.1, "values": ["serial 1", "parallel 9"]}], "metrics": [["cores", "Cores"], ["time", "Time"], ["speed", "Speed-up"]], "steps": [{"short": "One", "tag": "Baseline", "title": "1 core: 1 min serial + 9 min parallel = 10 min", "body": "<p>The serial part (reading input, merging results) can't be split.</p>", "set": {"job": {"marks": {"0": "red", "1": "blue"}, "ptr": {}}}, "metrics": {"cores": ["1"], "time": ["10 min"], "speed": ["1×"]}}, {"short": "Two", "tag": "Scale", "title": "2 cores: 1 + 4.5 = 5.5 min", "body": "<p>1.8× faster — not 2×.</p>", "set": {"job": {"marks": {"0": "red", "1": "blue"}, "ptr": {}, "values": ["serial 1", "parallel 4.5"]}}, "metrics": {"cores": ["2"], "time": ["5.5 min"], "speed": ["1.8×"]}}, {"short": "Eight", "tag": "Scale", "title": "8 cores: 1 + 1.1 = 2.1 min", "body": "<p>4.7×. The serial minute is now half the time.</p>", "set": {"job": {"marks": {"0": "red", "1": "blue"}, "ptr": {}, "values": ["serial 1", "parallel 1.1"]}}, "metrics": {"cores": ["8"], "time": ["2.1 min"], "speed": ["4.7×"]}}, {"short": "SixtyFour", "tag": "Scale", "title": "64 cores: 1 + 0.14 = 1.14 min", "body": "<p>8.8×. 56 extra cores bought very little.</p>", "set": {"job": {"marks": {"0": "red", "1": "blue"}, "ptr": {}, "values": ["serial 1", "parallel 0.14"]}}, "metrics": {"cores": ["64"], "time": ["1.14 min"], "speed": ["8.8×", "bad"]}}, {"short": "Limit", "tag": "Amdahl", "title": "Max speed-up = 1 / serial fraction = 10×", "body": "<p>No number of cores beats the serial part.</p>", "metrics": {"speed": ["limit 10×"]}}, {"short": "Shrink", "tag": "Fix", "title": "Shrink the serial part: 10% → 2%", "body": "<p>Parallel input reading, tree-style merging. Now 64 cores give ~28×.</p>", "set": {"job": {"marks": {"0": "green", "1": "blue"}, "ptr": {}, "values": ["serial 0.2", "parallel 0.15"]}}, "metrics": {"time": ["0.35 min"], "speed": ["~28×", "good"]}}, {"short": "Overheads", "tag": "Reality", "title": "Real overheads make it worse", "body": "<p>Locks, cache-line contention, memory bandwidth and coordination grow with more cores.</p>"}, {"short": "Ordering", "tag": "Memory ordering", "title": "Cores may see each other's writes in a different order", "body": "<p>CPUs and compilers reorder memory operations for speed. Use atomics, locks or memory fences to guarantee visibility — never plain flags.</p>", "note": {"kind": "key", "text": "Amdahl's law: speed-up ≤ 1 / (serial fraction). Reduce serial work and contention before adding cores; use proper synchronization for shared memory."}}]}


## The flag that lied

> [!STORY] A programmer writes two threads. Thread 1 prepares some data, then sets `ready = true`. Thread 2 waits until `ready` is true, then reads the data. On their laptop it always works. On a server with a different processor, once every few million runs, Thread 2 sees `ready == true` but reads **stale, half-written data**. No line of code is wrong in the obvious sense. The problem is that, without special instructions, neither the compiler nor the CPU promises that other cores will see your writes **in the order you wrote them**.

Since clock speeds stopped rising (chapter 2), extra performance comes from **more cores**. Laptops have 8–16; servers have 64–192 per chip. Using them means threads sharing memory — and that requires understanding what the hardware actually guarantees.

## Keeping caches consistent: coherence

Each core has private L1 and L2 caches (chapter 5). If core 1 and core 2 both cache the same memory line, and core 1 writes to it, core 2's copy is now wrong. **Cache coherence** protocols make sure that never becomes visible.

The classic protocol is **MESI**, named after the four states each cached line can be in:

::widget Stepper {"type":"hub","title":"The MESI states of a cache line","what":"The center is the problem coherence solves; each box is one state a cache line can be in, from one core's point of view, and what happens on reads and writes.","steps":["Click the center first.","Follow one line: core 1 reads it (E), core 2 reads it (both S), core 1 writes it (M in core 1, I in core 2).","Find which state lets a core write without telling anyone."],"nodes":[["Several cores, one memory","Every core may keep a copy of the same 64-byte line. Before a core writes, all other copies must be invalidated, so nobody reads stale data. Cores 'snoop' on each other's requests (or consult a directory) to coordinate."],["Modified","Only this core has the line, and it has changed it; memory is out of date. The core must supply the data (or write it back) if anyone else asks."],["Exclusive","Only this core has the line, and it matches memory. It can write without asking anyone, moving to Modified."],["Shared","Several cores have clean, identical copies. Reading is free; writing requires first invalidating everyone else's copy."],["Invalid","This core's copy is not usable. The next read must fetch the line again — a 'coherence miss'."]]}

The cost: writes to data that other cores are also using generate invalidation traffic between cores. This is why **false sharing** (chapter 5) is so expensive, and why highly contended shared counters scale badly — every increment drags the line from core to core.

## Reordering: the real surprise

Coherence guarantees each memory location looks consistent. It does **not** guarantee that writes to **different** locations become visible in program order. Two layers reorder memory operations for speed:

- **The compiler** may reorder, combine or remove loads and stores if a single thread can't tell the difference — or keep a variable in a register and never re-read memory at all.
- **The CPU** buffers writes in a **store buffer** before they reach the cache, and executes loads early (chapter 4). x86 is relatively strict ("total store order": it can only let a later load pass an earlier store). ARM and RISC-V are **weakly ordered**: almost any reordering is allowed unless you forbid it.

That's the story's bug: on a weakly ordered CPU, the write to `ready` can become visible to Thread 2 before the writes to `data`.

> [!ANALOGY] You post two letters on Monday: first "the package is in the shed", then "the shed key is under the mat". The postal service guarantees each letter arrives intact, but not that they arrive in order. Your friend might go looking in the shed before learning about the key. To guarantee order, you'd send them by recorded delivery, one after another — that's a **memory barrier**.

## Memory models, atomics and barriers

Languages define a **memory model** — rules about what one thread may observe of another's writes. The key idea is **happens-before**: if action A happens-before B, then B is guaranteed to see A's effects. You create happens-before relationships with **synchronization**: locks, atomics, thread start/join, channels.

The correct version of the story, in C++:

```cpp
std::atomic<bool> ready{false};
Data data;

// Thread 1
data = prepare();
ready.store(true, std::memory_order_release);   // everything before this…

// Thread 2
while (!ready.load(std::memory_order_acquire)) { }   // …is visible after this
use(data);
```

- An **atomic** variable is read and written indivisibly, and the compiler won't cache it in a register.
- **Release** (on the store) means: no earlier memory operation may be moved after it.
- **Acquire** (on the load) means: no later memory operation may be moved before it.
- Together they make everything Thread 1 wrote before the release visible to Thread 2 after the acquire.

The defaults (`seq_cst`, "sequentially consistent") are the strongest and simplest; use them unless profiling says otherwise. Java's `volatile` and `AtomicXxx`, Go's `sync/atomic` and Rust's atomics provide the same tools.

> [!WARN] Don't use plain variables (or C/C++ `volatile`, which doesn't provide inter-thread ordering) to signal between threads. A **data race** — two threads accessing the same memory, at least one writing, without synchronization — is undefined behavior in C, C++ and Rust's unsafe code, and a source of rare, unreproducible bugs everywhere. Thread sanitizers (`-fsanitize=thread`, `go test -race`) find them.

## How locks are built

The hardware provides **atomic read-modify-write** instructions:

- **Compare-and-swap (CAS):** "if this location still holds X, replace it with Y" — atomically, telling you whether it succeeded. (x86 `lock cmpxchg`; ARM `ldxr`/`stxr` pairs or `cas`.)
- **Fetch-and-add:** atomically add and return the old value — perfect for counters and ticket numbers.

A simple **spinlock**:

```cpp
std::atomic<bool> locked{false};
void lock()   { while (locked.exchange(true, std::memory_order_acquire)) { /* spin */ } }
void unlock() { locked.store(false, std::memory_order_release); }
```

Real mutexes spin briefly and then ask the operating system to put the thread to sleep (Linux **futex**), waking it when the lock is released (OS track, chapter 8). **Lock-free** data structures use CAS loops directly — powerful, but notoriously difficult to get right (watch out for the "ABA problem").

## NUMA: not all memory is equally close

Large servers have two or more processor sockets, each with its **own** memory. A core can reach the other socket's memory, but it's slower (maybe 1.5–2×). This is **non-uniform memory access (NUMA)**.

Operating systems try to allocate a thread's memory on its own socket. Databases and high-performance services may **pin** threads and memory to the same NUMA node (`numactl`), and cloud instance sizes sometimes map to NUMA boundaries.

## The limits of parallelism: Amdahl's law

If 90% of a program can run in parallel and 10% can't, then even with **infinite** cores the speedup is at most **10×** — the serial 10% always remains.

```text
speedup = 1 / ((1 − p) + p / n)        p = parallel fraction, n = cores
p = 0.9, n = 8    →  4.7×
p = 0.9, n = 64   →  8.8×
p = 0.9, n = ∞    → 10×
```

> [!ANALOGY] Ten friends cooking a feast can chop vegetables ten times faster — but the turkey still takes four hours in the oven, however many people are in the kitchen.

In practice, contention (locks, shared cache lines, memory bandwidth) makes things worse than Amdahl predicts. The lesson: shrink the serial and shared parts — partition data so threads work independently, batch updates, and avoid shared hot spots. (The same principles apply at the scale of distributed systems.)

> [!RECAP]
> - More performance now comes from **more cores** sharing memory.
> - **Cache coherence** (MESI) keeps each line consistent; writes to shared lines cause invalidation traffic.
> - Compilers and CPUs **reorder** memory operations; ARM/RISC-V are weakly ordered, x86 stricter.
> - Use **memory models**: atomics with **acquire/release** (or the default sequential consistency), locks and channels to create **happens-before**; data races are bugs.
> - Locks are built from **CAS** and **fetch-and-add**, plus OS sleeping (futex).
> - **NUMA** makes some memory farther away; **Amdahl's law** caps speedup by the serial fraction.

> [!INTERVIEW] Senior and systems interviews ask: what's a data race, what does volatile/atomic guarantee, how is a mutex implemented, what is CAS, false sharing, and Amdahl's law with numbers.

::quiz {"q":"Why can Thread 2 see ready == true but stale data on an ARM server?","options":["ARM has no caches","Writes to different locations can become visible out of order without release/acquire synchronization","Thread 2 is too slow","The compiler deleted ready"],"answer":1,"explain":"Weakly ordered CPUs (and compilers) may reorder independent memory operations."}

::quiz {"q":"What does compare-and-swap do?","options":["Swaps two registers","Atomically replaces a value only if it still equals an expected value, reporting success","Compares two strings","Swaps memory pages"],"answer":1,"explain":"It's the building block for locks and lock-free structures."}

::quiz {"q":"If 95% of a program is parallelizable, what's the maximum speedup with unlimited cores?","options":["95×","20×","Unlimited","2×"],"answer":1,"explain":"1 / 0.05 = 20 — the serial 5% remains."}
