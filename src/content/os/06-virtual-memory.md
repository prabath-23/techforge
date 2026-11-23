---
title: Virtual Memory — Giving Every Program Its Own Private World
summary: How the computer gives every program the illusion of a huge private memory, how the CPU translates the addresses programs use into real RAM locations on every single access, and the clever tricks this enables — from lazy loading to swapping to "your computer is slow because it's out of memory".
---

## The problem: everyone wants the same memory

Imagine an early computer where every program used **real** memory addresses directly. Address 5000 means byte number 5000 of the actual RAM chips. Now try running two programs:

- Both were compiled to put their data at address 5000. **They overwrite each other.**
- A bug in one program writes to address 90,000 — which happens to be where the other program keeps its data, or where the OS keeps its own. **One bug corrupts everything.**
- You have 4 GB of free RAM, but in pieces: 1 GB here, 500 MB there. A program needs 2 GB in one contiguous block. **It can't start**, even though there's enough memory in total.
- A program reserves 10 GB "just in case" but only ever uses 200 MB. **The rest is wasted.**

**Virtual memory** solves all four problems with one idea: programs never use real addresses at all.

## The big idea: every program gets a private map

> [!ANALOGY] Think of a giant warehouse (physical RAM) and many companies renting space in it (programs). Each company keeps its own inventory list with its own shelf numbers: "Shelf 1, Shelf 2, Shelf 3…". Company A's "Shelf 1" and Company B's "Shelf 1" are completely different physical locations in the warehouse. A **front desk clerk** (the hardware) holds a separate lookup book for each company and translates "Company A, Shelf 3" into "aisle 47, rack 12" every time anyone fetches anything. Companies never see the real aisle numbers, so they can't wander into each other's areas — and the warehouse can move stock around without telling them.

In computer terms:

- Each process has its own **virtual address space** — its private list of shelf numbers (chapter 4's "private street").
- Real RAM is **physical memory**.
- A piece of CPU hardware called the **MMU** (memory management unit) translates every virtual address into a physical one, **on every single memory access**, using a lookup book called a **page table** that the OS maintains for each process.

## Pages: translating in chunks

Keeping a translation for every single byte would need a lookup book bigger than memory itself. So memory is divided into fixed-size chunks called **pages** — usually **4 KB** (4,096 bytes). The OS maps whole pages:

- Virtual memory is divided into **virtual pages**.
- Physical memory is divided into same-sized **frames**.
- The page table says "virtual page 7 → frame 1,032", "virtual page 8 → not in memory", and so on.

An address is then split into two parts:

- **Which page** (the high bits) — this part gets translated.
- **Where inside the page** (the low 12 bits, since 2¹² = 4,096) — this part is copied across unchanged.

> [!EXAMPLE] Suppose a program reads virtual address 30,000. 30,000 ÷ 4,096 = page 7, with 1,328 bytes left over. The page table says page 7 lives in frame 1,032. So the physical address is 1,032 × 4,096 + 1,328 = 4,228,400. The program asked for byte 30,000 of its private world; the hardware fetched byte 4,228,400 of real RAM.

Every page table entry also carries **permission flags** that the hardware checks on every access:

- **Present?** — is this page in RAM right now? If not, the access causes a page fault.
- **Writable?** — code pages are read-only, so bugs can't overwrite the program itself.
- **User-accessible?** — kernel pages are marked kernel-only (chapter 1).
- **Executable?** — data pages are marked "not executable", which blocks a classic attack where hackers inject code into data and then run it.
- **Accessed / dirty** — set automatically by the hardware when a page is read or written; the OS uses these to decide what to evict and what needs saving.

## Why page tables come in layers

A modern 64-bit program can address 256 terabytes of virtual memory. With 4 KB pages, a simple flat table listing every page would need 64 billion entries — about 512 GB of page table **per program**. Impossible.

The trick: most of that huge address space is **empty**. A program uses a few regions (code, heap, stack, libraries) with vast gaps between them. So page tables are organized as a **tree** with four levels, like a filing system:

> [!ANALOGY] Finding a street address: **country → city → street → house number**. You don't need a list of every house on Earth — just a list of countries, then cities in the country you care about, and so on. Countries where you own nothing don't need any city lists at all.

On Intel/AMD 64-bit CPUs, the virtual page number is split into four 9-bit pieces, each indexing one level of the tree. Levels with nothing in them are simply never created, so a typical program's whole page table is only a few megabytes. Try it — type any address and watch the CPU walk the tree:

::widget PageTableWalk {}

## The TLB: a cheat sheet for translations

There's a catch. A full walk needs **four extra memory reads** before every real memory access. If that happened every time, memory would be five times slower.

So every CPU core keeps a small, ultra-fast cache of recent translations: the **TLB** (translation lookaside buffer). It holds somewhere between a few dozen and a few thousand entries. If the translation is in the TLB (a **hit**), it's practically free. If not (a **miss**), the hardware walks the tables and then remembers the answer.

Because programs tend to use the same memory repeatedly and nearby memory together, TLB hit rates are often above 99%. In the widget above, press Translate twice on the same page: the first is a miss (four table reads), the second a hit (instant).

> [!ANALOGY] The TLB is the clerk's sticky notes. Looking up the full lookup book takes a while, so for the dozen companies that came by most recently, the clerk keeps a sticky note with the answer. Most visitors are repeat customers.

> [!EXAMPLE] **Why "huge pages" make databases faster.** A database scanning a 64 GB in-memory table with 4 KB pages needs 16 million translations — far more than the TLB can hold, so it misses constantly. With **2 MB huge pages**, each translation covers 512 times more memory, so 32,768 entries cover the table and misses drop dramatically. Database and JVM tuning guides often recommend huge pages for exactly this reason.

## Page faults: when a page isn't there (yet)

When the MMU looks up a page and finds "not present", it raises a **page fault** (chapter 3) and the kernel steps in. What happens next depends on *why* the page wasn't present. This is where virtual memory gets clever:

| Situation | What the kernel does | Cost |
|---|---|---|
| **New memory, never touched.** You allocated 1 GB and just wrote to it for the first time. | Grab a free frame, fill it with zeros, map it, retry. | Microseconds (a *minor* fault) |
| **Part of a program or file not loaded yet.** | Read that page from the SSD, map it, retry. | Tens of microseconds to milliseconds (a *major* fault) |
| **The page was moved to disk to free up RAM** ("swapped out"). | Read it back from the swap area, map it, retry. | Major fault |
| **Writing to a shared copy-on-write page** after `fork` (chapter 4). | Make a private copy, map it, retry. | Minor fault |
| **The address isn't valid at all** (a null pointer, a freed object). | Give up: send the program a **segmentation fault**. | The program usually dies |

The first two rows are called **demand paging**: nothing is loaded until it's actually used.

> [!EXAMPLE] **Why big apps start fast.** Photoshop is gigabytes on disk, yet it opens in seconds. The OS doesn't load the whole program — it maps the program file into memory and loads each page only when the program first touches it. Features you never use this session are never read from disk at all.

> [!EXAMPLE] **Why `malloc(10 GB)` can succeed on an 8 GB laptop.** Allocating memory just creates *mappings*; no physical frame is used until the page is first touched. Linux deliberately **overcommits**: it promises more memory than it has, betting that programs won't use everything they reserve. Usually that bet is right.

## When RAM really runs out

Sometimes programs *do* use what they reserved, and RAM fills up. The kernel then has to **free frames** by evicting pages that aren't being used much:

- **Clean pages of files** (program code, cached file data) can simply be dropped. They can be re-read from disk later.
- **Changed file pages** must be written back to the file first.
- **Anonymous memory** (heap, stack — data that exists only in RAM) has nowhere to go except **swap**: a reserved area on disk.

Which pages to evict? Ideally the one that won't be needed for the longest time — but the kernel can't see the future. So it approximates **least recently used**: the hardware's "accessed" bit shows which pages were touched recently, and pages that haven't been touched in a while are evicted first.

When programs genuinely need more memory than exists, the system starts **thrashing**: it spends all its time moving pages between RAM and disk and almost none doing real work.

> [!EXAMPLE] **That moment when your laptop slows to a crawl** with too many browser tabs open, the fan spinning and every click taking seconds? That's thrashing. RAM is full, so every time you switch to a tab, its pages have to come back from disk, which pushes out another tab's pages, which you'll need a moment later. Closing a few memory-hungry tabs makes the whole machine fast again instantly.

If even that isn't enough, Linux's **OOM killer** (out-of-memory killer) picks a victim, usually the process using the most memory, and kills it to save the system. In containers and Kubernetes, hitting a container's memory limit triggers the same thing; it shows up as **`OOMKilled`, exit code 137**.

> [!TRY] On Linux, `free -h` shows RAM and swap. Most of your RAM will often appear "used" by "buff/cache" — that's the OS using spare RAM to cache files, which it gives back instantly when programs need it. Unused RAM is wasted RAM. On a Mac, Activity Monitor's Memory tab shows "Memory Pressure", which is a much better signal than "used".

## Sharing memory on purpose

Because translation goes through page tables, two processes can deliberately map the **same physical frame** into their address spaces:

- **Shared libraries.** One copy of the C library in RAM, mapped into hundreds of processes.
- **Copy-on-write after `fork`** (chapter 4).
- **Shared memory** for fast communication between processes (chapter 10).
- **Memory-mapped files** (`mmap`): map a file into memory and read it like an array; pages load on demand. Databases like SQLite and LMDB use this heavily.

## Putting it together: what happens when you read one variable

1. Your program reads variable `x`, at a virtual address.
2. The CPU checks the **TLB**. Hit → physical address known → read the data (most likely from the CPU cache).
3. TLB miss → the hardware **walks the four-level page table** and caches the result in the TLB.
4. Page not present → **page fault** → the kernel allocates a zeroed page, loads data from disk, or copies a copy-on-write page, then **re-runs the instruction**.
5. Address genuinely invalid → **segmentation fault**.

All of that is invisible to the program. It just sees `x`.

> [!RECAP]
> - Programs use **virtual addresses**; the CPU's **MMU** translates them into **physical** RAM addresses on every access, using **page tables** the OS maintains per process.
> - Memory is managed in **pages** (usually 4 KB). Page table entries carry permission flags the hardware enforces.
> - Page tables are a **four-level tree** so empty regions cost nothing.
> - The **TLB** caches recent translations; **huge pages** make it cover far more memory.
> - **Page faults** enable demand paging, lazy allocation, copy-on-write and swapping; only invalid accesses become segfaults.
> - When RAM runs out, the OS evicts the least recently used pages; too much eviction is **thrashing**; the last resort is the **OOM killer**.

> [!INTERVIEW] Expect: *What happens on a page fault?* *What's the TLB and why does it matter?* *Why multi-level page tables?* *Minor vs major fault?* *What's thrashing?* *What does the OOM killer do?* A great answer to "what happens when you malloc 1 GB?" mentions that nothing physical is allocated until each page is first touched.

::quiz {"q":"With 4 KB pages, how many bits of an address say where inside the page a byte is?","options":["9","12","21","48"],"answer":1,"explain":"2^12 = 4,096 bytes per page."}

::quiz {"q":"A program writes to freshly allocated memory for the very first time. What happens?","options":["A major fault — the data is read from disk","A minor fault — the kernel maps a new zero-filled page and the write is retried","A segmentation fault","Nothing — memory was already assigned at malloc time"],"answer":1,"explain":"Anonymous memory is allocated lazily on first touch."}

::quiz {"q":"Your laptop crawls when 80 browser tabs are open, and recovers instantly when you close some. What was happening?","options":["The CPU was overheating","Thrashing: RAM was full, so pages were constantly moved between RAM and disk","The TLB was disabled","The network was slow"],"answer":1,"explain":"Too much demand for RAM leads to constant swapping and very little real work."}
