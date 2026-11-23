---
title: Reliability: Designing Systems That Survive Failure
summary: In large systems something is always broken. This chapter covers the patterns that keep a small failure from becoming a total outage, timeouts, retries done safely, circuit breakers, bulkheads, shedding load, rate limiting, plus surviving the loss of a whole data center, and testing it all on purpose with chaos engineering.
---

::widget Scene {"title": "Timeouts, retries and circuit breakers", "sub": "how one slow dependency takes down a whole site, and how to stop it", "nodes": [{"id": "u", "kind": "user", "label": "Users", "x": 3.72, "y": 3.72}, {"id": "api", "kind": "server", "label": "Checkout API", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "cb", "kind": "cube", "label": "Circuit breaker", "x": 11.72, "y": -4.28, "color": "orange"}, {"id": "rec", "kind": "server", "label": "Recommendations", "x": 12.62, "y": -11.38, "color": "purple"}, {"id": "pay", "kind": "server", "label": "Payments", "x": 19.13, "y": -4.87, "color": "green"}], "links": [["u", "api"], ["api", "cb"], ["cb", "rec"], ["api", "pay"]], "metrics": [["threads", "API threads busy"], ["circuit", "Circuit"], ["user", "User experience"]], "steps": [{"short": "Normal", "tag": "Setup", "title": "Checkout calls recommendations and payments", "body": "<p>Recommendations answer in 40 ms. The API has a pool of 200 worker threads.</p>", "show": ["u", "api", "rec", "pay"], "flow": [[["u", "api", "rec"], "#3b82f6", ""], [["api", "pay"], "#22c55e", ""]], "metrics": {"threads": ["20 / 200"], "circuit": ["-"], "user": ["fast", "good"]}}, {"short": "Slow", "tag": "Failure", "title": "Recommendations start taking 30 s", "body": "<p>It isn't down, it's slow. That is worse, because callers wait.</p>", "set": {"rec": {"badge": "p99 30 s"}}, "flow": [["api", "rec", "#ef4444", "waiting…"]]}, {"short": "Pile", "tag": "Cascade", "title": "Threads pile up waiting", "body": "<p>Every checkout request holds a thread for 30 s. In seconds all 200 are stuck, including requests that only needed payments.</p>", "set": {"api": {"badge": "pool exhausted"}}, "metrics": {"threads": ["200 / 200", "bad"], "user": ["site down", "bad"]}, "note": {"kind": "warn", "text": "A slow non-critical dependency just took down the critical path. This is a cascading failure."}}, {"short": "Timeout", "tag": "Fix 1", "title": "Set a timeout on every call: 300 ms", "body": "<p>Base it on the dependency's normal p99. A slow call now costs 300 ms, not 30 s.</p>", "set": {"api": {"badge": null}}, "flow": [["api", "rec", "#f59e0b", "give up at 300 ms"]], "metrics": {"threads": ["60 / 200"]}}, {"short": "Retry", "tag": "Fix 2", "title": "Retry transient failures with exponential backoff + jitter", "body": "<p>Wait 100 ms, 200 ms, 400 ms… with randomness so thousands of clients don't retry at the same instant. Only retry idempotent operations.</p>", "flow": [["api", "rec", "#f59e0b", "retry 1"], ["api", "rec", "#f59e0b", "retry 2"]]}, {"short": "Storm", "tag": "Danger", "title": "But retries multiply load on a struggling service", "body": "<p>3 retries at each of 3 layers = up to 27× traffic. The sick service never recovers.</p>", "set": {"rec": {"badge": "load ×9"}}, "metrics": {"user": ["slow"], "threads": ["120 / 200", "bad"]}}, {"short": "Breaker", "tag": "Fix 3", "title": "Add a circuit breaker: CLOSED, counting failures", "body": "<p>Calls pass through normally while the breaker tracks the error rate over a window.</p>", "show": ["u", "api", "cb", "rec", "pay"], "flow": [[["api", "cb", "rec"], "#f59e0b", ""]], "set": {"cb": {"badge": "CLOSED 40% errors"}}, "metrics": {"circuit": ["closed"]}}, {"short": "Open", "tag": "Trip", "title": "Errors exceed 50%: the breaker OPENS", "body": "<p>Now calls fail instantly without touching recommendations. It gets breathing room to recover.</p>", "set": {"cb": {"badge": "OPEN", "color": "red"}, "rec": {"badge": "recovering"}}, "flow": [["api", "cb", "#ef4444", "fail fast (0 ms)"]], "metrics": {"circuit": ["open", "bad"], "threads": ["20 / 200", "good"]}}, {"short": "Fallback", "tag": "Degrade", "title": "Serve a fallback: \"popular items\" from cache", "body": "<p>The page loads with slightly worse recommendations instead of failing. Payments were never affected.</p>", "flow": [["api", "u", "#22c55e", "page + popular items"], ["api", "pay", "#22c55e", "pay"]], "metrics": {"user": ["works, degraded", "good"]}}, {"short": "Half", "tag": "Probe", "title": "After 30 s: HALF-OPEN, let a few trial calls through", "body": "<p>If they fail, open again. If they succeed…</p>", "set": {"cb": {"badge": "HALF-OPEN", "color": "orange"}}, "flow": [["cb", "rec", "#f59e0b", "trial"]], "metrics": {"circuit": ["half-open"]}}, {"short": "Close", "tag": "Recover", "title": "…the breaker CLOSES and normal traffic resumes", "body": "<p>No human had to intervene.</p>", "set": {"cb": {"badge": "CLOSED", "color": "green"}, "rec": {"badge": null}}, "flow": [[["api", "cb", "rec"], "#22c55e", "40 ms"]], "metrics": {"circuit": ["closed", "good"]}}, {"short": "Bulkhead", "tag": "Fix 4", "title": "Bulkheads: give each dependency its own small thread pool", "body": "<p>Recommendations can use at most 30 threads. Even if they all hang, payments still have theirs, like watertight compartments in a ship.</p>", "note": {"kind": "key", "text": "Timeouts everywhere, retries with backoff + jitter and a budget, circuit breakers with fallbacks, bulkheads per dependency."}}]}

::widget Scene {"title": "Rate limiting with a token bucket", "sub": "10 requests per second, bursts up to 20", "nodes": [{"id": "c", "kind": "laptop", "label": "Client", "x": 3.1, "y": 3.1}, {"id": "b", "kind": "blocks", "label": "Token bucket", "x": 7.6, "y": -1.4, "count": 8, "color": "yellow"}, {"id": "api", "kind": "server", "label": "API", "x": 12.1, "y": -5.9, "color": "blue"}], "links": [["c", "b"], ["b", "api"]], "metrics": [["tokens", "Tokens"], ["res", "Result"]], "steps": [{"short": "Refill", "tag": "Idea", "title": "Tokens drip in at 10 per second, up to 20", "body": "<p>Each request must take a token. Unused tokens accumulate, allowing short bursts.</p>", "metrics": {"tokens": ["8"], "res": ["-"]}}, {"short": "Allowed", "tag": "Pass", "title": "A request takes a token and passes", "body": "<p>Fast check, usually in Redis so every API server shares the same bucket.</p>", "set": {"b": {"count": 7}}, "flow": [[["c", "b", "api"], "#22c55e", "request"]], "metrics": {"tokens": ["7"], "res": ["200 OK", "good"]}}, {"short": "Burst", "tag": "Drain", "title": "A burst empties the bucket", "body": "<p>Eight quick requests use up the remaining tokens.</p>", "set": {"b": {"count": 0, "badge": "empty"}}, "flow": [["c", "b", "#f59e0b", "burst ×8"]], "metrics": {"tokens": ["0"]}}, {"short": "Rejected", "tag": "Limit", "title": "The next request gets 429 Too Many Requests", "body": "<p>With a <code>Retry-After</code> header. Protects the API from abuse and noisy neighbours.</p>", "flow": [["b", "c", "#ef4444", "429 Retry-After: 1"]], "metrics": {"res": ["429", "bad"]}, "note": {"kind": "key", "text": "Limit per user, per API key and per IP. Rate limits are also a key DDoS and cost-control defence."}}]}


::widget Scene {"title": "Redundancy and failover across zones", "sub": "surviving a data-centre fire", "nodes": [{"id": "lb", "kind": "router", "label": "Load balancer", "x": 2.17, "y": -6.83, "color": "teal"}, {"id": "a", "kind": "server", "label": "App (zone A)", "x": 3.1, "y": 3.1, "color": "blue"}, {"id": "b", "kind": "server", "label": "App (zone B)", "x": 12.1, "y": -5.9, "color": "blue"}, {"id": "dba", "kind": "db", "label": "Primary DB (A)", "x": 9.3, "y": 9.3, "color": "purple"}, {"id": "dbb", "kind": "db", "label": "Standby DB (B)", "x": 18.3, "y": 0.3, "color": "purple"}], "links": [["lb", "a"], ["lb", "b"], ["a", "dba"], ["b", "dba", {"dashed": true}], ["dba", "dbb", {"label": "sync replication"}]], "metrics": [["up", "Serving traffic"]], "steps": [{"short": "Two zones", "tag": "Design", "title": "Everything runs in two independent data centres", "body": "<p>Separate power, cooling and network.</p>", "metrics": {"up": ["A + B", "good"]}}, {"short": "Zone A fails", "tag": "Failure", "title": "Zone A goes dark", "body": "<p>The load balancer's health checks fail for zone A.</p>", "set": {"a": {"dim": true}, "dba": {"dim": true, "badge": "down"}}, "metrics": {"up": ["B only"]}}, {"short": "Failover", "tag": "Recover", "title": "Traffic shifts to B; the standby database is promoted", "body": "<p>Because replication was synchronous, no committed data is lost. Users see a brief blip.</p>", "set": {"dbb": {"label": "Primary DB (B)", "badge": "promoted"}}, "flow": [[["lb", "b", "dbb"], "#22c55e", "traffic"]], "metrics": {"up": ["B", "good"]}, "note": {"kind": "key", "text": "Test failover regularly (game days). An untested failover plan usually fails when you need it."}}]}

## Failure is normal

In a big system, failure isn't an exception; it's the weather. With 10,000 servers, a few hardware failures **every day** are routine. Deploys introduce bugs. A dependency slows down. A network link gets congested. A whole data center has a power problem.

Reliable systems don't try to prevent every failure, that's impossible. They **contain** failures, so one broken piece degrades gracefully instead of taking everything down.

> [!NOTE] Most big outages aren't caused by one dramatic failure. They're **cascading failures**: something small slows down, other things wait for it and pile up, they run out of resources and slow down too, and the problem spreads until everything is down. Almost every pattern in this chapter exists to break that chain.

## The slowest piece decides your speed

Averages hide pain. Look at **percentiles**: the 99th percentile (p99) latency is the time within which 99% of requests finish, so 1 in 100 users waits longer.

Now imagine one page load calls 100 backend services in parallel, and each is slow 1% of the time. The chance that **at least one** of them is slow is 1 − 0.99¹⁰⁰ ≈ **63%**. Most users experience the slow case! In big systems, every component's rare bad moment becomes the user's common experience.

> [!EXAMPLE] **Hedged requests.** Google's systems often send a request to one server, and if no answer arrives within the 95th-percentile time, send the same request to a second server and use whichever answers first. It adds only a few percent extra load but sharply cuts the slowest responses.

## Pattern 1: Timeouts on everything

Every network call must have a **timeout**. Many libraries' default is "wait forever". A dependency that becomes slow then ties up your threads one by one, until your own service can't accept new requests, a cascade.

- Base timeouts on measured response times (a little above the dependency's p99.9), not guesses.
- **Pass deadlines along:** if a user's request has 2 seconds left, every service it calls should know that, so nobody keeps working on a request the user has already given up on. gRPC does this automatically.

## Pattern 2: Retries, helpful and dangerous

Retrying smooths over brief hiccups: a dropped packet, a server restarting. But retries done carelessly cause disasters.

Rules for safe retries:

1. **Only retry operations that are safe to repeat** (idempotent ones, Networking track, chapter 8), or use idempotency keys.
2. **Only retry errors that might go away:** timeouts and "service unavailable", not "bad request" or "forbidden".
3. **Wait longer each time, with randomness** (exponential backoff with jitter): about 100 ms, then 200 ms, then 400 ms, each randomized. Without randomness, thousands of clients retry at exactly the same moments, in synchronized waves.
4. **Limit retries** and keep a **retry budget** for example, retries may add at most 10% extra traffic.
5. **Retry at only one layer.**

> [!STORY] **The retry storm.** A database slows down slightly. Its callers time out and retry three times. The services calling *those* also time out and retry three times, and so on through four layers: 3 × 3 × 3 × 3 = **81 times** the original traffic now hits the struggling database. It was slightly slow; now it's completely buried, and it can't recover because the retries keep coming. Many large outages have followed exactly this script.

```python
import random, time
def call_with_retries(call, attempts=4, base=0.1, cap=2.0):
    for attempt in range(attempts):
        try:
            return call()
        except TemporaryError:
            if attempt == attempts - 1:
                raise
            time.sleep(random.uniform(0, min(cap, base * 2 ** attempt)))   # backoff with "full jitter"
```

## Pattern 3: Circuit breakers

If a dependency is clearly broken, continuing to call it wastes your resources and keeps it from recovering. A **circuit breaker** like the one in your home's electrical panel, cuts the connection when something is wrong:

::widget Stepper {"type":"cycle","title":"The three states of a circuit breaker","what":"A circuit breaker sits around calls to a dependency and switches between three states depending on how those calls are going.","steps":["Press Play to go around the cycle.","Notice that in the Open state, calls fail instantly without touching the broken service.","Ask: why test with just a few requests in Half-open instead of all of them?"],"nodes":[["Closed (normal)","Calls go through normally. The breaker counts failures over a recent window."],["Open (tripped)","Too many failures (say over 50% of the last 20 calls). Now calls fail immediately, or return a fallback, without contacting the dependency. Your service stays fast and the dependency gets breathing room."],["Half-open (testing)","After a cool-down, a few trial calls are allowed through. If they succeed, the breaker closes again. If they fail, it opens again and waits longer."]]}

Pair it with a **fallback**: show cached data, a default, or a slightly reduced experience ("recommendations are unavailable right now") instead of an error page.

> [!EXAMPLE] Netflix popularized circuit breakers with its Hystrix library. If the personalized recommendations service failed, Netflix still showed a row of generally popular titles instead of breaking the home page. Users barely noticed.

## Pattern 4: Bulkheads

Ships are divided into watertight compartments, called **bulkheads** so one hole doesn't sink the whole ship. In software: **separate resources** for separate dependencies or customers.

> [!EXAMPLE] A service has one shared pool of 200 threads for all outgoing calls. The rarely used "export to PDF" dependency becomes slow, and all 200 threads end up waiting on it. Now checkout, search and login fail too, though nothing is wrong with them. Give each dependency **its own** small pool, and a slow PDF service can only use up its own threads.

The same idea at a bigger scale is a **cell-based architecture**: split the whole system into independent copies ("cells"), each serving a subset of customers. A bad deploy or a poisonous request then affects one cell, not everyone. AWS and Slack use this approach.

## Pattern 5: Shed load instead of collapsing

When more requests arrive than you can handle, trying to serve them all usually means serving **none** of them well: queues grow, every request becomes slow, everything times out, and the work was wasted. It's better to **reject the excess early** quickly and cheaply:

- Keep queues **bounded**; when full, reply "busy, try again" immediately (HTTP 503 or 429).
- **Shed by priority:** drop analytics and background prefetching before checkout and login.
- **Degrade gracefully:** under heavy load, switch off expensive extras, personalized recommendations, high-resolution images, using feature flags.

> [!ANALOGY] A popular restaurant that's full tells new arrivals "there's a 40-minute wait" at the door. A badly run one seats everyone, and then nobody gets served at all because the kitchen is overwhelmed.

## Pattern 6: Rate limiting

**Rate limits** protect a service from abuse, from runaway clients and from any one customer hogging shared capacity. The most common algorithm is the **token bucket**:

- A bucket holds up to B tokens and refills at R tokens per second.
- Each request takes one token. No token → the request is rejected with **429 Too Many Requests**.
- So a client can **burst** up to B requests at once, but over time can't exceed R per second.

::widget TokenBucket {}

Other algorithms: **fixed windows** ("100 requests per calendar minute", simple, but allows double bursts at the edges between minutes) and **sliding windows** (more accurate).

Rate limits are usually enforced at the **edge** (API gateway or load balancer), keyed by **API key or user ID** (an IP address can be shared by thousands of people behind NAT, Networking track, chapter 2). Across many servers, the counters typically live in **Redis**. Good APIs tell clients how many requests they have left (`X-RateLimit-Remaining`) and when to try again (`Retry-After`).

> [!EXAMPLE] GitHub's API allows authenticated users 5,000 requests per hour and returns these headers on every response, so well-behaved tools can slow down before they hit the limit.

## Changes cause most outages

The most common trigger for an outage isn't hardware, it's **a change**: a deploy, a configuration change, a new feature flag. Defenses:

- **Canary releases:** roll out to 1% of servers or users first, compare error rates and latency with the rest, and roll back automatically if things get worse (Cloud track → CI/CD).
- **Progressive rollouts:** one server → one data center → one region → everyone, with pauses and automatic checks in between.
- **Fast rollback** paths and feature flags that can switch a feature off in seconds.

> [!STORY] **CrowdStrike, July 2024.** A faulty update to security software that runs inside the Windows kernel was pushed to millions of computers at roughly the same time. About 8.5 million machines crashed and couldn't boot properly, grounding flights and disrupting hospitals, banks and broadcasters worldwide. A gradual rollout, starting with a small percentage of machines, would have caught it after a tiny fraction of that damage. It's now a textbook example of why progressive rollouts matter.

## Surviving a data center disaster

- **Availability zones:** cloud regions contain several separate data centers ("zones") with independent power and networking, close enough for fast connections. Running every component in at least two or three zones is the baseline for any serious system.
- **Multiple regions:** to survive a whole region failing (rare, but it happens), run in several regions.
  - **Active-passive:** one region serves traffic; another holds a copy, ready to take over. Simpler, but failover takes minutes and may lose the last few seconds of data.
  - **Active-active:** every region serves users. Faster for users worldwide and instant failover, but writes in two regions can conflict, you need a strategy (each user has a home region, or a globally consistent database like Spanner).
- Two numbers define your disaster goals: **RPO** (recovery point objective), how much recent data you can afford to lose; and **RTO** (recovery time objective), how long you can afford to be down.
- **Backups only count if you've tested restoring them.** Keep at least one copy that production credentials can't delete (to survive ransomware or a disastrous command).

## Breaking things on purpose: chaos engineering

How do you know your timeouts, retries, failovers and backups actually work? You **cause failures deliberately** in controlled experiments:

> [!EXAMPLE] **Netflix's Chaos Monkey** randomly shuts down production servers during working hours. Since engineers knew any server could vanish at any moment, they built every service to survive it. Netflix later went further, simulating the loss of entire availability zones and regions. Many companies now run planned **game days**: "today at 2 pm we'll cut off the payment service's database and see what happens."

> [!RECAP]
> - Failure is constant; the goal is to **contain** it and prevent **cascades**.
> - Tail latency compounds across many dependencies; **hedged requests** help.
> - Put **timeouts** on every call and pass **deadlines** along.
> - **Retry** only safe operations, with **exponential backoff + jitter** limits, a budget, and at one layer, or risk a **retry storm**.
> - **Circuit breakers** fail fast with fallbacks; **bulkheads** isolate resources; **load shedding** and **rate limiting** protect capacity.
> - Most outages come from **changes**: use canaries and progressive rollouts (remember CrowdStrike).
> - Spread across **zones and regions** define **RPO/RTO** test restores, and practice failures with **chaos engineering**.

> [!INTERVIEW] In any design, proactively mention: timeouts everywhere; retries with backoff and jitter only for safe operations; circuit breakers and fallbacks; rate limiting at the edge; load shedding; multi-zone deployment; and how you'd survive a region failure, with RPO and RTO. "Design a rate limiter" is one of the most common questions, cover the algorithm, where it runs, where the counters live, and what the client sees.

::quiz {"q":"Why add random jitter to retry delays?","options":["To make retries faster","So clients don't all retry at the same instant in synchronized waves","To use fewer retries","HTTP requires it"],"answer":1,"explain":"Synchronized retries create spikes that can keep a recovering service down."}

::quiz {"q":"Four layers of services each retry a failed call 3 times. How many calls can reach the bottom service for one user request?","options":["12","27","81","4"],"answer":2,"explain":"3 × 3 × 3 × 3 = 81, a retry storm. Retry at one layer and use retry budgets."}

::quiz {"q":"What does an open circuit breaker do?","options":["Retries calls aggressively","Fails calls immediately (or returns a fallback) without calling the broken dependency","Queues calls until recovery","Sends calls to another region"],"answer":1,"explain":"Failing fast protects the caller and gives the dependency time to recover."}
