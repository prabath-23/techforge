---
title: The JavaScript Event Loop: One Thread, Many Things Happening
summary: How single-threaded JavaScript handles timers, network responses and clicks: the call stack, Web APIs, the task queue, the microtask queue for promises, rendering opportunities, and why a long loop freezes the page, with the classic "what order does this print?" puzzles explained.
---

::widget Scene {"title": "Microtasks before macrotasks", "sub": "trace console.log order for a timer, a promise and plain code", "nodes": [{"id": "stack", "kind": "cells", "label": "call stack", "x": 0.0, "y": 0.0, "values": ["", "", ""]}, {"id": "api", "kind": "cube", "label": "Web APIs (timers, fetch)", "x": 8.0, "y": -8.0, "color": "purple"}, {"id": "micro", "kind": "cells", "label": "microtask queue (promises)", "x": 5.27, "y": 5.27, "values": ["", ""]}, {"id": "macro", "kind": "cells", "label": "task queue (timers, events)", "x": 9.92, "y": 9.92, "values": ["", ""]}, {"id": "out", "kind": "doc", "label": "Console", "x": 15.75, "y": -0.25, "color": "green"}], "metrics": [["code", "Running"], ["printed", "Printed so far"]], "steps": [{"short": "Code", "tag": "Setup", "title": "console.log(\"A\"); setTimeout(() => log(\"B\"), 0); Promise.resolve().then(() => log(\"C\")); log(\"D\")", "body": "<p>What prints, and in what order? JavaScript runs one thing at a time on one thread.</p>", "metrics": {"code": ["script"], "printed": ["-"]}}, {"short": "A", "tag": "Stack", "title": "The script runs on the call stack: log(\"A\")", "body": "<p>Synchronous code runs to completion before anything else gets a turn.</p>", "set": {"stack": {"marks": {"0": "blue"}, "ptr": {}, "values": ["script", "log A", ""]}}, "show": ["stack", "micro", "macro", "out"], "metrics": {"printed": ["A"]}}, {"short": "Timer", "tag": "Web API", "title": "setTimeout hands the callback to the browser's timer", "body": "<p>Even with 0 ms, the callback can only run later, as a separate task.</p>", "show": ["stack", "micro", "macro", "out", "api"], "set": {"stack": {"marks": {"0": "blue"}, "ptr": {}, "values": ["script", "", ""]}, "api": {"badge": "timer 0 ms"}}}, {"short": "Queue", "tag": "Task queue", "title": "The timer fires and queues B as a task (macrotask)", "body": "<p>Tasks wait until the stack is empty.</p>", "set": {"macro": {"marks": {"0": "orange"}, "ptr": {}, "values": ["B", ""]}, "api": {"badge": null}}}, {"short": "Promise", "tag": "Microtask", "title": ".then(C) on a resolved promise queues a microtask", "body": "<p>Microtasks have priority: the whole microtask queue is drained after the current script, before any other task.</p>", "set": {"micro": {"marks": {"0": "purple"}, "ptr": {}, "values": ["C", ""]}}}, {"short": "D", "tag": "Stack", "title": "log(\"D\"), still the same synchronous script", "body": "<p>Printed: A, D.</p>", "set": {"stack": {"marks": {"1": "blue"}, "ptr": {}, "values": ["script", "log D", ""]}}, "metrics": {"printed": ["A, D"]}}, {"short": "Empty", "tag": "Checkpoint", "title": "Script finished: stack empty → drain ALL microtasks", "body": "<p>C runs now.</p>", "set": {"stack": {"marks": {"0": "purple"}, "ptr": {}, "values": ["C", "", ""]}, "micro": {"marks": {}, "ptr": {}, "values": ["", ""]}}, "metrics": {"code": ["microtask C"], "printed": ["A, D, C"]}}, {"short": "Render", "tag": "Render", "title": "The browser may render a frame here", "body": "<p>Between tasks, if it is time for a frame (and something changed).</p>"}, {"short": "B", "tag": "Task", "title": "Next task from the queue: B", "body": "<p>Final order: A, D, C, B.</p>", "set": {"stack": {"marks": {"0": "orange"}, "ptr": {}, "values": ["B", "", ""]}, "macro": {"marks": {}, "ptr": {}, "values": ["", ""]}}, "metrics": {"code": ["task B"], "printed": ["A, D, C, B", "good"]}}, {"short": "Rule", "tag": "Rule", "title": "The loop, in one line", "body": "<p>Run one task → drain all microtasks → maybe render → repeat. A microtask that keeps queueing microtasks can starve rendering forever.</p>", "note": {"kind": "key", "text": "Synchronous code first, then every microtask (promises, await continuations, queueMicrotask), then the next task (timers, events, messages)."}}]}

## A button that froze the whole page

> [!STORY] A product page has a "Sort 20,000 reviews" button. Clicking it freezes the page for two seconds: the spinner doesn't spin, scrolling stops, other buttons ignore clicks. Developers add a loading spinner, which never appears, because the browser can't draw it while the sort runs. The fix isn't a faster spinner; it's understanding that JavaScript in the browser runs on **one main thread** shared with rendering, and that nothing else happens until your code returns.

## One thread, one call stack

JavaScript executes on a single main thread with a single **call stack**. When a function is called it's pushed; when it returns it's popped. While anything is on the stack, the browser can't run other JavaScript, respond to clicks, or render a new frame.

So how do timers, network requests and clicks work without blocking? The slow parts aren't done by JavaScript at all.

## The browser does the waiting

`setTimeout`, `fetch`, DOM events and `IndexedDB` are **Web APIs** provided by the browser (in Node.js, by libuv). JavaScript asks the browser to start the work and registers a callback. The browser waits, on its own threads, and when the work is done it queues the callback to run later on the main thread.

> [!ANALOGY] A restaurant with one chef (the main thread). The chef never stands at the oven waiting; they put the dish in, set a timer, and cook the next order. When the timer rings, a ticket goes on the rail (the queue), and the chef picks it up once the current dish is plated.

## Tasks and microtasks

There are two kinds of queued work:

- **Tasks (macrotasks):** timer callbacks, user events (click, keypress), network events, `postMessage`, `MessageChannel`.
- **Microtasks:** promise reactions (`.then`, `.catch`, `.finally`), the continuation after `await`, `queueMicrotask`, `MutationObserver` callbacks.

The event loop repeats:

1. Take **one** task from the task queue and run it to completion.
2. Run **all** microtasks, including any new microtasks they queue, until the microtask queue is empty.
3. If it's time for a new frame, **render**: run `requestAnimationFrame` callbacks, style, layout, paint.
4. Go back to step 1.

```js
console.log('A')
setTimeout(() => console.log('B'), 0)
Promise.resolve().then(() => console.log('C'))
console.log('D')
// A, D, C, B
```

## How async/await fits in

`await` is syntax over promises. Everything after an `await` runs as a **microtask** once the awaited promise settles:

```js
async function f() {
  console.log(1)
  await null          // the rest of f becomes a microtask
  console.log(3)
}
f(); console.log(2)   // 1, 2, 3
```

`async` doesn't make code run on another thread. CPU-heavy work inside an async function still blocks the page.

## Keeping the page responsive

- **Break up long tasks.** Process 20,000 items in chunks of 500, yielding between chunks with `await new Promise(r => setTimeout(r))` or `scheduler.yield()` where supported, so the browser can render and handle input.
- **Move heavy work off the main thread** with a **Web Worker**: a separate thread with its own event loop, communicating via `postMessage`. Workers can't touch the DOM.
- **Use `requestAnimationFrame`** for visual updates so they line up with frames.
- **Debounce/throttle** expensive handlers on scroll, resize and input.

> [!WARN] An infinite chain of microtasks (a `.then` that schedules another `.then` forever) starves rendering completely, even worse than a long loop, because the loop at least ends.

## Node.js is similar, with extra phases

Node's event loop has phases (timers, pending callbacks, poll for I/O, check for `setImmediate`, close callbacks), and drains `process.nextTick` callbacks and promise microtasks between them. The key ideas carry over: one JavaScript thread, I/O done elsewhere, microtasks first.

> [!RECAP]
> - One main thread and one call stack; while your code runs, nothing else does, not even rendering.
> - Web APIs do the waiting and queue callbacks.
> - Loop: one **task** → **all microtasks** → maybe **render** → repeat.
> - Promise callbacks and code after `await` are microtasks; timers and events are tasks.
> - Keep tasks short: chunk work, yield, use Web Workers for CPU-heavy jobs.

> [!INTERVIEW] The classic question is "what does this print?" with a mix of `setTimeout`, promises and `async/await`. Walk through it: synchronous logs first, then microtasks in order, then tasks. Follow-ups: "Why doesn't my spinner show?", "setTimeout(0) vs queueMicrotask?", "How do Web Workers help?"

::quiz {"q": "What prints? log(1); setTimeout(()=>log(2)); Promise.resolve().then(()=>log(3)); log(4)", "options": ["1 2 3 4", "1 4 3 2", "1 3 4 2", "1 4 2 3"], "answer": 1, "explain": "Sync first (1, 4), then microtasks (3), then tasks (2)."}

::quiz {"q": "Why doesn't a spinner appear while a 2-second loop runs?", "options": ["Spinners need WebGL", "The main thread is busy, so the browser cannot render a frame", "CSS is disabled during loops", "Timers are paused"], "answer": 1, "explain": "Rendering happens on the same thread, between tasks."}

::quiz {"q": "Where does code after `await` run?", "options": ["On a new thread", "As a microtask after the awaited promise settles", "Immediately, synchronously", "In the next animation frame"], "answer": 1, "explain": "await schedules the continuation as a microtask."}
