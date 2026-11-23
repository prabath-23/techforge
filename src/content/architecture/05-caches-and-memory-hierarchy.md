---
title: Caches and the Memory Hierarchy
summary: Why the CPU waits on memory more than anything else, the latency numbers every engineer should know, how L1/L2/L3 caches work (cache lines, locality, associativity, eviction), why iterating a 2D array row by row can be 10× faster than column by column, false sharing, TLBs, and writing cache-friendly code.
---

## The 100-cycle wait

> [!STORY] Two engineers implement the same matrix operation. Both write correct code with identical big-O complexity. One version runs in 0.4 seconds, the other in 4 seconds. The only difference: one loops over rows then columns, the other over columns then rows. Big-O analysis says they're the same; the hardware strongly disagrees. The reason is that **a CPU can do hundreds of calculations in the time it takes to fetch one value from main memory** — so the order in which you touch memory often matters more than how much arithmetic you do.

## The gap between CPU and memory

Over the decades, CPUs got faster much more quickly than memory did. Today a core can execute several instructions per nanosecond, but reading from main memory (DRAM) takes around **80–100 nanoseconds** — hundreds of instructions' worth of waiting.

The fix is a **hierarchy** of storage: small, fast memory close to the CPU, backed by larger, slower memory further away.

::widget Stepper {"type":"layers","title":"The memory hierarchy, with approximate latencies","what":"Each layer from the CPU's registers (top) down to network storage (bottom). Each level is larger, cheaper per byte and much slower than the one above.","steps":["Press Play from top to bottom.","Compare the latency numbers: how many times slower is each step down?","Imagine each nanosecond as one second — the 'human scale' column in the description."],"nodes":[["Registers — under 1 ns","A few hundred bytes, inside the core. (If 1 ns were 1 second: instant.)"],["L1 cache — ~1 ns","32–64 KB per core, separate for instructions and data. About 4 cycles. (1 second.)"],["L2 cache — ~4 ns","256 KB to 2 MB per core. (4 seconds.)"],["L3 cache — ~10–20 ns","Several MB to over 100 MB, shared by all cores. (15 seconds.)"],["Main memory (DRAM) — ~80–100 ns","Gigabytes. (A minute and a half.)"],["NVMe SSD — ~20–100 µs","Terabytes. (About a day.)"],["Network round trip in a data center — ~500 µs","Another machine. (About a week.)"],["Hard disk seek — ~5–10 ms","(Months.) Cross-continent network round trip, ~150 ms: (years.)"]]}

> [!NOTE] These are the famous "latency numbers every programmer should know" (popularized by Jeff Dean). Exact values vary by hardware, but the **ratios** — roughly 1 : 4 : 15 : 100 : 50,000 — are what guide design decisions, from data structures to system architecture.

## How a cache works

### Cache lines and locality

Memory moves between levels in fixed-size blocks called **cache lines**, typically **64 bytes**. Ask for one 4-byte integer, and you get the 15 integers next to it for free.

Caches work because programs have **locality**:

- **Spatial locality:** if you use one address, you'll probably use nearby ones soon (walking through an array).
- **Temporal locality:** if you use something, you'll probably use it again soon (a loop counter, a hot function).

> [!ANALOGY] A chef's workstation. The ingredients for tonight's dishes sit within arm's reach (L1); the walk-in fridge is a few steps away (L2/L3); the supplier is across town (main memory). When the chef fetches tomatoes from the fridge, they bring the whole crate, not one tomato — because they'll need more in a minute. That crate is a cache line.

CPUs also **prefetch**: when they detect a regular access pattern (like walking forward through an array), they start fetching the next lines before you ask.

### Where can a line go? Associativity and eviction

A cache is organized into **sets**; each memory address maps to one set, and each set holds a few lines (**8-way** or **16-way associative** is typical). When a set is full, the cache evicts a line — usually the **least recently used**, approximately (the same LRU idea as in the DSA track).

Misses come in three kinds: **compulsory** (first touch), **capacity** (the working set doesn't fit) and **conflict** (too many hot addresses map to the same set — happens with power-of-two strides).

### Writes

Caches are usually **write-back**: a write updates the cached line and marks it dirty; it goes to memory only when evicted. (The same pattern as the database buffer pool — Databases track, chapter 7.)

## The row vs column mystery, solved

A 2D array in C, Java (arrays of arrays aside), NumPy (by default) or Rust is stored **row by row** in memory:

```c
// Fast: walks memory in order, using every byte of each 64-byte line
for (int i = 0; i < N; i++)
  for (int j = 0; j < N; j++)
    sum += grid[i][j];

// Slow: jumps N×4 bytes each step — a new cache line for every single element
for (int j = 0; j < N; j++)
  for (int i = 0; i < N; i++)
    sum += grid[i][j];
```

The fast version reads each cache line once and uses all 16 integers in it, and the prefetcher keeps ahead. The slow version uses 4 bytes of each 64-byte line before jumping to a different line; for a large grid, those lines have been evicted by the time it comes back. Same arithmetic, **~10× slower**.

> [!EXAMPLE] **Arrays vs linked lists.** Both have O(n) traversal. But an array's elements sit next to each other, while a linked list's nodes are scattered across memory — every `next` pointer may be a cache miss costing ~100 ns. In practice, iterating an array is often **10–100× faster** than iterating a linked list of the same length. This is why `std::vector`, `ArrayList` and Python lists (arrays of pointers) are the default choice, and why "data-oriented design" in games and databases stores data in contiguous arrays.

## Multiple cores: false sharing

Each core has its own L1 and L2 caches. When one core writes to a cache line, copies of that line in other cores' caches must be invalidated (cache coherence — next chapter).

**False sharing** happens when two threads write to **different** variables that happen to sit in the **same** 64-byte line. Neither thread shares data logically, but the line bounces between their caches on every write, and performance collapses.

```c
struct Counters { long a; long b; };          // a and b share a cache line
// Thread 1 increments a, thread 2 increments b → constant invalidation

struct Padded {
  alignas(64) long a;                          // each on its own cache line
  alignas(64) long b;
};
```

Java's `@Contended` and per-thread counters that are summed at the end solve the same problem.

## The TLB: caching address translations

Programs use virtual addresses, which must be translated to physical addresses through page tables (OS track, chapter 6). Walking the page table on every access would be painfully slow, so the CPU caches recent translations in the **TLB** (translation lookaside buffer). A TLB miss adds a page-table walk. Programs with huge memory footprints (databases, JVMs, ML) often use **huge pages** (2 MB instead of 4 KB) so each TLB entry covers far more memory.

## Writing cache-friendly code

- Prefer **contiguous** data structures (arrays, vectors) and access memory **sequentially**.
- Iterate in **storage order** (row by row for row-major arrays).
- Keep the **hot working set small**: pack frequently used fields together; move rarely used fields elsewhere.
- Consider **struct of arrays** instead of array of structs when a loop uses only one or two fields of each record.
- **Block** (tile) large algorithms, like matrix multiplication, so each chunk fits in cache.
- Avoid **false sharing** between threads.
- **Measure**: `perf stat -e cache-misses,cache-references` tells you whether the cache is the problem.

> [!RECAP]
> - Memory is ~**100× slower** than the CPU; a **hierarchy** of registers, L1, L2, L3, DRAM and storage hides most of the gap.
> - Data moves in **64-byte cache lines**; caches exploit **spatial and temporal locality**; prefetchers predict sequential access.
> - Misses are compulsory, capacity or conflict; caches evict roughly **LRU** and are usually **write-back**.
> - Access order matters: row-major traversal and arrays beat column-wise traversal and linked lists by large factors.
> - Beware **false sharing**; the **TLB** caches address translations (huge pages help).

> [!INTERVIEW] Know the rough latency numbers (L1 ~1 ns, RAM ~100 ns, SSD ~100 µs, cross-region ~100 ms), explain why arrays beat linked lists in practice, what a cache line and false sharing are, and why loop order matters — this signals real performance understanding beyond big-O.

::quiz {"q":"Roughly how long does a main-memory (DRAM) access take?","options":["1 ns","~100 ns","~100 µs","~10 ms"],"answer":1,"explain":"Hundreds of instructions' worth of time — hence caches."}

::quiz {"q":"Why is column-by-column traversal of a large row-major 2D array slow?","options":["More arithmetic","Each access lands on a different cache line, wasting most of each 64-byte line and defeating prefetching","Branch mispredictions","The TLB is disabled"],"answer":1,"explain":"Row-by-row traversal uses every byte of each line in order."}

::quiz {"q":"Two threads update different counters and performance collapses. A likely cause?","options":["Deadlock","False sharing — the counters share a cache line that bounces between cores","Too many cores","Integer overflow"],"answer":1,"explain":"Pad the counters onto separate cache lines."}
