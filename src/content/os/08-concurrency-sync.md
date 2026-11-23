---
title: Concurrency — Keeping Shared Data Correct When Things Happen at Once
summary: Why two threads updating the same number can silently lose data, how the hardware and the OS let threads take turns safely (atomic instructions, locks, futexes), the classic producer-consumer pattern, how programs get stuck forever in a deadlock — and how to avoid it.
---

::widget Scene {"title": "Race conditions and mutexes", "sub": "two threads, one counter, and the missing increment", "nodes": [{"id": "t1", "kind": "cpu", "label": "Thread 1", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "t2", "kind": "cpu", "label": "Thread 2", "x": 7.44, "y": 7.44, "color": "orange"}, {"id": "x", "kind": "cube", "label": "counter (RAM)", "x": 8.72, "y": -1.28, "color": "purple"}, {"id": "m", "kind": "cube", "label": "Mutex", "x": 13.22, "y": -5.78, "color": "green"}], "links": [["t1", "x"], ["t2", "x"], ["x", "m", {"dashed": true}]], "metrics": [["r1", "T1 register"], ["r2", "T2 register"], ["mem", "counter"]], "steps": [{"short": "Code", "tag": "Setup", "title": "Both threads run counter++", "body": "<p>Looks like one step. The CPU does three: load into a register, add 1, store back.</p>", "show": ["t1", "t2", "x"], "metrics": {"r1": ["—"], "r2": ["—"], "mem": ["5"]}}, {"short": "L1", "tag": "Race", "title": "T1 loads 5", "body": "<p>Then the scheduler switches to T2.</p>", "flow": [["x", "t1", "#3b82f6", "load 5"]], "metrics": {"r1": ["5"]}}, {"short": "L2", "tag": "Race", "title": "T2 loads 5", "body": "<p>T1 hasn't stored anything yet.</p>", "flow": [["x", "t2", "#f59e0b", "load 5"]], "metrics": {"r2": ["5"]}}, {"short": "Add", "tag": "Race", "title": "Both add 1 in their own registers", "body": "<p>T1: 6. T2: 6.</p>", "metrics": {"r1": ["6"], "r2": ["6"]}}, {"short": "Store", "tag": "Lost update", "title": "Both store 6", "body": "<p>Two increments, but the counter went from 5 to 6. One update was lost. It happens rarely, so it slips through tests.</p>", "flow": [["t1", "x", "#3b82f6", "store 6"], ["t2", "x", "#f59e0b", "store 6"]], "set": {"x": {"badge": "6 (should be 7)"}}, "metrics": {"mem": ["6", "bad"]}}, {"short": "Critical", "tag": "Idea", "title": "The load-add-store is a critical section", "body": "<p>Only one thread at a time may be inside it.</p>", "show": ["t1", "t2", "x", "m"], "set": {"x": {"badge": null}}, "metrics": {"mem": ["5"], "r1": ["—"], "r2": ["—"]}}, {"short": "Lock", "tag": "Mutex", "title": "T1 locks the mutex and enters", "body": "<p>Acquiring is itself atomic (a compare-and-swap instruction).</p>", "flow": [["t1", "m", "#22c55e", "lock()"]], "set": {"m": {"badge": "held by T1"}}}, {"short": "Wait", "tag": "Mutex", "title": "T2 tries to lock and must wait", "body": "<p>It spins briefly, then sleeps in the kernel until the lock is free.</p>", "flow": [["t2", "m", "#ef4444", "lock() → wait"]], "set": {"t2": {"badge": "sleeping"}}}, {"short": "Done", "tag": "Mutex", "title": "T1 does load-add-store (6) and unlocks", "body": "<p>T2 is woken.</p>", "flow": [["t1", "x", "#3b82f6", "5 → 6"], ["t1", "m", "#22c55e", "unlock()"]], "set": {"m": {"badge": "held by T2"}, "t2": {"badge": null}}, "metrics": {"mem": ["6"]}}, {"short": "T2", "tag": "Mutex", "title": "T2 does its increment: 7", "body": "<p>Correct every time.</p>", "flow": [["t2", "x", "#f59e0b", "6 → 7"]], "set": {"m": {"badge": "free"}}, "metrics": {"mem": ["7", "good"]}}, {"short": "Atomic", "tag": "Alternative", "title": "For a simple counter, use an atomic instruction", "body": "<p>atomic_fetch_add does load-add-store as one indivisible step — no lock, no sleeping.</p>", "note": {"kind": "key", "text": "Shared mutable data + at least one writer = race. Protect it with a mutex, an atomic, or avoid sharing (message passing). Keep critical sections short."}}]}


::widget Scene {"title": "Deadlock: two threads waiting for each other forever", "sub": "lock ordering fixes it", "nodes": [{"id": "t1", "kind": "cube", "label": "Thread 1", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "t2", "kind": "cube", "label": "Thread 2", "x": 8.0, "y": -8.0, "color": "purple"}, {"id": "la", "kind": "cache", "label": "Lock A", "x": 6.82, "y": 6.82, "color": "orange"}, {"id": "lb", "kind": "cache", "label": "Lock B", "x": 14.82, "y": -1.18, "color": "orange"}], "links": [["t1", "la"], ["t2", "lb"], ["t1", "lb", {"dashed": true}], ["t2", "la", {"dashed": true}]], "metrics": [["state", "State"]], "steps": [{"short": "Hold", "tag": "Setup", "title": "Thread 1 holds A; thread 2 holds B", "body": "<p>Each now wants the other's lock.</p>", "metrics": {"state": ["running"]}}, {"short": "Wait", "tag": "Deadlock", "title": "Both wait forever", "body": "<p>Neither will release what it holds until it gets what it wants. The program freezes.</p>", "flow": [["t1", "lb", "#ef4444", "wait for B"], ["t2", "la", "#ef4444", "wait for A"]], "metrics": {"state": ["deadlocked", "bad"]}}, {"short": "Order", "tag": "Fix", "title": "Rule: always take A before B", "body": "<p>Thread 2 must take A first too, so it waits for A while holding nothing. No cycle, no deadlock. Databases detect deadlocks and abort one transaction.</p>", "metrics": {"state": ["fixed", "good"]}, "note": {"kind": "key", "text": "Deadlock needs a cycle of waiting. Break the cycle with a global lock order, timeouts, or fewer locks."}}]}

## The bug that only happens sometimes

Here's a program that looks impossible to get wrong. Two threads each add 1 to a shared counter a million times. The answer should be 2,000,000.

```python
import threading
counter = 0
def work():
    global counter
    for _ in range(1_000_000):
        counter += 1
threads = [threading.Thread(target=work) for _ in range(2)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)      # in C, Java or Go: often 1,3xx,xxx — and different on every run!
```

In C, Java, Go or Rust (with unsafe code), the same program regularly prints something like **1,347,112** — and a different wrong number every time you run it. Some updates simply vanish. (Python happens to hide this particular case because of its global interpreter lock, but the same bug appears in Python with slightly more complex code.)

Bugs like this are the most frustrating kind in all of programming: they depend on **timing**, so they appear rarely, disappear when you add debugging, and pass every test on your laptop — then show up in production under load.

## Why updates go missing

`counter += 1` looks like one step. To the CPU it's **three**:

1. **Load** the current value of `counter` from memory into a register.
2. **Add** 1 to the register.
3. **Store** the register back to memory.

Now imagine both threads run at the same time, and the CPU interleaves their steps like this:

| Time | Thread A | Thread B | counter in memory |
|---|---|---|---|
| 1 | load → 41 | | 41 |
| 2 | | load → 41 | 41 |
| 3 | add → 42 | | 41 |
| 4 | | add → 42 | 41 |
| 5 | store 42 | | 42 |
| 6 | | store 42 | **42** |

Two increments happened, but the counter only went up by one. Thread B's store overwrote thread A's. This is called a **race condition**: the result depends on the race between threads.

> [!ANALOGY] Two people share a joint bank account with ₹1,000. Both check the balance on their phones at the same moment — ₹1,000. Both deposit ₹500 by typing "new balance = 1,000 + 500 = 1,500". Both submit. The account ends at ₹1,500 instead of ₹2,000. ₹500 vanished, and neither person did anything wrong individually.

Be the scheduler yourself. You choose which thread runs each CPU step — try to make an update disappear, then turn on the lock and try again:

::widget RaceCondition {}

The piece of code that touches shared data — here, the three steps of `counter += 1` — is called a **critical section**. To be correct, we need **mutual exclusion**: while one thread is inside the critical section, no other thread may enter it.

## Tool 1: Atomic instructions — help from the hardware

You might think a simple flag would do it: "if `busy` is false, set it to true and enter". But checking the flag and setting it are again two separate steps, so two threads can both see "false" and both enter. We're back where we started.

The fix has to come from the CPU. Every modern processor provides **atomic** instructions: operations that read and modify a memory location as one indivisible step, with no other core able to sneak in between.

- **Atomic add** (fetch-and-add): add to a value in one indivisible step. Perfect for counters.
- **Compare-and-swap (CAS)**: "if the value is still X, change it to Y, and tell me whether it worked". Almost every lock-free technique is built on this.

How does the hardware pull it off? While a core performs the atomic operation, it holds exclusive ownership of that piece of memory in its cache, so no other core can touch it until the operation finishes.

```java
// Java: a counter that can't lose updates
import java.util.concurrent.atomic.AtomicLong;
AtomicLong counter = new AtomicLong();
counter.incrementAndGet();       // one atomic step: load, add and store can't be interleaved
```

> [!EXAMPLE] Atomics are everywhere you don't see them: reference counts in Swift and C++ `shared_ptr`, view counters, request IDs, statistics in web servers. They're fast — around 10–50 nanoseconds — but they only protect **one** value. To protect several related values together (debit one account *and* credit another), you need a lock.

## Tool 2: Locks (mutexes)

A **lock** — also called a **mutex**, short for *mutual exclusion* — is the standard way to protect a critical section of any size:

```java
lock.lock();
try {
    // critical section: only one thread at a time can be here
    from.balance -= amount;
    to.balance += amount;
} finally {
    lock.unlock();              // always unlock, even if an exception is thrown
}
```

> [!ANALOGY] A lock is the key to a single-occupancy restroom at a café. Whoever holds the key goes in; everyone else waits in line. When they come out, they hand the key to the next person. Simple — as long as nobody walks off with the key.

What should a thread do while it waits for the lock?

- **Spin** — keep checking in a tight loop ("is it free yet? is it free yet?"). This wastes CPU, but if the lock will be free within a few nanoseconds, it's the fastest option. The kernel uses **spinlocks** internally for tiny critical sections.
- **Sleep** — ask the OS to put the thread to sleep and wake it when the lock is released. This saves CPU, but sleeping and waking cost a couple of microseconds.

### The futex: the best of both

Linux locks combine both approaches using a **futex** ("fast user-space mutex"):

1. **No contention (the common case):** the lock is just a number in the program's memory. Taking it is one atomic compare-and-swap, done entirely in user mode — **no system call, about 20 nanoseconds**.
2. **Contention:** if the lock is taken, the thread spins briefly (the owner may release it any moment), then asks the kernel to put it to sleep until the lock is released.
3. **Unlock:** release the lock with an atomic operation; only if threads are sleeping, ask the kernel to wake one.

Every mutex in C, C++, Java, Go and Rust on Linux is built on this idea. You pay for the kernel only when threads actually collide.

## Tool 3: Waiting for something — condition variables and the producer-consumer pattern

Locks protect data. But often a thread needs to **wait until something happens**: "wait until the queue has an item", "wait until there's room in the buffer". That's what a **condition variable** is for: it lets a thread sleep until another thread signals that the situation has changed.

The most important pattern built with them is the **producer-consumer queue** (also called a **bounded buffer**):

- **Producers** put work items into a fixed-size queue.
- **Consumers** take items out and process them.
- If the queue is **full**, producers wait. If it's **empty**, consumers wait.

> [!ANALOGY] A restaurant's order rail. Waiters (producers) clip order tickets onto the rail; cooks (consumers) take tickets off and cook. If the rail is full, waiters have to hold their tickets until there's space — which naturally slows them down when the kitchen is overwhelmed. If it's empty, cooks wait for the next order.

That "waiters have to hold their tickets" detail is called **backpressure**, and it's a crucial property: a fast producer can't bury a slow consumer under infinite work. Thread pools, job queues, Go channels, Unix pipes and message brokers like Kafka all apply this same idea.

```c
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER, not_full = PTHREAD_COND_INITIALIZER;
int buf[N], count = 0, in = 0, out = 0;

void put(int item) {                          // producer
    pthread_mutex_lock(&m);
    while (count == N)                        // queue full → wait (ALWAYS re-check in a loop)
        pthread_cond_wait(&not_full, &m);     // releases the lock while sleeping, re-takes it on wake
    buf[in] = item; in = (in + 1) % N; count++;
    pthread_cond_signal(&not_empty);          // wake a waiting consumer
    pthread_mutex_unlock(&m);
}

int get(void) {                               // consumer
    pthread_mutex_lock(&m);
    while (count == 0) pthread_cond_wait(&not_empty, &m);
    int item = buf[out]; out = (out + 1) % N; count--;
    pthread_cond_signal(&not_full);           // wake a waiting producer
    pthread_mutex_unlock(&m);
    return item;
}
```

> [!WARN] Always re-check the condition in a `while` loop after waking, never an `if`. A thread can wake up **without** the condition being true — either spuriously, or because another thread grabbed the item first. Using `if` here is one of the most common concurrency bugs.

A **semaphore** is a related tool: a counter of available "permits". Taking a permit decrements it (waiting if it's zero); returning one increments it. Use it to limit concurrency, like "at most 10 simultaneous database connections".

## Reading much more than writing: read-write locks

Often many threads read shared data and only occasionally one writes it — a configuration, a routing table, a product catalog. A plain lock would make readers wait for each other for no reason. A **read-write lock** lets any number of readers in together, but gives a writer exclusive access.

The Linux kernel goes further with **RCU** (read-copy-update) for read-mostly data. Readers take no lock at all. A writer copies the data, changes the copy, then atomically swaps a pointer so new readers see the new version. The old version is freed only once every reader that might still be using it has finished. Reads become as fast as if there were no concurrency at all.

## When everyone waits forever: deadlock

Locks solve races — and introduce a new way to fail.

> [!STORY] Two friends are moving out, and both need the van and the trolley. Alice grabs the van keys and walks to get the trolley. Meanwhile Bob grabs the trolley and walks to get the van keys. Alice waits for Bob to give up the trolley; Bob waits for Alice to give up the keys. Both wait, politely and forever. Nothing is broken, yet nothing will ever happen. That's a **deadlock**.

In code, it looks like this:

::widget Stepper {"type":"cycle","title":"The classic two-lock deadlock","what":"Two threads each hold one lock and wait for the other's. Follow the arrows around the circle: the cycle is what makes it a deadlock.","steps":["Press Play.","At step 4, notice that each thread is waiting for something the other holds.","Ask: which single rule would have prevented this? (Hint: lock order.)"],"nodes":[["Thread 1 locks account A","Thread 1 is transferring money from account A to account B, so it locks A first."],["Thread 2 locks account B","At the same moment, thread 2 is transferring from B to A, so it locks B first."],["Thread 1 waits for B","Thread 1 now needs B's lock, but thread 2 holds it. Thread 1 sleeps, still holding A."],["Thread 2 waits for A — deadlock","Thread 2 needs A's lock, which thread 1 holds. Each is waiting for the other. Neither will ever wake up."]]}

A deadlock needs **all four** of these conditions (the *Coffman conditions*):

1. **Mutual exclusion** — a resource can be held by only one thread at a time.
2. **Hold and wait** — a thread holds one resource while waiting for another.
3. **No preemption** — you can't forcibly take a resource away.
4. **Circular wait** — there's a cycle of threads, each waiting on the next.

Break any one and deadlock becomes impossible. The most practical fix breaks the **circular wait**:

> [!NOTE] **Always acquire locks in one global order.** For example, always lock the account with the smaller ID first. Then both threads in the example above lock A first; one waits for A, and the cycle can never form.

```java
void transfer(Account from, Account to, long amount) {
    Account first  = from.id < to.id ? from : to;     // global order: smaller ID first
    Account second = from.id < to.id ? to : from;
    synchronized (first) {
        synchronized (second) {
            from.balance -= amount;
            to.balance += amount;
        }
    }
}
```

Other strategies:

- **Try-lock with timeout**: if you can't get the second lock in time, release the first and retry later. (Beware **livelock**, where everyone keeps backing off in sync, like two people in a corridor stepping aside in the same direction over and over.)
- **Detect and recover**: databases constantly watch for cycles of transactions waiting on each other. When they find one, they abort one transaction (you'll see a "deadlock detected" error) and the application retries it.
- **One lock for everything**: no deadlock possible, but threads can no longer run in parallel. Sometimes simple beats fast.

> [!EXAMPLE] **Where you'll actually meet deadlocks:** two database transactions updating the same two rows in opposite orders (`ERROR: deadlock detected` in Postgres); two microservices each waiting on the other's response under a tight thread pool; a UI thread waiting on a background task that's waiting to update the UI. The fix is almost always the same idea: a consistent order, or not holding one thing while waiting for another.

## Going without locks

**Lock-free** algorithms use compare-and-swap loops instead of locks, so no thread can ever block another by being paused while holding a lock. Java's `ConcurrentHashMap`, Go's channels internals and high-performance queues use these techniques. They're powerful but notoriously hard to get right, with subtle traps (the "ABA problem", safely freeing memory another thread might still be reading). For most application code, a correctly used lock or a ready-made concurrent data structure is the right choice.

## A hidden twist: CPUs reorder your code

One more surprise. For speed, **compilers and CPUs reorder memory operations** whenever a single thread couldn't tell the difference. Another thread *can* tell:

```c
// Thread 1                       // Thread 2
data = 42;                        while (!ready) {}   // wait for the flag
ready = true;                     print(data);        // can print 0!
```

Thread 2 may see `ready = true` *before* it sees `data = 42`, because the two writes were reordered. Locks and atomics with the right **memory ordering** (acquire/release semantics) prevent this; that's one more reason to use the proper tools rather than home-made flags.

> [!RECAP]
> - **Race conditions** happen when threads interleave the steps of a read-modify-write on shared data; updates silently vanish.
> - **Atomic instructions** (atomic add, compare-and-swap) make one operation indivisible — the hardware foundation of everything else.
> - **Locks/mutexes** protect critical sections of any size; Linux's **futex** makes uncontended locking nearly free.
> - **Condition variables** let threads wait for a situation; the **producer-consumer queue** with **backpressure** is the most important pattern in concurrent programming.
> - **Deadlock** needs four conditions; the practical fix is acquiring locks in a **consistent global order**.
> - CPUs and compilers **reorder** memory operations, so use proper synchronization rather than plain flags.

> [!INTERVIEW] Must-knows: explain a race condition with `counter++`; mutex vs semaphore vs spinlock; why condition-variable waits use `while`; implement a bounded blocking queue; the four deadlock conditions and lock ordering. For senior and infrastructure roles: what compare-and-swap is, how futexes work, and why memory ordering matters.

::quiz {"q":"Why can two threads each running counter++ lose an update?","options":["The CPU drops instructions","counter++ is really load, add, store; if both load the same old value, one store overwrites the other","The compiler deletes one increment","Memory is too slow"],"answer":1,"explain":"Interleaving the three steps loses an update — a race condition."}

::quiz {"q":"Which deadlock condition does 'always lock the lower account ID first' eliminate?","options":["Mutual exclusion","Hold and wait","No preemption","Circular wait"],"answer":3,"explain":"With one global lock order, a cycle of waiting threads can't form."}

::quiz {"q":"Why is an uncontended futex-based lock so fast?","options":["It runs in kernel mode","Taking it is a single atomic instruction in user space; the kernel is involved only when threads actually collide","It disables interrupts","It is cached in the TLB"],"answer":1,"explain":"No system call is needed in the common case."}
