---
title: Classic Synchronization Problems: Semaphores, Producer–Consumer, Readers–Writers and Dining Philosophers
summary: The concurrency problems every OS course and many interviews use: semaphores vs mutexes vs condition variables, bounded buffer (producer–consumer), readers–writers with reader and writer preference and starvation, dining philosophers and three ways to avoid deadlock, the sleeping barber, barriers, and the four conditions for deadlock.
---

::widget Scene {"title": "Dining philosophers: deadlock and the fix", "sub": "five philosophers, five forks, everyone grabs left first", "nodes": [{"id": "p0", "kind": "node", "label": "P0", "x": 5.0, "y": -5.0, "size": 1.9}, {"id": "p1", "kind": "node", "label": "P1", "x": 12.72, "y": -5.28, "size": 1.9}, {"id": "p2", "kind": "node", "label": "P2", "x": 16.8, "y": 1.8, "size": 1.9}, {"id": "p3", "kind": "node", "label": "P3", "x": 11.8, "y": 6.8, "size": 1.9}, {"id": "p4", "kind": "node", "label": "P4", "x": 4.72, "y": 2.72, "size": 1.9}], "links": [["p0", "p1", {"label": "fork 1"}], ["p1", "p2", {"label": "fork 2"}], ["p2", "p3", {"label": "fork 3"}], ["p3", "p4", {"label": "fork 4"}], ["p4", "p0", {"label": "fork 0"}]], "metrics": [["state", "State"], ["cond", "Deadlock condition"]], "steps": [{"short": "Setup", "tag": "Setup", "title": "Each philosopher needs both neighbouring forks to eat", "body": "<p>A model for any process that needs two shared resources.</p>", "metrics": {"state": ["thinking"], "cond": ["-"]}}, {"short": "Left", "tag": "Grab", "title": "Everyone picks up their LEFT fork at the same moment", "body": "<p>Each succeeds, every fork is now held.</p>", "set": {"p0": {"color": "orange", "badge": "holds left"}, "p1": {"color": "orange", "badge": "holds left"}, "p2": {"color": "orange", "badge": "holds left"}, "p3": {"color": "orange", "badge": "holds left"}, "p4": {"color": "orange", "badge": "holds left"}}, "metrics": {"state": ["all hold one fork"]}}, {"short": "Wait", "tag": "Wait", "title": "Everyone waits for their RIGHT fork, held by a neighbour", "body": "<p>A circular wait. Nobody eats, ever: deadlock.</p>", "set": {"p0": {"color": "red", "badge": "waiting"}, "p1": {"color": "red", "badge": "waiting"}, "p2": {"color": "red", "badge": "waiting"}, "p3": {"color": "red", "badge": "waiting"}, "p4": {"color": "red", "badge": "waiting"}}, "metrics": {"state": ["deadlock", "bad"], "cond": ["circular wait"]}}, {"short": "Four", "tag": "Conditions", "title": "All four Coffman conditions hold", "body": "<p>Mutual exclusion, hold-and-wait, no preemption, circular wait. Break any one to prevent deadlock.</p>", "metrics": {"cond": ["all 4 present"]}}, {"short": "Order", "tag": "Fix 1", "title": "Resource ordering: always pick up the LOWER-numbered fork first", "body": "<p>P4 needs forks 4 and 0 → takes 0 first. The cycle can't form.</p>", "set": {"p0": {"color": null, "badge": null}, "p1": {"color": null, "badge": null}, "p2": {"color": null, "badge": null}, "p3": {"color": null, "badge": null}, "p4": {"color": "blue", "badge": "fork 0 first"}}, "metrics": {"state": ["no cycle", "good"], "cond": ["breaks circular wait"]}}, {"short": "Eat", "tag": "Progress", "title": "Someone always gets both forks, eats, and releases them", "body": "<p>Progress is guaranteed.</p>", "set": {"p3": {"color": "green", "badge": "eating"}}}, {"short": "Waiter", "tag": "Fix 2", "title": "Or allow at most 4 philosophers to try at once (a semaphore of 4)", "body": "<p>With 5 forks and 4 diners, at least one gets two forks. Breaks hold-and-wait for the fifth.</p>", "metrics": {"cond": ["limits contenders"]}}, {"short": "TryLock", "tag": "Fix 3", "title": "Or try the right fork with a timeout; if it fails, put the left one back", "body": "<p>Breaks hold-and-wait, but can livelock without random back-off.</p>", "note": {"kind": "key", "text": "Deadlock needs mutual exclusion + hold-and-wait + no preemption + circular wait. Lock ordering is the standard fix in real code."}}]}

## Small problems, big lessons

These "toy" problems, philosophers and forks, a barber shop, readers and writers, survive in textbooks and interviews because each captures a real pattern: database connection pools, message queues, caches read by many and written by few, services needing two locks at once. Solve them and you can reason about real concurrent systems.

## The tools

- **Mutex** a lock with an owner; only the thread that locked it may unlock it. Protects a critical section.
- **Semaphore** a counter with two atomic operations: `wait`/`P` (decrement, block if it would go below zero) and `signal`/`V` (increment, wake a waiter). A **counting semaphore** limits concurrent access to N resources; a **binary semaphore** acts like a lock without ownership.
- **Condition variable** wait until a condition becomes true, always used with a mutex and a `while` loop (to handle spurious wake-ups):

```java
lock.lock();
try {
  while (queue.isEmpty()) notEmpty.await();   // releases the lock while waiting
  item = queue.remove();
  notFull.signal();
} finally { lock.unlock(); }
```

## Producer–consumer (bounded buffer)

Producers add items to a fixed-size buffer; consumers remove them. Requirements: producers wait when full, consumers wait when empty, no corruption.

With semaphores:

```
empty = Semaphore(N)   # free slots
full  = Semaphore(0)   # filled slots
mutex = Semaphore(1)

producer:  wait(empty); wait(mutex); put(item); signal(mutex); signal(full)
consumer:  wait(full);  wait(mutex); item = take(); signal(mutex); signal(empty)
```

Order matters: acquiring `mutex` before `empty` can deadlock (a producer holds the mutex while waiting for space a consumer can never free). In practice use a ready-made **blocking queue** (`ArrayBlockingQueue`, Go channels, `queue.Queue`).

## Readers–writers

Many readers may read simultaneously; a writer needs exclusive access.

- **Readers-preference:** the first reader locks writers out, the last reader lets them in. Simple, but a steady stream of readers **starves writers**.
- **Writers-preference:** once a writer is waiting, new readers wait. Can starve readers.
- **Fair** solutions queue requests in arrival order.

Real libraries: `ReentrantReadWriteLock`, `RWMutex` in Go, `pthread_rwlock`. Read-write locks only help when reads are long and frequent; for short reads, a plain mutex or lock-free copy-on-write structures may be faster.

## Dining philosophers

Five philosophers, five forks, each needs two (see the lesson). Naively grabbing the left fork first deadlocks. Fixes:

1. **Global ordering of resources** always acquire the lower-numbered fork first. This is the standard real-world rule: always acquire locks in a fixed global order.
2. **Limit contenders** a semaphore allowing at most four to try.
3. **Try-lock with back-off** release and retry after a random delay (avoid livelock).
4. **A waiter/arbiter** ask a central coordinator for both forks.

## Sleeping barber

A barber sleeps when no customers wait; arriving customers wake him or sit in one of N chairs, leaving if all are full. It models a server thread pool with a bounded waiting queue and rejection, semaphores for customers and barber plus a mutex for the waiting count.

## Barriers

A **barrier** makes N threads wait until all reach the same point (e.g. each phase of a parallel simulation). `CyclicBarrier`, `CountDownLatch` (one-shot), `sync.WaitGroup`.

## Deadlock, livelock and starvation

**Deadlock** requires all four **Coffman conditions**: mutual exclusion, hold-and-wait, no preemption, circular wait. Prevent by breaking one (lock ordering breaks circular wait; acquiring all at once breaks hold-and-wait; timeouts allow preemption). Detect with wait-for graphs (databases do this and abort a victim).

- **Livelock** threads keep reacting to each other without progress (two people stepping aside in a corridor forever). Add randomness.
- **Starvation** a thread never gets the resource because others keep winning. Use fair queues/locks.

> [!RECAP]
> - Mutex = owned lock; semaphore = counter for N resources; condition variable = wait for a condition (in a `while` loop).
> - Producer–consumer: empty/full semaphores + mutex, or a blocking queue.
> - Readers–writers: choose reader, writer or fair preference, beware starvation.
> - Dining philosophers: deadlock from circular wait; fix with **lock ordering** limiting contenders or try-lock with back-off.
> - Deadlock needs all four Coffman conditions; livelock and starvation are different failures.

> [!INTERVIEW] "Mutex vs semaphore?", "Implement a bounded blocking queue", "Explain readers–writers and starvation", "How do you prevent deadlock in a system that needs two locks?", "Print odd/even numbers alternately with two threads", "Implement a barrier".

::quiz {"q": "Which change prevents the dining philosophers deadlock?", "options": ["Add more philosophers", "Always pick up the lower-numbered fork first (global ordering)", "Use faster forks", "Make forks shared"], "answer": 1, "explain": "Ordering makes a circular wait impossible."}

::quiz {"q": "In readers-preference readers–writers, who can starve?", "options": ["Readers", "Writers", "Nobody", "The scheduler"], "answer": 1, "explain": "A constant flow of readers keeps writers waiting."}

::quiz {"q": "Why wait on a condition variable inside a while loop, not an if?", "options": ["Style only", "Spurious wake-ups and other threads may change the condition before you re-acquire the lock", "It's faster", "Compilers require it"], "answer": 1, "explain": "Always re-check the condition."}
