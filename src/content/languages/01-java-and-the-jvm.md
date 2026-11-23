---
title: Java and the JVM — Memory, Garbage Collection, HashMap and Concurrency
summary: What Java interviews go deep on: how the JVM runs bytecode with a JIT, stack vs heap, generational garbage collection and G1/ZGC, how HashMap really works (hashing, buckets, treeification, resizing), equals/hashCode contracts, the Java Memory Model with volatile and synchronized, ConcurrentHashMap, thread pools and CompletableFuture.
---

::widget Scene {"title": "HashMap.put, step by step", "sub": "hash, bucket, collision, treeify and resize in a Java HashMap", "nodes": [{"id": "k", "kind": "doc", "label": "put(\"asha\", 91)", "x": 3.72, "y": 3.72}, {"id": "h", "kind": "cpu", "label": "hashCode() ^ (h >>> 16)", "x": 7.72, "y": -0.28, "color": "purple"}, {"id": "t", "kind": "cells", "label": "table[16] buckets", "x": 8.62, "y": -7.38, "values": ["", "", "", "", "", "", "", ""]}, {"id": "tree", "kind": "cube", "label": "Red-black tree bucket", "x": 15.44, "y": -0.56, "color": "orange"}], "links": [["k", "h"], ["h", "t"]], "metrics": [["size", "Entries"], ["cap", "Capacity / threshold"], ["note", "Note"]], "steps": [{"short": "Hash", "tag": "Hash", "title": "put calls key.hashCode() and spreads the bits: h ^ (h >>> 16)", "body": "<p>Mixing the high bits in protects against poor hashCode implementations that differ only in high bits.</p>", "show": ["k", "h"], "flow": [["k", "h", "#a855f7", "\"asha\".hashCode()"]], "metrics": {"size": ["0"], "cap": ["16 / 12"], "note": ["load factor 0.75"]}}, {"short": "Index", "tag": "Index", "title": "Bucket index = hash & (capacity − 1)", "body": "<p>Capacity is always a power of two, so this mask equals hash % capacity but is faster.</p>", "show": ["k", "h", "t"], "flow": [["h", "t", "#3b82f6", "index 5"]], "set": {"t": {"marks": {"5": "blue"}, "ptr": {"i": 5}, "values": ["", "", "", "", "", "asha", "", ""]}}, "metrics": {"size": ["1"]}}, {"short": "Equal", "tag": "Collision", "title": "put(\"dev\", 50) lands in bucket 5 too", "body": "<p>Java walks the bucket comparing hash first, then equals(). No match → append a node to the bucket's linked list.</p>", "set": {"t": {"marks": {"5": "orange"}, "ptr": {}, "values": ["", "", "", "", "", "asha→dev", "", ""]}}, "metrics": {"size": ["2"]}}, {"short": "Replace", "tag": "Update", "title": "put(\"asha\", 95): equals() finds the existing key → replace the value", "body": "<p>That's why keys need a correct equals/hashCode pair: equal objects must have equal hash codes.</p>", "set": {"t": {"marks": {"5": "green"}, "ptr": {}, "values": ["", "", "", "", "", "asha=95→dev", "", ""]}}}, {"short": "Mutable", "tag": "Pitfall", "title": "Mutating a key after inserting it", "body": "<p>Its hashCode changes, it now \"belongs\" in another bucket, and get() can't find it. Use immutable keys (String, records).</p>", "note": {"kind": "warn", "text": "Never use mutable objects as HashMap keys."}}, {"short": "Treeify", "tag": "Treeify", "title": "A bucket with 8+ entries (and table ≥ 64) becomes a red-black tree", "body": "<p>Worst-case lookup drops from O(n) to O(log n) — a defence against many colliding keys.</p>", "show": ["k", "h", "t", "tree"], "set": {"tree": {"badge": "O(log n)"}}}, {"short": "Resize", "tag": "Resize", "title": "More than 12 entries (16 × 0.75): double to 32 and redistribute", "body": "<p>Each entry either stays at index i or moves to i + 16, decided by one extra hash bit — no full rehash needed.</p>", "set": {"t": {"marks": {}, "ptr": {}, "values": ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]}}, "metrics": {"size": ["13"], "cap": ["32 / 24"]}}, {"short": "Threads", "tag": "Concurrency", "title": "HashMap is not thread-safe", "body": "<p>Concurrent puts can lose entries. Use ConcurrentHashMap: lock-free reads, CAS for empty buckets, locking only one bucket on collisions.</p>", "metrics": {"note": ["use ConcurrentHashMap"]}}, {"short": "Cost", "tag": "Summary", "title": "Average O(1) get and put", "body": "<p>Assuming a decent hashCode and the load factor keeping buckets short.</p>", "note": {"kind": "key", "text": "hash → spread → index by mask → walk bucket with equals → treeify long buckets → double and split at 0.75 load."}}]}

## The service that paused for four seconds

> [!STORY] A payments service written in Java runs smoothly for hours, then every so often all requests stall for four seconds and the load balancer marks it unhealthy. CPU looks normal. The answer is in the garbage-collection logs: the heap is nearly full of long-lived cached objects, and the collector is doing a full stop-the-world collection. Java interviews probe exactly this kind of knowledge — what the JVM does underneath your code.

## How Java runs

`javac` compiles source to **bytecode** (`.class` files). The **JVM** loads classes on demand, verifies the bytecode, and starts by **interpreting** it. Methods that run often are compiled to native machine code by the **JIT compiler** (C1 quickly, then C2 with heavy optimisation: inlining, escape analysis, loop unrolling). That's why Java services get faster after a warm-up period.

## Memory: stack and heap

- Each thread has a **stack** of frames holding local primitives and *references*.
- Objects live on the shared **heap**. `new` allocates there.
- **Metaspace** (outside the heap) holds class metadata.

Escape analysis can allocate objects that never leave a method on the stack (or remove them entirely), but conceptually objects are heap-allocated.

## Garbage collection

Java frees memory automatically by finding objects no longer reachable from **GC roots** (thread stacks, static fields, JNI references).

### Generations

Most objects die young (temporary strings, iterators, request objects). So the heap is split:

- **Young generation** — new objects go into *Eden*. When it fills, a fast **minor GC** copies the survivors to a *survivor* space; objects surviving several minor GCs are **promoted** to the old generation.
- **Old generation** — long-lived objects (caches, singletons). Collected less often, more expensively.

### Collectors

| Collector | Style | Pauses | Use for |
|---|---|---|---|
| Parallel | throughput-focused, stop-the-world | longer | batch jobs |
| **G1** (default) | region-based, mostly concurrent marking, pause-time goal | ~tens of ms | most services |
| **ZGC / Shenandoah** | concurrent compaction | sub-millisecond to few ms | large heaps, latency-sensitive |

Tuning starts with sizing (`-Xms`, `-Xmx`), choosing the collector, and reading GC logs — not with dozens of flags.

> [!WARN] Memory leaks exist in Java too: objects kept reachable by mistake — an ever-growing static map, listeners never removed, a `ThreadLocal` in a thread pool. The heap fills, GC runs constantly, and eventually `OutOfMemoryError`. Find them with a heap dump and a tool like Eclipse MAT.

## equals, hashCode and HashMap

The contract: if `a.equals(b)` then `a.hashCode() == b.hashCode()`. Break it and `HashMap`/`HashSet` misbehave — duplicates appear and lookups fail. Records and IDE-generated methods get it right.

How `HashMap` works (see the lesson above):

1. Spread the hash, index with `hash & (n − 1)`.
2. Walk the bucket comparing hash then `equals`.
3. Buckets that grow past 8 entries become **red-black trees** (when the table has at least 64 buckets).
4. Past the load factor (0.75), **double** the table; each entry stays or moves by exactly the old capacity.

`TreeMap` keeps keys sorted (red-black tree, O(log n)); `LinkedHashMap` keeps insertion or access order — `accessOrder=true` plus `removeEldestEntry` gives a simple LRU cache.

## The Java Memory Model

Threads may cache values and the compiler/CPU may reorder operations. The **JMM** defines when one thread's writes are guaranteed visible to another through **happens-before** relationships:

- Unlocking a monitor happens-before every later lock of the same monitor (`synchronized`).
- A write to a **`volatile`** field happens-before every later read of it.
- `Thread.start()` and `Thread.join()` create happens-before edges too.

```java
class Worker implements Runnable {
  private volatile boolean running = true;   // without volatile, the loop may never see false
  public void run() { while (running) { doWork(); } }
  public void stop() { running = false; }
}
```

`volatile` guarantees visibility and ordering but **not atomicity**: `count++` on a volatile is still a race. Use `AtomicInteger`, `LongAdder`, or a lock.

## Concurrency toolkit

- **`synchronized`** — intrinsic lock plus visibility; simple and fine for most cases.
- **`ReentrantLock`** — tryLock with timeouts, fairness, multiple conditions.
- **`ConcurrentHashMap`** — thread-safe map; use `computeIfAbsent`/`merge` for atomic compound actions rather than get-then-put.
- **Executors** — `ThreadPoolExecutor` with a bounded queue and an explicit rejection policy. Size CPU-bound pools near the core count; I/O-bound pools larger.
- **`CompletableFuture`** — compose async steps: `supplyAsync(...).thenApply(...).thenCombine(...)`, with `exceptionally` for errors. Pass your own executor; the common pool is shared.
- **Virtual threads** (Java 21) — lightweight threads managed by the JVM, so blocking I/O code can scale to hundreds of thousands of concurrent tasks without callback style.

> [!EXAMPLE] **Fixing the four-second pauses.** GC logs showed full GCs as the old generation hit 98% — a cache with no size limit. Bounding the cache (Caffeine with maximum size) and switching to G1 with `-Xmx` sized to the container brought pauses under 50 ms.

> [!RECAP]
> - Bytecode → interpreted → hot methods **JIT**-compiled.
> - Stack per thread; objects on the shared heap; **generational GC** (young/old); G1 default, ZGC for low latency.
> - equals/hashCode contract; HashMap = buckets + treeify + resize at 0.75.
> - **JMM:** `volatile` = visibility, not atomicity; `synchronized` = mutual exclusion + visibility.
> - Prefer `ConcurrentHashMap`, bounded executors, `CompletableFuture`, and virtual threads for blocking I/O.

> [!INTERVIEW] Expect: "How does HashMap work?", "equals vs ==?", "Why must hashCode be overridden with equals?", "volatile vs synchronized?", "How does GC work and how would you debug a memory leak?", "ConcurrentHashMap internals?", "What are virtual threads?"

::quiz {"q": "Two objects are equal by equals() but have different hashCodes. What happens in a HashSet?", "options": ["Nothing", "Both may be stored as duplicates and lookups can fail", "Compilation error", "The set sorts them"], "answer": 1, "explain": "Equal objects must have equal hash codes."}

::quiz {"q": "Does `volatile int count; count++` make the increment thread-safe?", "options": ["Yes", "No — volatile gives visibility, not atomicity", "Only on 64-bit JVMs", "Only inside synchronized"], "answer": 1, "explain": "Use AtomicInteger or a lock."}

::quiz {"q": "Why does Java's GC split the heap into young and old generations?", "options": ["To use less code", "Most objects die young, so collecting the young area often is cheap and effective", "To support multiple threads", "Because of the JIT"], "answer": 1, "explain": "The weak generational hypothesis."}
