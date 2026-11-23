---
title: Go Concurrency and Async Models: Goroutines, Channels, Threads and Event Loops
summary: How different languages handle doing many things at once: OS threads and thread pools, event loops with async/await, and Go's goroutines scheduled onto threads; channels, select, WaitGroups and mutexes; worker pools, context cancellation, leaks and races, and how to choose and size each model.
---

::widget Scene {"title": "A Go worker pool with channels", "sub": "1,000 URLs, 10 workers, results gathered and cancelled on timeout", "nodes": [{"id": "main", "kind": "laptop", "label": "main goroutine", "x": 3.72, "y": 3.72}, {"id": "jobs", "kind": "queue", "label": "jobs channel (buffered)", "x": 8.22, "y": -0.78, "color": "pink"}, {"id": "w", "kind": "cpu", "label": "10 worker goroutines", "x": 12.72, "y": -5.28, "color": "blue", "count": 3}, {"id": "res", "kind": "queue", "label": "results channel", "x": 17.22, "y": -9.78, "color": "green"}, {"id": "ctx", "kind": "cube", "label": "context (5 s deadline)", "x": 6.83, "y": -11.17, "color": "orange"}, {"id": "sched", "kind": "cube", "label": "Go scheduler: goroutines → OS threads", "x": 18.3, "y": 0.3, "color": "purple"}], "links": [["main", "jobs"], ["jobs", "w"], ["w", "res"], ["res", "main", {"dashed": true}], ["ctx", "w", {"dashed": true}], ["w", "sched", {"dashed": true}]], "metrics": [["sent", "Jobs sent"], ["done", "Results"], ["state", "State"]], "steps": [{"short": "Goroutine", "tag": "Goroutines", "title": "A goroutine is a function running concurrently: go fetch(url)", "body": "<p>Starts with a ~2 KB stack that grows as needed. Millions are possible; OS threads cost ~1 MB each.</p>", "show": ["main"], "metrics": {"sent": ["0"], "done": ["0"], "state": ["-"]}}, {"short": "Sched", "tag": "Scheduler", "title": "The Go runtime schedules goroutines onto a few OS threads (M:N)", "body": "<p>When a goroutine blocks on I/O, the runtime parks it and runs another on the same thread.</p>", "show": ["main", "sched"]}, {"short": "Pool", "tag": "Bound it", "title": "Start 10 workers reading from a jobs channel", "body": "<p>Unbounded goroutines would open 1,000 connections at once. A pool bounds concurrency.</p>", "show": ["main", "sched", "jobs", "w"], "set": {"w": {"badge": "10 waiting"}}}, {"short": "Send", "tag": "Channels", "title": "main sends URLs into the jobs channel, then closes it", "body": "<p>Channels pass data safely between goroutines: \"share memory by communicating\". A full buffer makes the sender wait, back-pressure.</p>", "flow": [["main", "jobs", "#ec4899", "url…"]], "metrics": {"sent": ["1,000"]}}, {"short": "Work", "tag": "Workers", "title": "Each worker: for url := range jobs { results <- fetch(url) }", "body": "<p>range ends when the channel is closed and drained.</p>", "show": ["main", "sched", "jobs", "w", "res"], "flow": [["jobs", "w", "#3b82f6", ""], ["w", "res", "#22c55e", "result"]], "metrics": {"done": ["612"]}}, {"short": "Ctx", "tag": "Cancellation", "title": "Every fetch takes ctx; a 5 s deadline cancels outstanding requests", "body": "<p>select { case <-ctx.Done(): return; case results <- r: }, workers stop promptly instead of leaking.</p>", "show": ["main", "sched", "jobs", "w", "res", "ctx"], "flow": [["ctx", "w", "#f59e0b", "Done()"]], "metrics": {"state": ["deadline hit"]}}, {"short": "Wait", "tag": "Join", "title": "A WaitGroup waits for all workers, then closes results", "body": "<p>main ranges over results until closed.</p>", "flow": [["res", "main", "#22c55e", "collect"]], "metrics": {"done": ["940 ok, 60 timed out"], "state": ["clean shutdown", "good"]}}, {"short": "Leak", "tag": "Pitfall", "title": "A goroutine blocked forever on a channel nobody reads is a leak", "body": "<p>Always give goroutines a way to exit: close channels, cancel contexts.</p>", "set": {"w": {"badge": "leaked?"}}}, {"short": "Race", "tag": "Pitfall", "title": "Shared map written by two goroutines → data race", "body": "<p>Protect with sync.Mutex or keep ownership in one goroutine. Run tests with -race.</p>", "set": {"w": {"badge": null}}, "note": {"kind": "key", "text": "Goroutines are cheap; bound them with a pool, connect them with channels, stop them with context, wait with WaitGroup, detect races with -race."}}]}

## Ten thousand connections, three designs

> [!STORY] Three teams build the same websocket gateway for 10,000 concurrent connections. Team A uses a thread per connection in Java 8: 10,000 OS threads, 10 GB of stack reservations and heavy context switching. Team B uses Node.js: one thread and an event loop, lean and fast, until someone adds a CPU-heavy JSON transform that stalls every connection. Team C uses Go: one goroutine per connection, written as simple blocking code, multiplexed onto a handful of threads. All three can work. Knowing *why* each behaves as it does is what interviewers look for.

## Concurrency vs parallelism

- **Concurrency** structuring a program to deal with many things at once (handling 10,000 connections).
- **Parallelism** actually executing things at the same instant on multiple cores.

A single-core machine can be concurrent but not parallel.

## Model 1: OS threads

Each thread has its own stack (often ~1 MB reserved) and is scheduled by the kernel. Blocking code is simple to write. Costs: memory per thread, context-switch overhead, and shared-memory races needing locks.

**Thread pools** bound the number of threads. Rough sizing:

- CPU-bound: about the number of cores.
- I/O-bound: cores × (1 + wait time / compute time), e.g. 8 cores, 90% waiting → ~80 threads.

## Model 2: event loop + async/await

One thread (Node.js, Python asyncio, browser JavaScript) runs many tasks cooperatively. Each task runs until it awaits I/O, then yields. Very cheap per connection; no locks needed for in-process state. Costs: any CPU-heavy or blocking call stalls everything, and "function colouring", async functions must be awaited by async callers.

## Model 3: green threads (goroutines, virtual threads)

The language runtime multiplexes many lightweight threads onto a few OS threads (**M:N scheduling**). You write plain blocking code; when a goroutine blocks on I/O, the runtime parks it and runs another. Go's goroutines start with ~2 KB stacks; Java 21's virtual threads follow the same idea.

## Go's toolkit

```go
func worker(ctx context.Context, jobs <-chan string, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for url := range jobs {
        r, err := fetch(ctx, url)
        select {
        case results <- Result{url, r, err}:
        case <-ctx.Done():
            return
        }
    }
}
```

- **Channels** typed pipes between goroutines. Unbuffered channels synchronise sender and receiver; buffered channels queue up to N items. Closing a channel signals "no more values".
- **`select`** wait on several channel operations; the first ready one proceeds. Combine with `ctx.Done()` for cancellation and `time.After` for timeouts.
- **`sync.WaitGroup`** wait for a group of goroutines to finish.
- **`sync.Mutex` / `RWMutex`** protect shared state when channels are awkward. "Share memory by communicating" is a guideline, not a law.
- **`context.Context`** carries deadlines and cancellation through call chains; pass it as the first argument to anything that can block.
- **`errgroup`** run goroutines, collect the first error, cancel the rest.

## Classic bugs

- **Goroutine leaks** a goroutine blocked forever sending to a channel nobody reads. Always provide an exit path.
- **Data races** two goroutines writing a map. Go maps aren't safe for concurrent writes; the runtime may crash with "concurrent map writes". Run tests with `go test -race`.
- **Deadlocks** all goroutines waiting on each other; the runtime detects the "all goroutines are asleep" case.
- **Loop variable capture** fixed in Go 1.22, where each iteration gets a new variable.

## Choosing a model

| Workload | Good fit |
|---|---|
| Many I/O-bound connections | event loop, goroutines, virtual threads |
| CPU-bound computation | threads/processes ≈ cores |
| Mixed | async I/O plus a separate worker pool for CPU work |
| Simple code with lots of blocking I/O | goroutines or virtual threads |

> [!RECAP]
> - Concurrency is structure; parallelism is simultaneous execution.
> - OS threads: simple, heavy. Event loop: light, but never block it. Green threads: simple *and* light.
> - Go: goroutines + channels + select + context + WaitGroup; bound work with pools.
> - Watch for leaks, races (`-race`), and deadlocks.
> - Size pools by workload: ~cores for CPU, more for I/O.

> [!INTERVIEW] "Goroutines vs threads?", "How would you limit concurrency to 10?", "Buffered vs unbuffered channels?", "How do you cancel work?", "Explain the producer-consumer pattern in Go", and "Node vs Go vs Java for 10k connections?"

::quiz {"q": "Why can a Go program run a million goroutines but not a million OS threads?", "options": ["Go cheats", "Goroutines have tiny growable stacks and are multiplexed onto few OS threads", "Go has no scheduler", "OS threads cannot block"], "answer": 1, "explain": "M:N scheduling with ~2 KB starting stacks."}

::quiz {"q": "What happens if a Node.js handler runs a 2-second CPU loop?", "options": ["Only that request waits", "Every connection on that process stalls", "Node moves it to another thread", "Nothing"], "answer": 1, "explain": "One thread runs all JavaScript."}

::quiz {"q": "How do you stop worker goroutines when a deadline passes?", "options": ["Kill the process", "Pass a context and select on ctx.Done()", "Close stdout", "Use time.Sleep"], "answer": 1, "explain": "Context carries cancellation through the call chain."}
