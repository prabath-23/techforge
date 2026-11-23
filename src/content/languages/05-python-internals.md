---
title: Python Internals: Objects, the GIL, Generators and asyncio
summary: What happens under Python code: everything is an object with a reference count, mutable vs immutable and the default-argument trap, how dicts and lists are implemented, the GIL and when threads, processes or asyncio help, generators and iterators, decorators and context managers, and the asyncio event loop.
---

::widget Scene {"title": "Threads vs processes vs asyncio under the GIL", "sub": "100 downloads and 4 CPU-heavy image resizes", "nodes": [{"id": "gil", "kind": "cube", "label": "GIL", "x": 2.33, "y": -6.67, "color": "red"}, {"id": "t1", "kind": "cpu", "label": "Thread 1", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "t2", "kind": "cpu", "label": "Thread 2", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "t3", "kind": "cpu", "label": "Thread 3", "x": 12.72, "y": -5.28, "color": "blue"}, {"id": "p", "kind": "blocks", "label": "4 processes (own GIL each)", "x": 13.8, "y": 4.8, "count": 4, "color": "green"}, {"id": "loop", "kind": "cube", "label": "asyncio event loop", "x": 17.22, "y": -9.78, "color": "purple"}], "links": [["t1", "gil", {"dashed": true}], ["t2", "gil", {"dashed": true}], ["t3", "gil", {"dashed": true}]], "metrics": [["task", "Task"], ["tool", "Tool"], ["result", "Result"]], "steps": [{"short": "GIL", "tag": "GIL", "title": "CPython has a Global Interpreter Lock", "body": "<p>Only one thread executes Python bytecode at a time in a process. It keeps reference counting and the interpreter simple and fast.</p>", "show": ["gil", "t1", "t2", "t3"], "set": {"t1": {"badge": "running"}, "t2": {"badge": "waiting"}, "t3": {"badge": "waiting"}}, "metrics": {"task": ["-"], "tool": ["threads"], "result": ["-"]}}, {"short": "IO", "tag": "I/O", "title": "But a thread releases the GIL while it waits on I/O", "body": "<p>socket reads, file reads, time.sleep, the others run meanwhile.</p>", "set": {"t1": {"badge": "waiting on network"}, "t2": {"badge": "running"}}}, {"short": "Downloads", "tag": "I/O-bound", "title": "100 downloads with a thread pool: ~fast", "body": "<p>Most time is waiting on the network, so threads overlap nicely despite the GIL.</p>", "metrics": {"task": ["100 downloads"], "tool": ["ThreadPoolExecutor"], "result": ["~10× faster", "good"]}}, {"short": "CPU", "tag": "CPU-bound", "title": "4 image resizes in pure Python with threads: no faster", "body": "<p>They take turns holding the GIL, effectively one core.</p>", "set": {"t1": {"badge": "running"}, "t2": {"badge": "waiting"}, "t3": {"badge": "waiting"}}, "metrics": {"task": ["4 resizes"], "tool": ["threads"], "result": ["~1×", "bad"]}}, {"short": "Procs", "tag": "Processes", "title": "Use processes: each has its own interpreter and GIL", "body": "<p>ProcessPoolExecutor / multiprocessing uses all cores. Cost: start-up and pickling data between processes.</p>", "show": ["gil", "t1", "t2", "t3", "p"], "set": {"p": {"badge": "4 cores busy"}}, "metrics": {"tool": ["ProcessPoolExecutor"], "result": ["~4×", "good"]}}, {"short": "Native", "tag": "C extensions", "title": "NumPy, Pillow and similar release the GIL in their C code", "body": "<p>Vectorised work runs in parallel threads at native speed.</p>"}, {"short": "Async", "tag": "asyncio", "title": "asyncio: one thread, many coroutines, one event loop", "body": "<p>At each await on I/O, the coroutine yields and the loop runs another. Thousands of connections with tiny overhead.</p>", "show": ["gil", "t1", "t2", "t3", "p", "loop"], "set": {"loop": {"badge": "10k sockets"}}, "metrics": {"task": ["10,000 websockets"], "tool": ["asyncio"], "result": ["one thread", "good"]}}, {"short": "Block", "tag": "Pitfall", "title": "A blocking call inside async code freezes every coroutine", "body": "<p>requests.get or time.sleep in a coroutine blocks the loop. Use async libraries (httpx, aiohttp, asyncio.sleep) or run_in_executor.</p>", "set": {"loop": {"badge": "blocked!"}}, "metrics": {"result": ["everything stalls", "bad"]}}, {"short": "Choose", "tag": "Rule", "title": "Choosing", "body": "<p>I/O-bound, few hundred tasks → threads. Very many connections → asyncio. CPU-bound → processes or native libraries. (Free-threaded CPython builds are emerging but not yet the default.)</p>", "set": {"loop": {"badge": null}}, "note": {"kind": "key", "text": "The GIL serialises Python bytecode, not I/O waits. Threads for I/O, asyncio for massive I/O concurrency, processes for CPU."}}]}

## The scraper that got slower with more threads

> [!STORY] A data engineer parallelises a Python job that downloads 5,000 product pages and then parses them with heavy regex and JSON processing. Downloading with 32 threads is dramatically faster. Parsing with 32 threads is *slower* than with one. Same language, same machine, opposite results. The explanation, the GIL, is one of the most common Python interview topics.

## Everything is an object

In CPython every value is a heap object with a **type** a **reference count** and a value. Variables are names bound to objects, not boxes holding values:

```python
a = [1, 2]
b = a          # b names the same list
b.append(3)
print(a)       # [1, 2, 3]
```

Objects are freed when their reference count drops to zero; a separate **cyclic garbage collector** cleans up reference cycles.

### Mutable vs immutable

`int`, `str`, `tuple`, `frozenset` are immutable; `list`, `dict`, `set` and most objects are mutable. "Changing" an immutable value creates a new object.

> [!WARN] **The mutable default argument trap.** Defaults are evaluated once, when the function is defined:
> ```python
> def add(item, bucket=[]):   # one list shared by every call
>     bucket.append(item); return bucket
> add(1); add(2)   # [1, 2] , surprise
> ```
> Use `bucket=None` and create the list inside.

## How the core types work

- **`list`** a dynamic array of pointers: O(1) index and amortised append, O(n) insert/delete at the front (use `collections.deque` for queues).
- **`dict`** an open-addressing hash table that **preserves insertion order** (guaranteed since 3.7). Keys must be hashable (immutable or with a stable `__hash__`).
- **`set`** a hash table of keys only; O(1) membership.
- **`str`** immutable; building strings with `+=` in a loop can be O(n²), use `''.join(parts)`.

## The GIL

CPython's **Global Interpreter Lock** lets only one thread execute Python bytecode at a time per process. It makes reference counting thread-safe cheaply. Consequences:

- **I/O-bound** work (network, disk, sleeping) parallelises fine with threads, because a thread releases the GIL while waiting.
- **CPU-bound pure-Python** work does not speed up with threads.
- C extensions like NumPy release the GIL during heavy computation.

For CPU-bound work, use **`multiprocessing`** / `ProcessPoolExecutor` (separate interpreters, separate GILs) or push the work into native libraries. Free-threaded ("no-GIL") CPython builds exist as an option from 3.13, but most deployments still run with the GIL.

## Iterators and generators

An **iterator** has `__next__` and raises `StopIteration` when done. A **generator** is a function with `yield`, it pauses and resumes, producing values lazily:

```python
def read_large(path):
    with open(path) as f:
        for line in f:
            if 'ERROR' in line:
                yield line          # one line in memory at a time

errors = (l for l in read_large('app.log') if 'payment' in l)   # generator expression
```

Generators process data streams larger than memory and compose into pipelines.

## Decorators and context managers

A **decorator** wraps a function to add behaviour:

```python
import functools, time
def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try: return fn(*args, **kwargs)
        finally: print(fn.__name__, time.perf_counter() - start)
    return wrapper
```

A **context manager** (`with`) guarantees setup and cleanup, files closed, locks released, transactions committed or rolled back, even when exceptions occur. Write one with `__enter__`/`__exit__` or `contextlib.contextmanager`.

## asyncio

`asyncio` runs many **coroutines** on one thread with an **event loop**. A coroutine runs until it hits `await` on something not ready (a socket read), then yields control; the loop resumes another coroutine whose I/O is ready.

```python
import asyncio, httpx
async def fetch(client, url):
    r = await client.get(url); return r.status_code
async def main(urls):
    async with httpx.AsyncClient() as client:
        return await asyncio.gather(*(fetch(client, u) for u in urls))
```

Rules: never call blocking functions inside coroutines (use async libraries, or `await loop.run_in_executor(...)`), bound concurrency with a `Semaphore`, and always set timeouts.

> [!RECAP]
> - Names point to objects; objects have reference counts; mutable defaults are shared.
> - list = dynamic array, dict = ordered hash table; use `deque` and `''.join`.
> - The **GIL**: threads help I/O, not CPU; use processes or native code for CPU work.
> - Generators give lazy, memory-efficient pipelines.
> - Decorators wrap behaviour; context managers guarantee cleanup.
> - asyncio = one thread, cooperative coroutines; blocking calls freeze everything.

> [!INTERVIEW] Common: "What is the GIL and how do you get parallelism?", "list vs tuple?", "How is dict implemented?", "Generators vs lists?", "Explain decorators", "What's wrong with `def f(x=[])`?", "When would you use asyncio?"

::quiz {"q": "Why don't threads speed up CPU-heavy pure-Python code in CPython?", "options": ["Threads are disabled by default", "The GIL lets only one thread run Python bytecode at a time", "Python has no threads", "Threads only run on one core by OS rule"], "answer": 1, "explain": "Use processes or native libraries for CPU-bound work."}

::quiz {"q": "What does `def add(x, items=[])` do wrong?", "options": ["Syntax error", "The same list is shared across calls", "items is a tuple", "Nothing"], "answer": 1, "explain": "Defaults are evaluated once at definition time."}

::quiz {"q": "A coroutine calls time.sleep(5). What happens?", "options": ["Only that coroutine sleeps", "The whole event loop blocks for 5 s", "Python converts it to asyncio.sleep", "It raises an error"], "answer": 1, "explain": "Use await asyncio.sleep instead."}
