---
title: I/O and Communication: How Programs Talk to Devices and to Each Other
summary: How data moves between the CPU and devices without wasting the CPU's time, the different ways a program can wait for input, how servers like nginx and Node.js handle tens of thousands of connections with just a few threads, and every way two programs on one machine can talk to each other.
---

::widget Scene {"title": "Pipes and IPC: programs talking to each other", "sub": "cat log | grep ERROR, a kernel buffer in the middle", "nodes": [{"id": "a", "kind": "cpu", "label": "cat (writer)", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "pipe", "kind": "queue", "label": "Pipe buffer (64 KB, kernel)", "x": 8.72, "y": -1.28, "color": "orange"}, {"id": "bb", "kind": "cpu", "label": "grep (reader)", "x": 13.72, "y": -6.28, "color": "green"}, {"id": "sh", "kind": "laptop", "label": "Shell", "x": 2.83, "y": -7.17}], "links": [["a", "pipe"], ["pipe", "bb"], ["sh", "a", {"dashed": true}], ["sh", "bb", {"dashed": true}]], "metrics": [["buf", "Pipe buffer"], ["state", "State"]], "steps": [{"short": "Shell", "tag": "Setup", "title": "The shell calls pipe(): two file descriptors, a read end and a write end", "body": "<p>Then forks two children and wires cat's stdout to the write end, grep's stdin to the read end.</p>", "show": ["sh", "a", "pipe", "bb"], "flow": [["sh", "a", "#3b82f6", "fork + dup2"], ["sh", "bb", "#3b82f6", ""]], "metrics": {"buf": ["empty"], "state": ["-"]}}, {"short": "Write", "tag": "Write", "title": "cat writes 4 KB to stdout", "body": "<p>It has no idea it's a pipe, it's just file descriptor 1. Data is copied into the kernel buffer.</p>", "flow": [["a", "pipe", "#3b82f6", "4 KB"]], "metrics": {"buf": ["4 KB"]}}, {"short": "Read", "tag": "Read", "title": "grep reads it from stdin", "body": "<p>Runs concurrently; the kernel copies it out of the buffer.</p>", "flow": [["pipe", "bb", "#22c55e", "4 KB"]], "metrics": {"buf": ["empty"]}}, {"short": "Block", "tag": "Flow control", "title": "grep is slow; the buffer fills to 64 KB", "body": "<p>cat's next write blocks until there's room. Back-pressure for free: the fast writer can't run away.</p>", "set": {"a": {"badge": "blocked"}, "pipe": {"badge": "full"}}, "metrics": {"buf": ["64 KB full"], "state": ["writer blocked"]}}, {"short": "Empty", "tag": "Flow control", "title": "If the buffer is empty, grep's read blocks", "body": "<p>Until data arrives or the write end closes.</p>", "set": {"a": {"badge": null}, "pipe": {"badge": null}, "bb": {"badge": "waiting"}}, "metrics": {"buf": ["empty"], "state": ["reader blocked"]}}, {"short": "EOF", "tag": "End", "title": "cat finishes and closes its end: grep reads EOF", "body": "<p>read() returns 0, grep prints its result and exits.</p>", "set": {"bb": {"badge": "EOF → exit"}}, "metrics": {"state": ["done", "good"]}}, {"short": "SIGPIPE", "tag": "End", "title": "If grep exits early, cat's next write gets SIGPIPE", "body": "<p>That's why `cat huge | head -1` stops quickly instead of reading everything.</p>", "set": {"a": {"badge": "SIGPIPE"}}}, {"short": "Others", "tag": "Other IPC", "title": "Other ways processes talk", "body": "<p>Unix domain sockets (two-way, used by Docker and databases), shared memory (fastest, needs locking), message queues, signals, files.</p>", "note": {"kind": "key", "text": "A pipe is a bounded kernel buffer with a read end and a write end. Blocking reads and writes give automatic flow control; EOF and SIGPIPE handle shutdown."}}]}


## Waiting is the hard part

Most of what programs do isn't computing, it's **waiting**. Waiting for a web page to arrive, for a file to load, for a user to click, for a database to answer. A web server spends maybe 1% of its time computing and 99% waiting on networks and disks.

So the real questions of I/O (input/output) are: **how does data move between devices and memory** and **what should a program do while it waits**? Getting this right is the difference between a server that handles 100 users and one that handles 100,000.

## Part 1: Moving data between devices and memory

There are three ways for the CPU to get data from a device, and they mirror the polling-vs-doorbell story from chapter 3:

1. **Polling.** The CPU repeatedly asks the device "is the data ready?", then copies it word by word. Simple, but it keeps the CPU busy doing nothing useful.
2. **Interrupts.** The CPU does other work; the device rings the doorbell when data is ready, and then the CPU copies it.
3. **DMA (direct memory access).** The CPU tells the device "when data arrives, put it directly into this area of memory", and the **device copies the data itself**. The CPU only gets an interrupt when the whole transfer is done.

> [!ANALOGY] Ordering groceries. **Polling** is calling the shop every five minutes to ask if your order is ready. **Interrupts** are the shop calling you when it's ready, but you still drive there and carry each bag. **DMA** is home delivery: the shop puts everything straight into your fridge and texts you when it's done.

Every high-speed device, SSDs, network cards, GPUs, uses DMA. A modern network card can receive millions of packets per second without the CPU copying a single byte of them; the CPU just processes what's already in memory.

A **device driver** is the piece of kernel code that knows how to talk to one particular kind of device: which commands to send, where to set up DMA, how to handle its interrupts. Drivers make up roughly 70% of the Linux kernel's source code, there are a lot of devices in the world.

## Part 2: How a program waits

Now look at the same problem from a program's point of view. Your code calls `read()` on a network connection, but no data has arrived yet. What happens?

### Blocking I/O: one thread per conversation

By default, `read()` **blocks**: the kernel puts the thread to sleep until data arrives. This is easy to program, the code reads top to bottom like a story:

```python
conn = server.accept()       # sleep until a client connects
request = conn.recv(4096)    # sleep until the client sends something
conn.send(handle(request))   # sleep until the data is sent
```

To serve many clients at once, give each client its own thread. While one sleeps waiting, others work.

That works fine for hundreds of clients. But in the late 1990s, as websites grew, people hit what was named the **C10K problem**: handling **10,000** simultaneous connections. Ten thousand threads means ten thousand stacks (several MB each by default) and a scheduler constantly switching between them (chapter 5). Servers ran out of memory and spent their time switching instead of working.

### Non-blocking I/O plus one question to the kernel

The way out: don't let any thread sleep on a single connection. Instead:

1. Put every connection into **non-blocking** mode: `read()` now returns immediately with "nothing yet" instead of sleeping.
2. Ask the kernel one question about **all** connections at once: **"Which of these 10,000 connections have something ready?"**
3. Read only from those, then ask again.

> [!ANALOGY] One waiter serving a whole restaurant. Instead of standing at one table waiting for those diners to decide (blocking), the waiter watches for raised hands across the room, takes the order from whoever is ready, and keeps moving. One waiter, many tables, nobody idle.

The kernel interface for that question evolved over time:

- **`select` and `poll`** (1980s–90s): you pass the whole list of connections every time, and the kernel checks every one of them. With 10,000 mostly idle connections, that's 10,000 checks per question. It doesn't scale.
- **`epoll`** (Linux, 2002), **kqueue** (macOS/BSD): you **register** connections once. The kernel itself keeps a ready list, and adds a connection to it the moment data arrives. Asking "what's ready?" returns just the ready ones, cost proportional to the **activity** not to the total number of connections.

```python
import selectors, socket
sel = selectors.DefaultSelector()            # uses epoll on Linux, kqueue on macOS
server = socket.socket(); server.bind(("0.0.0.0", 8080)); server.listen(); server.setblocking(False)
sel.register(server, selectors.EVENT_READ)

while True:                                  # the event loop
    for key, _ in sel.select():              # sleep until SOMETHING is ready, then get only those
        if key.fileobj is server:            # a new client is connecting
            conn, _ = server.accept(); conn.setblocking(False)
            sel.register(conn, selectors.EVENT_READ)
        else:                                # an existing client sent data
            data = key.fileobj.recv(4096)
            if data: key.fileobj.send(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok")
            else: sel.unregister(key.fileobj); key.fileobj.close()
```

This loop, **wait for events, handle each quickly, repeat** is called an **event loop** and it's the architecture behind some of the most important software on the internet:

> [!EXAMPLE] **nginx** (serves a huge share of all websites) runs one worker process per CPU core, each with an epoll event loop handling thousands of connections. **Node.js** is built on an event loop, which is why it says "never block the event loop", one slow synchronous function freezes every connection on that process. **Redis** handles hundreds of thousands of requests per second on essentially one thread with an event loop. **Go** and **Java virtual threads** let you write simple blocking-style code, but their runtimes quietly turn it into epoll-based event handling underneath.

### io_uring: stop asking, just submit

Even with epoll, every read and write is still a system call, and system calls got more expensive after the 2018 CPU security fixes (chapter 3). Linux's newest interface, **io_uring** (2019), takes a different approach: the program and the kernel **share two queues in memory**.

- The program writes requests into a **submission queue**: "read 4 KB from connection 7 into this buffer", "write this to file 12".
- The kernel performs them and posts results in a **completion queue**.
- Many requests go in at once, with one system call, or **none at all** if a kernel thread watches the queue continuously.

::widget Stepper {"type":"flow","title":"io_uring: requests and results through shared queues","what":"How a program hands I/O work to the kernel through two queues in shared memory, instead of one system call per operation.","steps":["Press Play.","Notice which steps need no system call at all.","Compare with blocking I/O, where every read is a separate system call and a sleeping thread."],"nodes":[["Program writes a request","It fills in an entry in the submission queue: 'read from connection 7 into this buffer'. Just a write to memory, no system call."],["Program updates the queue tail","One more memory write tells the kernel there's new work. It can queue hundreds of requests this way."],["Kernel picks up the requests","Either when the program makes one io_uring_enter system call for the whole batch, or immediately if a kernel thread is polling the queue."],["The I/O happens","The disk or network does its work asynchronously, using DMA. The program is free to do other things."],["Kernel posts a result","It writes a completion entry: 'request 42 done, 4,096 bytes read'."],["Program reads the result","It just reads the completion queue from shared memory. Again, no system call."]]}

### Zero-copy: don't copy what you don't need to

Sending a file over the network the simple way copies the data several times: disk → kernel memory → your program's memory → kernel socket buffer → network card. Copying gigabytes costs CPU and memory bandwidth.

The `sendfile` system call tells the kernel "send this file to that connection" directly, so the data never passes through your program. With modern network cards, the CPU may not copy the bytes at all.

> [!EXAMPLE] **Kafka** the message system used by LinkedIn, Netflix and Uber to move trillions of messages a day, owes much of its famous throughput to `sendfile`. Messages stored on disk go straight from the page cache to the network socket without ever being copied into Kafka's own memory.

## Part 3: Programs talking to each other (IPC)

Processes are isolated on purpose (chapter 4): one can't read another's memory. But programs constantly need to cooperate, your shell piping one command into another, your browser talking to its GPU process, Docker's command line talking to the Docker daemon. **Inter-process communication** (IPC) is the set of controlled ways to do that.

| Mechanism | What it's like | Typical use |
|---|---|---|
| **Pipe** | A one-way tube of bytes between two related processes | `ls \| grep txt` in a shell |
| **Named pipe (FIFO)** | A pipe with a name in the file system, so unrelated programs can use it | Simple local tools |
| **Unix domain socket** | Like a network connection, but local and faster; two-way; can even pass open files between processes | Docker CLI ↔ daemon (`/var/run/docker.sock`), databases' local connections, systemd |
| **Shared memory** | The same physical memory mapped into both processes (chapter 6), no copying at all | High-speed data exchange: video, databases, trading systems |
| **Signals** | Tiny notifications with no data (chapter 3) | "Please shut down" (SIGTERM), "reload config" (SIGHUP) |
| **Message queues** | The kernel holds discrete messages until they're read | Older Unix software |
| **Network sockets** | Talking over TCP/UDP, also works across machines | Almost everything (Networking track) |

### Pipes: the Unix superpower

When you type `cat access.log | grep 404 | wc -l` in a terminal, the shell creates three processes connected by two pipes. Each program reads its input and writes its output without knowing what's on either side. The kernel holds a small buffer (64 KB by default) in each pipe:

- If `grep` is slower than `cat`, the pipe fills up, and `cat` is **paused** until there's room, automatic backpressure (chapter 8's producer-consumer pattern, built into the OS).
- If the pipe is empty, `wc` waits.
- When `cat` finishes and closes its end, `grep` sees "end of file" and finishes too.

This lets you chain small, simple tools into powerful one-liners, the core of the Unix philosophy.

> [!WARN] The most common pipe bug when writing such code yourself: forgetting to close the unused end of a pipe. The reader only sees "end of file" when **every** copy of the write end is closed. Leave one open by accident (for example in the parent process) and the reader waits forever.

### Shared memory: the fastest, with a catch

Shared memory is the fastest option because nothing is copied: both processes see the same bytes. The catch is that they now share data the way threads do, so they need the same synchronization tools from chapter 8, atomic operations, locks or carefully designed lock-free queues, or they'll corrupt each other's data.

> [!EXAMPLE] **Chrome** splits itself into many processes for safety (chapter 5): a browser process, a GPU process, one renderer per site. They talk constantly through IPC built on shared memory and Unix sockets, frames of video, input events, network data. Chrome's IPC system, called Mojo, is one of the most heavily used IPC systems in the world.

> [!RECAP]
> - Devices move data with **polling** **interrupts** or **DMA**; DMA lets devices fill memory directly while the CPU does other work.
> - **Blocking I/O** (one thread per connection) is simple but doesn't scale to tens of thousands of connections, the **C10K problem**.
> - **Non-blocking I/O + epoll/kqueue** powers **event loops** in nginx, Node.js and Redis: ask the kernel only for connections that are ready.
> - **io_uring** submits batches of I/O through shared queues, needing few or no system calls; **sendfile** avoids copying data at all.
> - **IPC** options range from **pipes** (with built-in backpressure) and **Unix sockets** to **shared memory** (fastest, but needs synchronization).

> [!INTERVIEW] *How does nginx/Node/Redis handle tens of thousands of connections with few threads?* (non-blocking sockets plus an epoll event loop). *select vs epoll?* *Blocking vs non-blocking vs asynchronous I/O?* *What is zero-copy?* *What's the fastest IPC mechanism?* (shared memory, but it needs synchronization).

::quiz {"q":"Why does epoll scale better than select for 10,000 mostly idle connections?","options":["It uses more threads","Connections are registered once and the kernel returns only the ready ones, so cost follows activity, not the total number of connections","It compresses the connection list","It avoids TCP"],"answer":1,"explain":"select passes and checks every connection on every call."}

::quiz {"q":"In `cat big.log | grep error`, grep is slower than cat. What happens?","options":["Data is lost","The pipe's buffer fills and cat is paused until grep catches up, backpressure","cat crashes","The kernel buffers unlimited data"],"answer":1,"explain":"Pipes have a fixed-size buffer; a full pipe blocks the writer."}

::quiz {"q":"What does DMA let a device do?","options":["Run programs","Copy data directly to or from memory without the CPU copying each byte","Skip the kernel entirely","Encrypt data"],"answer":1,"explain":"The CPU just sets up the transfer and gets an interrupt when it's done."}
