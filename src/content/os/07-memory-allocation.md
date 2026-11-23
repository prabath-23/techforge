---
title: Memory Allocation — Handing Out Memory Without Making a Mess
summary: How the kernel hands out physical memory in chunks, how it serves millions of small objects quickly, how malloc and new work inside your program, why "fragmentation" wastes memory, and how languages like Java, Go and Python clean up automatically.
---

::widget Scene {"title": "malloc and the heap: carving up memory", "sub": "allocate, free, fragment, coalesce", "nodes": [{"id": "heap", "kind": "cells", "label": "heap (each cell = 16 bytes)", "x": 3.1, "y": 3.1, "values": ["", "", "", "", "", "", "", ""]}], "metrics": [["op", "Call"], ["free", "Free space"], ["note", "Note"]], "steps": [{"short": "Heap", "tag": "Setup", "title": "The heap: a region the allocator manages", "body": "<p>malloc asks the OS for big chunks (brk/mmap) and hands out small pieces itself — far faster than a system call each time.</p>", "metrics": {"op": ["—"], "free": ["128 B"], "note": ["—"]}}, {"short": "A", "tag": "malloc", "title": "a = malloc(32)", "body": "<p>Two cells. Each block has a small header recording its size, so free() knows how much to release.</p>", "set": {"heap": {"marks": {"0": "blue", "1": "blue"}, "ptr": {}, "values": ["a", "a", "", "", "", "", "", ""]}}, "metrics": {"op": ["malloc(32)"], "free": ["96 B"]}}, {"short": "B C", "tag": "malloc", "title": "b = malloc(48), c = malloc(16)", "body": "<p>Placed right after a.</p>", "set": {"heap": {"marks": {"2": "orange", "3": "orange", "4": "orange", "5": "green"}, "ptr": {}, "values": ["a", "a", "b", "b", "b", "c", "", ""]}}, "metrics": {"op": ["malloc(48), malloc(16)"], "free": ["32 B"]}}, {"short": "Free b", "tag": "free", "title": "free(b)", "body": "<p>Its cells go on a free list. Nothing is erased — the bytes are just available again.</p>", "set": {"heap": {"marks": {"0": "blue", "1": "blue", "5": "green"}, "ptr": {}, "values": ["a", "a", "", "", "", "c", "", ""]}}, "metrics": {"op": ["free(b)"], "free": ["80 B total"]}}, {"short": "Frag", "tag": "Fragmentation", "title": "malloc(64) fails to find a single gap", "body": "<p>80 bytes are free, but split into 48 + 32. External fragmentation: enough memory, wrong shape.</p>", "metrics": {"op": ["malloc(64)"], "note": ["no 64-byte gap", "bad"]}}, {"short": "Grow", "tag": "Grow", "title": "The allocator asks the OS for more heap", "body": "<p>A system call — slow-ish, but rare.</p>", "metrics": {"note": ["sbrk / mmap more memory"]}}, {"short": "Free a", "tag": "Coalesce", "title": "free(a): a sits next to the free space where b was", "body": "<p>Merge neighbours into one 80-byte block (coalescing) so big requests fit again.</p>", "set": {"heap": {"marks": {"5": "green"}, "ptr": {}, "values": ["", "", "", "", "", "c", "", ""]}}, "metrics": {"op": ["free(a)"], "free": ["80 B contiguous", "good"]}}, {"short": "Bins", "tag": "Speed", "title": "Real allocators keep free lists per size (\"bins\")", "body": "<p>Plus per-thread caches so threads don't fight over one lock. jemalloc, tcmalloc and mimalloc do this.</p>"}, {"short": "Bugs", "tag": "Bugs", "title": "Use-after-free and double free", "body": "<p>Using c after free(c) reads whatever reused that memory. Freeing twice corrupts the free list — a classic security hole.</p>", "set": {"heap": {"marks": {"5": "red"}, "ptr": {}, "values": ["", "", "", "", "", "c?", "", ""]}}, "metrics": {"note": ["memory-safety bugs", "bad"]}}, {"short": "Leak", "tag": "Leaks", "title": "Forget to free → a leak", "body": "<p>Long-running servers slowly grow until killed. Tools: Valgrind, AddressSanitizer, heap profilers.</p>", "note": {"kind": "key", "text": "malloc = find a fitting free block (split if bigger); free = return it and merge neighbours. Fragmentation, leaks and use-after-free are the classic failure modes."}}]}


## The parking lot problem

Every time your program creates a string, a list, an object or a buffer, it needs some memory. Something has to decide **where** that memory comes from — and when you're done, take it back so it can be reused.

> [!ANALOGY] Picture a long parking lot with no painted lines. Cars of different sizes arrive and leave all day. If you just park each car wherever it first fits, you soon end up with gaps between cars that are too small for any new car — even though, added together, the gaps would fit a bus. Memory allocators face exactly this problem, millions of times per second, and they need to decide each spot in a few nanoseconds.

That wasted space has a name, **fragmentation**, and it comes in two flavors:

- **External fragmentation** — free memory exists, but it's chopped into pieces too small to use. (The gaps between parked cars.)
- **Internal fragmentation** — you were given more than you asked for, and the extra is wasted. (A motorbike parked in a bus-sized spot.)

Every allocator is a trade-off between these two kinds of waste and **speed**.

There are actually **two separate allocators** working at different levels:

1. **The kernel's allocator**, which hands out **physical memory** (real RAM frames) — to processes' pages, to its own data structures, to network buffers, to the file cache.
2. **Your program's allocator** (`malloc` in C, `new` in C++/Java, every object in Python/JavaScript), which takes big regions from the kernel and carves them into the small pieces your code asks for.

## Level 1: The kernel hands out pages with the "buddy system"

The kernel manages physical memory in **pages** (4 KB each, chapter 6). Usually it needs one page, but sometimes it needs several **physically contiguous** pages — for example, a device that copies data straight into memory (DMA) may need one unbroken block.

Linux uses the **buddy allocator**. It keeps free memory in blocks whose sizes are powers of two: 1 page, 2 pages, 4, 8, … up to 1,024 pages (4 MB).

- **To allocate**: round the request up to the next power of two. If a free block of that size exists, use it. If not, take a bigger block and **split it in half** — into two "buddies" — repeatedly, until you get the right size. The leftover halves go back on the free lists.
- **To free**: when a block is returned, check whether its **buddy** (the other half it was split from) is also free. If it is, **merge** them back into one bigger block, and repeat upward.

The neat trick is that a block's buddy can be found with one simple calculation: buddy address = block address **XOR** block size. No searching needed.

Try it — allocate a few sizes, then free them and watch neighboring buddies merge back together:

::widget BuddyAllocator {}

Notice the white bar inside each allocated block in the widget: that's internal fragmentation. Ask for 100 KB and you get 128 KB; the extra 28 KB is wasted. The buddy system accepts that waste in exchange for very fast allocation and easy merging, which keeps external fragmentation under control.

> [!TRY] On Linux, run `cat /proc/buddyinfo`. Each column is the number of free blocks of size 1, 2, 4, 8… pages. On a machine that has been running a long time, the high columns (big contiguous blocks) are often near zero — memory has become fragmented. The kernel can **compact** memory (move pages around to recreate big free blocks) when needed.

## Level 2: Lots of small kernel objects — the "slab" allocator

The kernel constantly creates small, same-sized objects: a record for every process (about 10 KB), every open file, every network packet, every directory entry. Giving each one a whole 4 KB page would waste huge amounts of memory, and building each one from scratch every time would be slow.

> [!ANALOGY] A slab allocator is like an egg carton factory. Instead of storing eggs loosely, you prepare cartons with exactly egg-shaped slots. Grabbing an egg slot is instant (take the next empty slot), returning it is instant, and there's no wasted space between eggs. You keep separate cartons for eggs, for tennis balls, for golf balls — one carton type per object type.

So the kernel keeps a **cache** for each object type: "process records", "open files", "network packets". Each cache owns **slabs** — a page or a few pages divided into equal slots of exactly that object's size. Allocating means "take a free slot"; freeing means "mark the slot free". Both are nearly instant, and each CPU core keeps its own small stash of free slots so cores don't fight over a shared list.

> [!TRY] On Linux, run `sudo slabtop` to see the kernel's object caches live: how many objects of each type exist and how much memory each cache uses. On a busy server you'll see huge counts of `dentry` (directory entries) and `inode` objects — the kernel caching file system information.

## Level 3: Inside your program — how malloc works

The kernel only hands memory to programs in **page-sized chunks**, using two system calls:

- **`brk`** — "extend my heap by this much" (the heap grows upward, chapter 4).
- **`mmap`** — "give me a fresh region of this many pages somewhere".

But programs want 24 bytes for a string, 64 bytes for a small object, a few KB for a buffer. Making a system call for each would be far too slow (chapter 3). So every program contains a **memory allocator** — a library that grabs big chunks from the kernel and slices them up. In C it's `malloc`/`free`; in C++ it's behind `new`/`delete`; in Java, Go, Python and JavaScript it's built into the language runtime.

### What happens when you call malloc(24)

Here's how the standard C library's allocator (glibc's) handles it, simplified:

1. **Round up** to a size class — say, 32 bytes including a small header.
2. **Check the fast path first**: each thread keeps a small cache of recently freed chunks of each size. If one is available, take it. This is the common case, taking just a few nanoseconds.
3. **Otherwise**, look in the free lists ("bins"), sorted by size, for a free chunk that fits; split a bigger one if needed.
4. **If nothing fits**, ask the kernel for more with `brk`, and carve from the new space.
5. **Large requests** (over about 128 KB) skip all of this and get their own `mmap` region, so they can be returned to the kernel directly when freed.

Each chunk has a small **header** just before the address you get back, holding its size and whether its neighbors are free. That's why writing past the end of a buffer (a **buffer overflow**) is so dangerous: you overwrite the next chunk's header, corrupting the allocator's bookkeeping — which attackers have exploited for decades.

When you `free` a chunk, it usually goes back to the allocator's free lists, **not** to the operating system.

> [!EXAMPLE] **"I freed 2 GB but my program still uses 2 GB!"** This surprises many people. The allocator keeps freed memory to reuse for future allocations, which is faster than returning it to the kernel and asking again. The memory shows up as used by your process (its "RSS") even though your program isn't using it. It's not a leak — but it can look like one in monitoring dashboards.

### Faster allocators

Big services often swap in a different allocator for better speed or less fragmentation:

- **jemalloc** (used by Meta/Facebook, Redis, FreeBSD) — excellent at keeping fragmentation low in programs that run for months.
- **tcmalloc** (Google) — fast per-thread caches for small objects.
- **mimalloc** (Microsoft) — very fast general-purpose allocator.

> [!EXAMPLE] Redis, the in-memory database, ships with jemalloc by default. Because Redis keeps everything in RAM for weeks at a time, fragmentation directly costs money: a 64 GB server that's 30% fragmented stores 30% less data. Redis even reports a `mem_fragmentation_ratio` metric, and has an "active defragmentation" feature that moves data around to reclaim space.

### A tiny allocator, to make it concrete

Here's a minimal allocator in C. It hands out memory from one big array, and keeps a linked list of free blocks. Real allocators add size classes, merging of neighbors and thread caches, but the core idea is exactly this:

```c
#include <stddef.h>
typedef struct Block { size_t size; struct Block *next; } Block;   // header in front of every block

static char arena[1 << 20];            // 1 MB of memory to hand out
static Block *free_list = NULL;
static int ready = 0;

void *my_malloc(size_t n) {
    n = (n + 15) & ~15UL;              // round up to a multiple of 16 bytes
    if (!ready) {                      // first call: the whole arena is one big free block
        free_list = (Block *)arena;
        free_list->size = sizeof arena - sizeof(Block);
        free_list->next = NULL;
        ready = 1;
    }
    for (Block **pp = &free_list; *pp; pp = &(*pp)->next) {   // first-fit search
        Block *b = *pp;
        if (b->size >= n) {
            if (b->size >= n + sizeof(Block) + 16) {           // big enough to split
                Block *rest = (Block *)((char *)(b + 1) + n);
                rest->size = b->size - n - sizeof(Block);
                rest->next = b->next;
                *pp = rest;
                b->size = n;
            } else *pp = b->next;                              // use the whole block
            return b + 1;                                      // memory starts right after the header
        }
    }
    return NULL;                                               // out of memory
}

void my_free(void *p) {
    if (!p) return;
    Block *b = (Block *)p - 1;         // step back to the header
    b->next = free_list;               // push onto the free list
    free_list = b;                     // (a real allocator would merge with free neighbors here)
}
```

## The bugs that live at this layer

Manual memory management (C, C++) gives full control — and a whole family of bugs:

| Bug | What happens | Real consequences |
|---|---|---|
| **Memory leak** | Memory allocated but never freed | Program grows until it's killed (chapter 6's OOM killer) |
| **Use after free** | Using memory after freeing it; it may now belong to something else | Reading someone else's data; a top cause of browser security holes |
| **Double free** | Freeing the same memory twice | Corrupts the allocator; exploitable by attackers |
| **Buffer overflow** | Writing past the end of an allocation | Overwrites neighbors' data and headers; the classic hacking technique |

> [!EXAMPLE] Microsoft and Google have both reported that around **70% of their serious security bugs** are memory-safety bugs like these. That statistic is the main reason the industry is moving toward memory-safe languages such as Rust, Go, Java, C# and Swift, and why Android, Windows and the Linux kernel now accept Rust code.

> [!TRY] If you write C or C++, compile with `-fsanitize=address` (AddressSanitizer). It adds checks that catch use-after-free, double free and buffer overflows the moment they happen, with a clear report of where. It's one of the most valuable debugging tools ever made.

## Automatic memory management: garbage collection

Most popular languages — Java, Python, JavaScript, Go, C#, Ruby — free memory **automatically**. You create objects; the runtime figures out when nothing can use them anymore and reclaims them. There are two main approaches.

### Reference counting

Every object keeps a count of how many references point to it. When the count drops to zero, free it immediately. Python and Swift work this way.

> [!ANALOGY] Like a library book with a card counting how many people currently have it checked out. When the count reaches zero, the book goes back on the shelf.

It's simple and predictable — memory is freed the instant it's unused. Its weakness is **cycles**: if object A points to B and B points back to A, both counts stay at 1 forever, even when nothing else can reach them. Python runs an extra cycle detector now and then to catch these.

### Tracing garbage collection

Start from the **roots** — the variables your program can currently reach (local variables on stacks, globals) — and follow every reference, **marking** each object found. Anything not marked is unreachable garbage, so **sweep** it away. Cycles are no problem: an unreachable cycle simply never gets marked.

Modern collectors (Java's G1 and ZGC, Go's GC, JavaScript's V8) add two big ideas:

- **Generations.** Most objects die young — a temporary string, a short-lived request object. So the collector checks the "young" area very often and cheaply, and the "old" area (objects that survived several rounds) only rarely.
- **Concurrency.** Do most of the marking *while the program keeps running*, using extra bookkeeping to stay correct, so pauses stay under a millisecond.

> [!EXAMPLE] **Garbage collection pauses in the real world.** Discord famously rewrote one of its busiest services from Go to Rust in 2020, partly because Go's garbage collector caused a latency spike every two minutes as it scanned a huge in-memory cache. Java services commonly tune their collectors for the same reason. GC is a huge productivity win — but at scale, its pauses become a design concern.

> [!RECAP]
> - Allocators fight **fragmentation**: external (free memory in unusable scraps) and internal (allocated but wasted).
> - The **kernel** hands out physical pages with the **buddy system** (power-of-two blocks that split and merge) and serves its many small objects with **slab caches**.
> - **malloc** takes big chunks from the kernel (`brk`, `mmap`) and carves them into small pieces, with per-thread caches for speed. Freed memory usually stays in the program for reuse.
> - Manual memory management causes **leaks, use-after-free, double free and overflows** — around 70% of serious security bugs at big companies.
> - **Garbage collection** frees memory automatically, by **reference counting** (Python, Swift) or **tracing** (Java, Go, JavaScript), using generations and concurrency to keep pauses short.

> [!INTERVIEW] Questions to be ready for: *How does malloc get memory from the OS?* (brk and mmap). *Why doesn't freeing memory lower my process's memory usage?* *Internal vs external fragmentation?* *How would you design an allocator for many objects of one size?* (a free list or slab). *How does a generational garbage collector work, and why is it effective?* (most objects die young).

::quiz {"q":"You ask a buddy allocator for 100 KB. How much do you get, and what is the waste called?","options":["100 KB, no waste","128 KB; the extra 28 KB is internal fragmentation","64 KB plus 36 KB elsewhere","256 KB; external fragmentation"],"answer":1,"explain":"Requests round up to the next power of two; the unused part inside the block is internal fragmentation."}

::quiz {"q":"Why is a slab allocator ideal for the kernel's process records and file records?","options":["They are very large","There are huge numbers of objects of each exact size, so pre-cut equal slots make allocation instant with no wasted gaps","They never get freed","They must be contiguous"],"answer":1,"explain":"One cache per object type, each slab divided into exactly-sized slots."}

::quiz {"q":"Why can't plain reference counting free two objects that point at each other but are otherwise unreachable?","options":["Their counts never drop to zero","They are too large","Reference counting only works on strings","They are on the stack"],"answer":0,"explain":"Each holds a reference to the other; a tracing collector or cycle detector is needed."}
