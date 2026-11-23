---
title: Concurrency in LLD — Classes That Stay Correct When Many Threads Use Them
summary: Most LLD problems hide a concurrency question — two entry gates grabbing the same parking spot, two users clicking the same cinema seat. This chapter shows how to spot shared state, the four ways to make a class thread-safe, Java's toolkit, and how to build the classic concurrent components interviewers ask for: a blocking queue, a thread pool, a thread-safe cache, rate limiters and more.
---

> [!NOTE] The theory behind this chapter — race conditions, locks, deadlock, memory ordering — is explained step by step in **OS → Concurrency**. This chapter is the hands-on, interview-coding version.

## The hidden question in every LLD problem

> [!STORY] A parking lot has four entry gates. At 9:00:00.000, two cars arrive at gates 1 and 3 at the same instant. Both gates' software looks for a free spot, both find spot B-14, and both print a ticket for it. Two drivers circle the car park looking for a spot that only one of them can have. Nobody wrote "buggy" code — each gate's logic was correct on its own. The bug only exists because two threads ran it **at the same time**.

Whenever data is **shared between threads and changed by at least one of them**, you have to make it safe. In LLD problems that's almost always the interesting part: spots in a parking lot, seats in a cinema, the balance in a wallet, a cache used by every request.

## When does a class need to be thread-safe?

Four strategies, from best to most work:

1. **Don't share it.** Give each thread its own data (objects created per request, thread-local storage, one event loop owning the data). No sharing, no problem.
2. **Don't change it.** **Immutable** objects (final fields, Java records) can be shared freely, because nobody can modify them.
3. **Use ready-made thread-safe building blocks:** `ConcurrentHashMap`, `AtomicLong`, `BlockingQueue`. Someone has already done the hard work.
4. **Lock it yourself.** Protect the shared data with a lock, and keep the locked section as short as possible.

The golden rule: **every access to shared changing data — reads too — must be protected by the same lock, and any "check, then act" sequence must happen as one indivisible step.**

```java
// BROKEN: two gates can both see the spot free, and both take it
if (spot.isFree()) spot.assign(vehicle);

// FIXED (option 1): lock the spot while checking and assigning
synchronized (spot) {
    if (!spot.isFree()) throw new SpotTakenException();
    spot.assign(vehicle);
}

// FIXED (option 2): one atomic compare-and-set — "assign only if still empty"
AtomicReference<Vehicle> occupant = new AtomicReference<>();
boolean won = occupant.compareAndSet(null, vehicle);   // exactly one gate wins
```

> [!ANALOGY] "Check, then act" without protection is like two people seeing the last cookie on a plate and both reaching for it. A lock is a rule that only one person may stand at the plate at a time. Compare-and-set is grabbing the cookie in one motion that only succeeds if it's still there.

## Java's toolkit

| Tool | Use |
|---|---|
| `synchronized` methods/blocks | simple mutual exclusion + visibility; reentrant |
| `volatile` | visibility of a single variable (flags), no atomic compound ops |
| `ReentrantLock` | tryLock with timeout, fairness, interruptible locking, multiple `Condition`s |
| `ReentrantReadWriteLock` / `StampedLock` | many readers, few writers |
| `AtomicInteger/Long/Reference`, `LongAdder` | lock-free counters and CAS-based updates; LongAdder for hot counters |
| `ConcurrentHashMap` | thread-safe map; atomic `computeIfAbsent`, `merge`, `compute` |
| `CopyOnWriteArrayList` | read-mostly listener lists |
| `BlockingQueue` (`ArrayBlockingQueue`, `LinkedBlockingQueue`) | producer-consumer handoff with backpressure |
| `ExecutorService`, `ThreadPoolExecutor`, virtual threads (Java 21) | managing threads |
| `CompletableFuture` | composing async operations |
| `CountDownLatch`, `Semaphore`, `CyclicBarrier`, `Phaser` | coordination |

> [!WARN] `ConcurrentHashMap` makes individual operations atomic, not sequences of them. `if (!map.containsKey(k)) map.put(k, v)` still races — use `putIfAbsent` / `computeIfAbsent`.

## Component 1: Bounded blocking queue (producer-consumer)

> [!ANALOGY] A conveyor belt between a bakery's ovens and its packing station, with room for only 20 trays. Bakers put trays on; packers take them off. If the belt is full, bakers wait; if it's empty, packers wait. This is the most common concurrency coding question, because thread pools, job queues and message brokers are all built on it.

The single most common concurrency coding question. With `ReentrantLock` and two conditions:

```java
public final class BoundedBlockingQueue<T> {
    private final Object[] items; private int head, tail, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();

    public BoundedBlockingQueue(int capacity) { items = new Object[capacity]; }

    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) notFull.await();      // while, not if: spurious wakeups
            items[tail] = item; tail = (tail + 1) % items.length; count++;
            notEmpty.signal();
        } finally { lock.unlock(); }
    }

    @SuppressWarnings("unchecked")
    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) notEmpty.await();
            T item = (T) items[head]; items[head] = null; head = (head + 1) % items.length; count--;
            notFull.signal();
            return item;
        } finally { lock.unlock(); }
    }
}
```

Points to mention: circular buffer, `while` loops around `await`, `signal` vs `signalAll`, `finally` unlock, and optional timed `offer/poll`.

## Component 2: A simple thread pool

> [!ANALOGY] A team of a fixed number of workers taking jobs from a shared inbox. Hiring a new worker for every single job would be slow and chaotic; a fixed team with a queue of work is efficient, and the queue's size limit stops anyone from piling on infinite work.

```java
public final class SimpleThreadPool {
    private final BlockingQueue<Runnable> tasks;
    private final List<Thread> workers = new ArrayList<>();
    private volatile boolean shutdown;

    public SimpleThreadPool(int nThreads, int queueCapacity) {
        tasks = new ArrayBlockingQueue<>(queueCapacity);
        for (int i = 0; i < nThreads; i++) {
            Thread t = new Thread(() -> {
                while (!shutdown || !tasks.isEmpty()) {
                    try {
                        Runnable r = tasks.poll(100, TimeUnit.MILLISECONDS);
                        if (r != null) r.run();
                    } catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
                    catch (RuntimeException e) { /* log; keep the worker alive */ }
                }
            }, "pool-worker-" + i);
            t.start(); workers.add(t);
        }
    }
    public void submit(Runnable r) {
        if (shutdown) throw new RejectedExecutionException("pool is shut down");
        if (!tasks.offer(r)) throw new RejectedExecutionException("queue full");   // backpressure
    }
    public void shutdown() { shutdown = true; }
    public void awaitTermination() throws InterruptedException { for (Thread t : workers) t.join(); }
}
```

In real code use `Executors`/`ThreadPoolExecutor` and know its parameters: core/max pool size, keep-alive, the work queue (bounded!), and the **rejection policy** (abort, caller-runs for backpressure, discard).

## Component 3: Thread-safe LRU cache

The LRU cache from the DSA track, now safe for many threads at once.

```java
public final class LruCache<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> map;
    private final ReentrantLock lock = new ReentrantLock();

    public LruCache(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<>(16, 0.75f, true) {          // accessOrder = true → LRU order
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > LruCache.this.capacity; }
        };
    }
    public Optional<V> get(K key) { lock.lock(); try { return Optional.ofNullable(map.get(key)); } finally { lock.unlock(); } }
    public void put(K key, V value) { lock.lock(); try { map.put(key, value); } finally { lock.unlock(); } }
}
```

Note: even `get` must lock, because access-ordered `LinkedHashMap.get` **mutates** the list. Interviewers often ask for the hand-built version (hash map + doubly linked list — DSA → Hash Tables). For high concurrency: **lock striping** (N independent segments by key hash), or approximate LRU (Caffeine).

## Component 4: Rate limiters

The token bucket from System Design → reliability, as a class. Each client gets its own bucket, and each bucket has its own lock, so different clients never wait for each other.

### Token bucket (per client)

```java
public final class TokenBucketRateLimiter {
    private final long capacity; private final double refillPerNano;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final LongSupplier nanoClock;                               // injectable for tests

    private static final class Bucket { double tokens; long lastRefill; Bucket(double t, long now) { tokens = t; lastRefill = now; } }

    public TokenBucketRateLimiter(long capacity, double refillPerSecond, LongSupplier nanoClock) {
        this.capacity = capacity; this.refillPerNano = refillPerSecond / 1e9; this.nanoClock = nanoClock;
    }
    public boolean tryAcquire(String clientId) {
        long now = nanoClock.getAsLong();
        Bucket b = buckets.computeIfAbsent(clientId, id -> new Bucket(capacity, now));
        synchronized (b) {                                              // per-client lock: no global contention
            b.tokens = Math.min(capacity, b.tokens + (now - b.lastRefill) * refillPerNano);
            b.lastRefill = now;
            if (b.tokens >= 1) { b.tokens -= 1; return true; }
            return false;
        }
    }
}
```

### Sliding window log

```java
public final class SlidingWindowRateLimiter {
    private final int limit; private final long windowMillis;
    private final ConcurrentHashMap<String, Deque<Long>> logs = new ConcurrentHashMap<>();
    public SlidingWindowRateLimiter(int limit, Duration window) { this.limit = limit; this.windowMillis = window.toMillis(); }
    public boolean allow(String client, long nowMillis) {
        Deque<Long> q = logs.computeIfAbsent(client, c -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst() <= nowMillis - windowMillis) q.pollFirst();   // evict old
            if (q.size() < limit) { q.addLast(nowMillis); return true; }
            return false;
        }
    }
}
```

Design follow-ups: make the algorithm a **Strategy** (`RateLimiter` interface with token-bucket/fixed-window/sliding implementations), configure limits per client tier, evict idle clients' state, and for multiple servers move state to Redis (System Design → reliability).

## Component 5: Thread-safe singleton

```java
public final class ConnectionManager {
    private static volatile ConnectionManager instance;                 // volatile is essential
    private ConnectionManager() {}
    public static ConnectionManager getInstance() {
        ConnectionManager local = instance;
        if (local == null) {
            synchronized (ConnectionManager.class) {
                local = instance;
                if (local == null) instance = local = new ConnectionManager();
            }
        }
        return local;
    }
}
```

Without `volatile`, another thread may see a non-null reference to a **partially constructed** object due to reordering. The holder idiom or an enum (previous chapter) is simpler.

## Component 6: Read-mostly configuration cache

```java
public final class ConfigCache {
    private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
    private final Map<String, String> data = new HashMap<>();
    public String get(String k) { rw.readLock().lock(); try { return data.get(k); } finally { rw.readLock().unlock(); } }
    public void reload(Map<String, String> fresh) { rw.writeLock().lock(); try { data.clear(); data.putAll(fresh); } finally { rw.writeLock().unlock(); } }
}
// Even simpler and lock-free for readers: volatile Map<String,String> snapshot = Map.copyOf(fresh);  (copy-on-write)
```

## Other classics to practice

- **Print odd/even numbers alternately with two threads** (or FizzBuzz with four threads) — `Semaphore`s or a lock + condition with a turn variable.
- **Dining philosophers** — resource ordering or a waiter semaphore (OS → deadlock).
- **H2O / barrier problems** — `Semaphore` + `CyclicBarrier`.
- **Web crawler with N threads** — a `ConcurrentHashMap.newKeySet()` of visited URLs + an executor; terminate when no tasks are in flight (`Phaser` or an in-flight counter).
- **Delayed task scheduler** — a `DelayQueue` or a priority queue ordered by run time with a worker that waits on a condition until the earliest deadline (wake early when a sooner task arrives).
- **Seat booking without double booking** — per-seat locking or optimistic versions; at system scale, the database enforces it (unique constraint / `SELECT … FOR UPDATE`) — see BookMyShow in the case studies.

> [!INTERVIEW] In LLD rounds, explicitly mark which classes are shared across threads and how you protect them; prefer the narrowest lock (per-entity rather than global); avoid holding locks while doing I/O or calling foreign code; and mention how you'd test (concurrent stress tests with `ExecutorService` + `CountDownLatch`, deterministic clocks).

::quiz {"q":"Why must get() in an access-ordered LinkedHashMap-based LRU cache also take the lock?","options":["Reads are always unsafe","get() reorders the internal linked list (it's a mutation), so unsynchronized concurrent gets can corrupt it","For performance","It doesn't need to"],"answer":1,"explain":"Access order means every read moves the entry to the tail."}

::quiz {"q":"`if (!map.containsKey(k)) map.put(k, create());` on a ConcurrentHashMap — is it safe?","options":["Yes, ConcurrentHashMap is thread-safe","No — check-then-act across two calls races; use computeIfAbsent","Only with volatile","Only for String keys"],"answer":1,"explain":"Individual operations are atomic; the compound sequence is not."}

::quiz {"q":"In double-checked locking, why is the instance field volatile?","options":["To make it faster","To prevent other threads from seeing a reference to a partially constructed object due to reordering","Because static fields require it","To allow multiple instances"],"answer":1,"explain":"volatile establishes happens-before between the write and later reads."}
