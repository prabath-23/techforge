---
title: Performance Engineering — Measure, Profile, Optimize
summary: Making software fast without guessing — defining performance goals with percentiles, measuring with benchmarks and load tests, finding the real bottleneck with profilers and flame graphs, the common causes of slowness (N+1 queries, chatty networks, allocations, contention, bad algorithms), optimizing in the right order, and keeping performance from regressing.
---

::widget Scene {"title": "The N+1 query problem", "sub": "a slow orders page: measure, profile, fix, measure again", "nodes": [{"id": "u", "kind": "laptop", "label": "Browser", "x": 3.72, "y": 3.72}, {"id": "app", "kind": "server", "label": "Orders page", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "db", "kind": "db", "label": "Database", "x": 12.72, "y": -5.28, "color": "purple"}, {"id": "prof", "kind": "cube", "label": "Profiler / trace", "x": 2.33, "y": -6.67, "color": "orange"}], "links": [["u", "app"], ["app", "db", {"both": true}], ["app", "prof", {"dashed": true}]], "metrics": [["q", "Queries"], ["t", "p95 page time"], ["step", "Step"]], "steps": [{"short": "Goal", "tag": "Goal", "title": "Goal: p95 under 300 ms for the orders page", "body": "<p>A number to aim at — otherwise optimisation never ends.</p>", "show": ["u", "app", "db"], "metrics": {"q": ["?"], "t": ["1.8 s", "bad"], "step": ["set goal"]}}, {"short": "Measure", "tag": "Measure", "title": "Measure a baseline under realistic data", "body": "<p>Production-sized database, not a laptop with 10 rows.</p>", "flow": [["u", "app", "#3b82f6", "GET /orders"]], "metrics": {"step": ["baseline"]}}, {"short": "Profile", "tag": "Profile", "title": "Trace one request", "body": "<p>Code runs 40 ms; the rest is database time across 101 tiny queries.</p>", "show": ["u", "app", "db", "prof"], "flow": [["app", "prof", "#f59e0b", "trace"]], "metrics": {"q": ["101"], "step": ["profile"]}}, {"short": "N1", "tag": "Diagnose", "title": "1 query for 100 orders, then 1 per order for its customer", "body": "<p>Each round trip is ~15 ms. The ORM hid it: order.customer.name inside a loop.</p>", "flow": [["app", "db", "#ef4444", "SELECT customer…"], ["app", "db", "#ef4444", ""], ["app", "db", "#ef4444", ""], ["app", "db", "#ef4444", ""]], "metrics": {"step": ["N+1 found"]}}, {"short": "Fix", "tag": "Fix", "title": "Eager-load: one join (or one IN query)", "body": "<p>select_related(\"customer\") / JOIN customers.</p>", "flow": [["app", "db", "#22c55e", "SELECT … JOIN customers"]], "metrics": {"q": ["1–2", "good"], "step": ["fix"]}}, {"short": "Again", "tag": "Measure", "title": "Measure again", "body": "<p>p95 = 240 ms. Goal met — stop optimising this page.</p>", "metrics": {"t": ["240 ms", "good"], "step": ["re-measure"]}}, {"short": "Index", "tag": "Next suspect", "title": "If it were still slow: check EXPLAIN for missing indexes", "body": "<p>Then caching, then batching remote calls — in that order of effort.</p>"}, {"short": "Guard", "tag": "Prevent", "title": "Prevent regressions", "body": "<p>A test asserting \"this endpoint makes ≤ 3 queries\", and latency dashboards per endpoint.</p>", "note": {"kind": "key", "text": "Goal → measure → profile → fix the biggest bottleneck → measure → stop. N+1 queries are the most common web performance bug."}}]}


## The optimization that made nothing faster

> [!STORY] An engineer spends a week rewriting a JSON serialization function in a clever, unreadable way, making it 40% faster in a micro-benchmark. The API endpoint it belongs to gets… 0.3% faster. A profiler would have shown, in five minutes, that 85% of the request time was spent waiting on **forty separate database queries** — one per item in the response — and that a single query with a join would make the endpoint ten times faster. Donald Knuth's famous warning applies: "premature optimization is the root of all evil" — or more usefully, **optimize what you've measured, not what you suspect**.

## Start with a goal

"Make it faster" isn't a goal. Define:

- **What** to measure: latency of the checkout API, throughput of the import job, page load time, cost per request, memory per pod.
- **Which statistic:** use **percentiles** — p50, p95, p99 — not averages (Cloud track, chapter 7). One request in a hundred taking 4 seconds matters, and averages hide it.
- **The target and conditions:** "p99 under 300 ms at 2,000 requests/second, with a warm cache".

Targets often come from SLOs and user experience: interactions feel instant under ~100 ms, users notice delays over ~1 s, and they abandon pages that take several seconds.

## The method

::widget Stepper {"type":"cycle","title":"The performance engineering loop","what":"How to make software faster without guessing. Measure first, find the biggest bottleneck, fix it, measure again — and stop when the goal is met.","steps":["Press Play and go around the loop.","Notice that 'optimize' comes only after 'profile'.","Find the step that stops you from wasting effort after the goal is reached."],"nodes":[["Define the goal","Metric, percentile, target and load conditions — e.g. p99 < 300 ms at 2k rps."],["Measure the baseline","Reproducible benchmark or load test, in a realistic environment, with realistic data. Record the numbers."],["Profile","Find where the time (or memory) actually goes: CPU profiler, flame graph, tracing, database query logs. The bottleneck is usually not where you'd guess."],["Fix the biggest bottleneck","Change one thing: a better algorithm, fewer queries, a cache, batching, less allocation."],["Measure again","Did it help, and by how much? Did anything else get worse (memory, correctness, readability)?"],["Stop or repeat","If the goal is met, stop — further optimization costs readability and time. Otherwise, profile again: the bottleneck has probably moved."]]}

> [!ANALOGY] A traffic jam on a motorway is caused by the narrowest point — maybe one lane closed at a bridge. Widening the motorway everywhere else changes nothing; fixing the bridge fixes everything. Then the **next** narrowest point becomes the bottleneck. Performance work is finding and fixing bridges, one at a time (Amdahl's law — Architecture track, chapter 6).

## Measuring properly

- **Micro-benchmarks** (JMH for Java, `pytest-benchmark`, Go's `testing.B`, Google Benchmark) for small functions — with warm-up, many iterations and statistical comparison. Beware: compilers can optimize away code whose result is unused.
- **Load tests** (k6, Gatling, Locust, wrk) for services: realistic request mixes, data sizes and concurrency; ramp up to find the breaking point; watch percentiles and errors, not just throughput.
- **Production measurement** is the ground truth: real user monitoring (page load in real browsers on real networks) and tracing of real requests.
- Measure in an environment like production — a laptop with a tiny database will mislead you.

## Profiling: finding where time goes

- **CPU profilers** sample call stacks to show which functions consume CPU (perf, async-profiler, pprof, py-spy) — visualized as **flame graphs** (OS track, chapter 14).
- **Wall-clock / off-CPU profiling** shows time spent **waiting** — on I/O, locks, network — which CPU profiles miss. For most web services, waiting dominates.
- **Distributed tracing** shows which service and which call within a request takes the time.
- **Database tools:** slow query logs, `EXPLAIN ANALYZE` (Databases track, chapter 5), query counts per request.
- **Memory profilers** find leaks and allocation hot spots; **GC logs** reveal garbage-collection pauses.
- **Browser dev tools** for front-end: network waterfall, main-thread blocking, rendering.

## The usual suspects

Most performance problems fall into a handful of patterns. Check these first.

### Doing work you don't need

- **N+1 queries:** fetching a list, then one query per item. Fix: a join, an `IN (…)` batch query, or ORM eager loading.

```python
# N+1: 1 query for orders, then 1 per order for its customer → 101 queries for 100 orders
orders = Order.objects.filter(status="open")
names = [o.customer.name for o in orders]

# 2 queries total (or 1 with a join)
orders = Order.objects.filter(status="open").select_related("customer")
names = [o.customer.name for o in orders]
```

- **Repeated computation:** cache results that are expensive and reused (memoization, application caches, HTTP caching, CDNs).
- **Fetching too much:** `SELECT *`, unpaginated lists, huge JSON responses, over-fetching in GraphQL.

### Doing it the slow way

- **Wrong algorithm or data structure:** an O(n²) loop with a list lookup inside (`if x in big_list`) becomes O(n) with a set — often the single biggest win (Algorithms track).
- **Missing indexes** on database queries.
- **Cache-unfriendly memory access** in hot loops (Architecture track, chapter 5).

### Waiting instead of working

- **Sequential network calls** that could run **in parallel** (call three services concurrently instead of one after another).
- **Chatty protocols:** many small round trips — batch them.
- **Synchronous work that could be asynchronous:** send the confirmation email from a queue, not inside the request (System Design track).
- **Connection setup** on every request — use connection pooling and keep-alive (Networking track, chapter 14).

### Contention and resource limits

- **Lock contention** and hot rows in the database; single-threaded bottlenecks.
- **Thread or connection pool exhaustion:** requests queue waiting for a free worker.
- **Garbage collection pressure** from excessive allocation; memory swapping.
- **CPU throttling** from container limits (check cgroup throttling metrics).

> [!EXAMPLE] **A real optimization sequence.** A product page took p99 1.8 s. Tracing showed: 38 sequential calls to the pricing service (one per variant) — batched into one call: p99 → 650 ms. Then a missing composite index on the reviews query: → 380 ms. Then caching the rendered "related products" block for 60 seconds: → 190 ms. Goal (300 ms) met; the team stopped there instead of micro-optimizing serialization.

## Optimize in the right order

1. **Do less:** remove unnecessary work, fetch less, cache.
2. **Use better algorithms and data structures.**
3. **Do work concurrently or asynchronously.**
4. **Use resources better:** pooling, batching, fewer allocations.
5. **Micro-optimize** hot code only when profiles prove it's the bottleneck.
6. **Add hardware** — sometimes the cheapest option of all, but measure the cost (Cloud track, chapter 12).

Every optimization has a cost in complexity. Prefer the simplest change that meets the goal, and comment non-obvious optimizations with the measurements that justified them.

## Front-end performance in brief

- **Ship less JavaScript** (code-splitting, removing unused libraries); compress and cache assets on a CDN.
- **Optimize images:** modern formats, correct sizes, lazy loading.
- **Avoid long main-thread tasks** that freeze the page.
- Track **Core Web Vitals:** Largest Contentful Paint (loading), Interaction to Next Paint (responsiveness), Cumulative Layout Shift (visual stability).

## Keep it fast

Performance regresses quietly, one small change at a time.

- **Performance tests in CI** for critical paths, with thresholds that fail the build on significant regressions.
- **Dashboards and alerts** on latency percentiles per endpoint and on resource usage.
- **Performance budgets:** "the home page ships under 200 KB of JavaScript"; "this endpoint makes at most 3 queries".
- **Load-test before big launches** and capacity-plan for growth.

> [!RECAP]
> - Set a concrete goal using **percentiles** under realistic load.
> - **Measure → profile → fix the biggest bottleneck → measure again → stop when the goal is met.**
> - Use the right tools: benchmarks, load tests, CPU and off-CPU profilers, flame graphs, tracing, query plans.
> - Usual suspects: **N+1 queries**, missing indexes, wrong algorithms, sequential network calls, missing caching, contention, pool exhaustion, GC pressure.
> - Optimize in order: do less, better algorithms, concurrency, better resource use, micro-optimizations, hardware.
> - Prevent regressions with CI performance tests, budgets and monitoring.

> [!INTERVIEW] Expect "this endpoint is slow — how would you investigate?" (measure, trace, profile, check queries), "what's an N+1 query?", why p99 matters, and a behavioral story about a performance improvement with before/after numbers.

::quiz {"q":"An endpoint loads 100 orders and runs one extra query per order for its customer. What is this called and how do you fix it?","options":["A deadlock; add locks","An N+1 query problem; batch with a join, IN query or eager loading","A cache stampede; add TTLs","Overfitting; add data"],"answer":1,"explain":"101 queries become 1 or 2."}

::quiz {"q":"Why profile before optimizing?","options":["Profilers make code faster","The real bottleneck is often not where you'd guess, so optimizing elsewhere wastes effort","It's required by compilers","To increase coverage"],"answer":1,"explain":"Optimize what you've measured."}

::quiz {"q":"Your service mostly waits on databases and other services. Which profile best shows where time goes?","options":["A CPU-only profile","Wall-clock/off-CPU profiling and distributed tracing","A memory profile","A disk benchmark"],"answer":1,"explain":"CPU profiles miss time spent waiting."}
