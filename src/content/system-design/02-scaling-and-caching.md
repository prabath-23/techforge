---
title: Scaling and Caching: Handling More Users, Faster
summary: Two ways to grow (bigger machines vs more machines), why servers should forget everything between requests, and caching, the single most powerful tool for speed, including where caches live, how to keep them correct, and the classic ways they fail (stampedes, hot keys) that have taken down real sites.
---

::widget Scene {"title": "Scaling a web app from one server to a million users", "sub": "each step fixes the bottleneck the last one exposed", "nodes": [{"id": "u", "kind": "user", "label": "Users", "x": 3.72, "y": 3.72}, {"id": "cdn", "kind": "cloud", "label": "CDN", "x": 2.06, "y": -4.54, "color": "green"}, {"id": "lb", "kind": "router", "label": "Load balancer", "x": 7.02, "y": 0.42, "color": "blue"}, {"id": "a1", "kind": "server", "label": "App 1", "x": 6.8, "y": -6.8, "color": "blue"}, {"id": "a2", "kind": "server", "label": "App 2", "x": 10.52, "y": -3.08, "color": "blue"}, {"id": "a3", "kind": "server", "label": "App 3", "x": 14.24, "y": 0.64, "color": "blue"}, {"id": "ses", "kind": "cache", "label": "Redis (sessions + cache)", "x": 10.4, "y": -10.4, "color": "orange"}, {"id": "db", "kind": "db", "label": "Primary DB", "x": 14.43, "y": -6.37, "color": "purple"}, {"id": "rep", "kind": "db", "label": "Read replica", "x": 18.03, "y": -9.97, "color": "purple"}, {"id": "q", "kind": "queue", "label": "Queue", "x": 18.46, "y": -2.34, "color": "pink"}, {"id": "w", "kind": "cpu", "label": "Workers", "x": 22.06, "y": -5.94, "color": "pink"}], "links": [["u", "lb"], ["u", "cdn", {"dashed": true}], ["lb", "a1"], ["lb", "a2"], ["lb", "a3"], ["a1", "ses"], ["a1", "db"], ["a2", "db"], ["a3", "db"], ["db", "rep", {"label": "replicate"}], ["a3", "q"], ["q", "w"]], "metrics": [["users", "Users"], ["pain", "Bottleneck"], ["fix", "Fix"]], "steps": [{"short": "One box", "tag": "Start", "title": "Everything on one server", "body": "<p>Web app and database on a single machine. Perfect for the first 1,000 users: simple to build, deploy and debug.</p>", "show": ["u", "a1"], "set": {"a1": {"label": "App + DB"}}, "flow": [["u", "a1", "#3b82f6", "GET /"]], "metrics": {"users": ["1k"], "pain": ["-"], "fix": ["-"]}}, {"short": "Split DB", "tag": "Separate", "title": "Move the database to its own machine", "body": "<p>App and database fight over CPU and RAM. Separating them lets each be sized and tuned independently.</p>", "show": ["u", "a1", "db"], "set": {"a1": {"label": "App 1"}}, "flow": [[["u", "a1", "db"], "#3b82f6", ""]], "metrics": {"users": ["10k"], "pain": ["app and DB compete"], "fix": ["separate tiers"]}}, {"short": "Vertical", "tag": "Limit", "title": "Buy a bigger server… until you can't", "body": "<p>Vertical scaling is easy but has a ceiling, gets expensive fast, and one machine is still a single point of failure.</p>", "set": {"a1": {"badge": "CPU 95%"}}, "metrics": {"users": ["50k"], "pain": ["one app server maxed", "bad"]}}, {"short": "LB", "tag": "Horizontal", "title": "Add a load balancer and more app servers", "body": "<p>The LB spreads requests across identical servers and stops sending to any that fail health checks.</p>", "show": ["u", "lb", "a1", "a2", "a3", "db"], "set": {"a1": {"badge": null}}, "flow": [[["u", "lb", "a1"], "#3b82f6", ""], [["u", "lb", "a2"], "#3b82f6", ""], [["u", "lb", "a3"], "#3b82f6", ""]], "metrics": {"fix": ["horizontal scaling", "good"]}}, {"short": "Sessions", "tag": "Bug", "title": "Users get logged out randomly", "body": "<p>Login stored the session in App 1's memory. The next request lands on App 2, which has never heard of them.</p>", "flow": [[["u", "lb", "a2"], "#ef4444", "who are you?"]], "metrics": {"pain": ["sessions in server memory", "bad"]}}, {"short": "Stateless", "tag": "Fix", "title": "Make app servers stateless: sessions go to Redis", "body": "<p>Any server can now handle any request, so you can add, remove or replace servers freely.</p>", "show": ["u", "lb", "a1", "a2", "a3", "db", "ses"], "flow": [["a1", "ses", "#f59e0b", "session 7f3"]], "metrics": {"fix": ["shared session store", "good"]}}, {"short": "DB hot", "tag": "Limit", "title": "Now the database is the bottleneck", "body": "<p>Every page runs a dozen queries. 90% of them are reads of the same popular data.</p>", "set": {"db": {"badge": "CPU 90%"}}, "metrics": {"users": ["300k"], "pain": ["DB read load", "bad"]}}, {"short": "Cache", "tag": "Fix", "title": "Cache-aside: check Redis first, query the DB only on a miss", "body": "<p>A hit takes ~1 ms instead of ~20 ms. Set a TTL and delete the key when data changes to limit staleness.</p>", "flow": [["a2", "ses", "#22c55e", "hit"], ["a3", "db", "#f59e0b", "miss → query"]], "set": {"db": {"badge": "CPU 35%"}}, "metrics": {"fix": ["cache ~85% hit rate", "good"]}}, {"short": "Replica", "tag": "Fix", "title": "Add read replicas for the remaining reads", "body": "<p>Writes go to the primary; reads that can tolerate a little lag go to replicas.</p>", "show": ["u", "lb", "a1", "a2", "a3", "db", "ses", "rep"], "flow": [["db", "rep", "#a855f7", "WAL"]], "note": {"kind": "warn", "text": "Replication lag: right after a user updates their profile, read it from the primary or they will see the old value."}}, {"short": "CDN", "tag": "Fix", "title": "Serve images, CSS and JS from a CDN", "body": "<p>Static files are most of the bytes. The CDN serves them from edges near users, faster and cheaper.</p>", "show": ["u", "lb", "a1", "a2", "a3", "db", "ses", "rep", "cdn"], "flow": [["u", "cdn", "#22c55e", "logo.png"]]}, {"short": "Async", "tag": "Fix", "title": "Slow work goes to a queue", "body": "<p>Sending email and resizing images inside the request made signup take 3 s. Now the app enqueues a job and responds in 80 ms; workers do the rest.</p>", "show": ["u", "lb", "a1", "a2", "a3", "db", "ses", "rep", "cdn", "q", "w"], "flow": [[["a3", "q", "w"], "#ec4899", "send welcome email"]], "metrics": {"users": ["1M"], "pain": ["slow requests"], "fix": ["background workers", "good"]}}, {"short": "Next", "tag": "Beyond", "title": "What breaks next: writes", "body": "<p>Past this point the single primary's write load is the limit. That is where sharding comes in (chapter 4).</p>", "note": {"kind": "key", "text": "Scaling is a loop: measure, find the bottleneck, fix only that, repeat. Stateless servers + cache + replicas + CDN + queues carry most apps very far."}}]}

::widget Scene {"title": "Vertical vs horizontal scaling", "sub": "a bigger machine, or more machines?", "nodes": [{"id": "lb", "kind": "router", "label": "Load balancer", "x": 3.1, "y": 3.1, "color": "teal"}, {"id": "s1", "kind": "server", "label": "Server", "x": 7.6, "y": -1.4, "color": "blue"}, {"id": "s2", "kind": "server", "label": "Server 2", "x": 2.95, "y": -6.05, "color": "blue"}, {"id": "s3", "kind": "server", "label": "Server 3", "x": 12.25, "y": 3.25, "color": "blue"}], "links": [["lb", "s1"], ["lb", "s2"], ["lb", "s3"]], "metrics": [["cap", "Capacity"], ["spof", "Single point of failure?"]], "steps": [{"short": "One box", "tag": "Start", "title": "One server is fine, until it isn't", "body": "<p>Traffic grows 10×. CPU hits 100%.</p>", "show": ["s1"], "set": {"s1": {"badge": "100% CPU"}}, "metrics": {"cap": ["1×"], "spof": ["yes", "bad"]}}, {"short": "Bigger", "tag": "Vertical", "title": "Scale up: buy a bigger machine", "body": "<p>Simple, no code changes. But there's a ceiling, it gets expensive fast, and it's still one machine that can fail.</p>", "show": ["s1"], "set": {"s1": {"label": "Bigger server", "badge": "64 cores"}}, "metrics": {"cap": ["4×"], "spof": ["yes", "bad"]}}, {"short": "More", "tag": "Horizontal", "title": "Scale out: add more machines behind a load balancer", "body": "<p>Capacity grows by adding servers, and one failing doesn't take you down. Requires servers to be <b>stateless</b> (next lesson).</p>", "show": ["lb", "s1", "s2", "s3"], "set": {"s1": {"label": "Server 1", "badge": null}}, "flow": [["lb", "s1", "#3b82f6", ""], ["lb", "s2", "#3b82f6", ""], ["lb", "s3", "#3b82f6", ""]], "metrics": {"cap": ["N×", "good"], "spof": ["no", "good"]}, "note": {"kind": "key", "text": "Scale up first (it's cheap engineering); scale out when you need more than one machine or need to survive failures."}}]}

::widget Scene {"title": "Stateless services: any server can handle any request", "sub": "where do sessions live?", "nodes": [{"id": "u", "kind": "user", "label": "User", "x": 3.1, "y": 3.1}, {"id": "lb", "kind": "router", "label": "Load balancer", "x": 6.7, "y": -0.5, "color": "teal"}, {"id": "s1", "kind": "server", "label": "Server A", "x": 7.2, "y": -7.2, "color": "blue"}, {"id": "s2", "kind": "server", "label": "Server B", "x": 13.4, "y": -1.0, "color": "blue"}, {"id": "r", "kind": "cache", "label": "Redis (sessions)", "x": 14.1, "y": -7.9, "color": "red"}], "links": [["u", "lb"], ["lb", "s1"], ["lb", "s2"], ["s1", "r", {"dashed": true}], ["s2", "r", {"dashed": true}]], "metrics": [["cart", "Cart contents"]], "steps": [{"short": "Stateful", "tag": "Problem", "title": "The cart is stored in Server A's memory", "body": "<p>The next request goes to Server B, which knows nothing about it. The cart looks empty.</p>", "show": ["u", "lb", "s1", "s2"], "set": {"s1": {"badge": "cart: 3 items"}}, "flow": [[["u", "lb", "s2"], "#f59e0b", "GET /cart"]], "metrics": {"cart": ["empty?!", "bad"]}}, {"short": "Shared", "tag": "Fix", "title": "Move sessions to a shared store", "body": "<p>Servers keep nothing between requests; sessions live in Redis (or a signed cookie/token).</p>", "set": {"s1": {"badge": null}, "r": {"badge": "cart: 3 items"}}, "flow": [[["u", "lb", "s2", "r"], "#f59e0b", "GET /cart"]], "metrics": {"cart": ["3 items", "good"]}}, {"short": "Freedom", "tag": "Benefit", "title": "Now servers can be added, removed or crash freely", "body": "<p>Autoscaling and rolling deploys just work.</p>", "note": {"kind": "key", "text": "Stateless servers + state in databases, caches and object storage = the foundation of horizontal scaling."}}]}

::widget Scene {"title": "Cache-aside: hits, misses and stale data", "sub": "a product page served at scale", "nodes": [{"id": "u", "kind": "user", "label": "Shoppers", "x": 3.88, "y": 3.88}, {"id": "app", "kind": "server", "label": "App servers", "x": 7.47, "y": 0.27, "color": "blue"}, {"id": "c", "kind": "cache", "label": "Redis cache", "x": 8.02, "y": -6.78, "color": "red"}, {"id": "db", "kind": "db", "label": "Database", "x": 14.84, "y": 0.04, "color": "purple"}], "links": [["u", "app", {"both": true}], ["app", "c", {"both": true}], ["app", "db", {"both": true}]], "metrics": [["lat", "Response time"], ["hit", "Cache hit rate"], ["dbl", "Database load"]], "legend": [["Request", "#f59e0b"], ["Cache", "#ef4444"], ["Database", "#a855f7"]], "steps": [{"short": "No cache", "tag": "Problem", "title": "Every request hits the database", "body": "<p>A popular product page is requested 20,000 times a minute. Each request runs the same query. The database sits at 90% CPU and pages take 180 ms.</p>", "show": ["u", "app", "db"], "flow": [[["u", "app", "db"], "#f59e0b", "SELECT product 42"]], "metrics": {"lat": ["180 ms", "bad"], "hit": ["-"], "dbl": ["90%", "bad"]}}, {"short": "Miss", "tag": "Miss", "title": "First request: a cache miss", "body": "<p>We add Redis. The app asks the cache first: \"product:42?\" It's empty, a <b>miss</b>, so the app reads the database…</p>", "show": ["u", "app", "c", "db"], "flow": [["app", "c", "#ef4444", "GET product:42 → nil"], ["app", "db", "#a855f7", "SELECT …"]], "metrics": {"hit": ["0%"]}}, {"short": "Fill", "tag": "Fill", "title": "…then stores the result in the cache", "body": "<p>…and writes it to Redis with a <b>TTL</b> (say 5 minutes) before responding. That's the \"aside\" in cache-aside: the app manages the cache itself.</p>", "flow": [["app", "c", "#ef4444", "SET product:42 EX 300"]], "set": {"c": {"badge": "product:42"}}}, {"short": "Hits", "tag": "Hit", "title": "Everyone after that: cache hits", "body": "<p>The next 19,999 requests find it in Redis in about half a millisecond. The database barely notices.</p>", "flow": [[["u", "app", "c"], "#f59e0b", "GET → hit"]], "set": {"db": {"dim": true}}, "metrics": {"lat": ["8 ms", "good"], "hit": ["99.9%", "good"], "dbl": ["5%", "good"]}}, {"short": "Stale", "tag": "Danger", "title": "The price changes, but the cache still has the old one", "body": "<p>An admin updates the price in the database. The cache still serves the old price until the TTL expires. This is the core trade-off of caching: <b>speed for freshness</b>.</p>", "set": {"db": {"dim": false, "badge": "price updated"}, "c": {"badge": "old price!"}}, "metrics": {"hit": ["99.9%"]}, "note": {"kind": "warn", "text": "Users may see a stale price for up to 5 minutes."}}, {"short": "Invalidate", "tag": "Fix", "title": "On writes, delete the cached copy", "body": "<p>The fix: after updating the database, <b>delete</b> <code>product:42</code> from the cache. The next read misses and refills with the fresh value. Keep a TTL too, as a safety net.</p>", "flow": [["app", "db", "#a855f7", "UPDATE price"], ["app", "c", "#ef4444", "DEL product:42"]], "set": {"c": {"badge": null}, "db": {"badge": null}}, "note": {"kind": "key", "text": "Cache-aside: read → cache, on miss → DB → fill cache. Write → DB, then invalidate. TTLs bound staleness. Watch for stampedes when a hot key expires."}}]}

## Your app just went viral

Your side project gets mentioned by a celebrity. Yesterday you had 100 users; today 100,000 people try to sign up in an hour. Your single server's CPU is at 100%, pages take 30 seconds, then the database stops accepting connections. What now?

There are two ways to grow.

## Scaling up vs scaling out

> [!ANALOGY] A café with a long line. You can **scale up**: replace your barista with a faster one and buy a bigger coffee machine. Or **scale out**: hire more baristas and add more counters. Scaling up is simple but hits a limit, there's no infinitely fast barista, and if your one star barista calls in sick, the café closes. Scaling out can grow almost without limit and survives one person being absent, but now you need someone to direct customers to counters, and the baristas have to coordinate.

- **Vertical scaling (scale up):** a bigger machine, more CPU, more memory. No code changes. Today's largest servers have hundreds of cores and terabytes of memory, so this goes surprisingly far. But it has a ceiling, gets expensive at the top end, and one machine is one point of failure.
- **Horizontal scaling (scale out):** more machines sharing the work. Practically unlimited, uses cheap standard hardware, and survives individual failures. The price is complexity: distributing work, keeping data consistent, and handling partial failures, the subject of the rest of this track.

> [!EXAMPLE] Don't dismiss scaling up. Stack Overflow famously served one of the busiest websites in the world for years from a handful of powerful servers running Microsoft SQL Server. Simplicity has real value: fewer machines means fewer things to break.

## Making servers interchangeable: statelessness

To scale out, you put a **load balancer** in front of many app servers (Networking track, chapter 9). But there's a catch. If server #3 keeps your shopping cart in its own memory, every one of your requests must go back to server #3. If server #3 crashes or is replaced during an update, your cart is gone.

The solution is to make app servers **stateless**: they keep nothing between requests that another server would need. Every piece of state lives somewhere shared:

- **User sessions** → a shared store like Redis, or a signed token the browser sends with each request.
- **Uploaded files** → object storage (S3), never a server's local disk.
- **Background jobs** → a queue (chapter 6).
- **Data** → the database.

Now any server can handle any request. You can add servers when traffic rises, remove them when it falls, and replace a broken one without anyone noticing. Cloud platforms do this automatically: **autoscaling** adds servers when CPU or request rates cross a threshold and removes them when traffic drops.

> [!ANALOGY] A call center where any agent can help any customer, because the customer's history is in the shared computer system, not in one agent's personal notebook. If an agent goes home, the next agent picks up seamlessly.

## Caching: the biggest speed lever there is



A **cache** stores a copy of data somewhere faster, so you don't have to fetch or compute it again. It's the single most effective way to make a system faster and to protect your database from load.

> [!ANALOGY] A chef keeps salt, oil and the most-used spices **on the counter** instead of walking to the storeroom every time. The storeroom (database) still holds everything; the counter (cache) holds what's needed constantly. Walking to the storeroom for every pinch of salt would be absurd.

The numbers are dramatic: reading from Redis takes well under a millisecond, while a database query typically takes 5–50 milliseconds. If 95% of reads hit the cache, the database sees **20 times less** read traffic.

### Where caches live

::widget Stepper {"type":"layers","title":"The layers of caching, from the user inward","what":"A request may be answered at any of these layers. The higher the layer that answers, the faster the response and the less work for everything below.","steps":["Press Play from top to bottom.","For each layer, ask: who shares this cache, one user, one city, one server, or everyone?","Notice that each layer is slower but more complete than the one above."],"nodes":[["Browser or app cache","Your own device keeps copies of images, scripts and some responses. Fastest possible: no network at all."],["CDN","Copies stored in a city near you, shared by everyone nearby (Networking track, chapter 9)."],["Application memory","Each app server keeps a small in-memory map of very hot data. Nanoseconds, but each server has its own copy, so copies can disagree."],["Shared cache (Redis / Memcached)","A cluster of memory-based servers shared by all app servers. Under a millisecond."],["Database's own cache","The database keeps recently used data in memory; the operating system caches files too (OS track)."],["Database on disk","The source of truth. Slowest, but complete."]]}

### The most common pattern: cache-aside

The application checks the cache first; on a **miss** it reads from the database and puts the result into the cache for next time.

```python
import json, random
def get_user(user_id):
    key = f"user:{user_id}"
    cached = redis.get(key)
    if cached is not None:
        return json.loads(cached)                       # cache hit: done
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)   # cache miss: go to the database
    ttl = 300 + random.randint(0, 60)                   # keep 5 minutes, plus jitter (see below)
    redis.set(key, json.dumps(user), ex=ttl)
    return user
```

Only data that's actually requested ends up in the cache, and if the cache cluster fails, the app can still work by reading from the database (as long as the database can take the extra load).

Other strategies exist for writes: **write-through** (update the cache and database together, so the cache is always fresh), **write-back** (update only the cache and save to the database later, very fast, but you can lose data if the cache dies first).

### The hard part: keeping the cache correct

> [!NOTE] There's a famous quip by Phil Karlton: *"There are only two hard things in computer science: cache invalidation and naming things."* The reason: a cache is a **copy** and copies go out of date.

When data changes, the cached copy is **stale**. Options, from simplest to most robust:

1. **Expire after a time (TTL).** Accept that data may be up to, say, 5 minutes old. Perfect for things like product listings or profile pictures.
2. **Delete the cache entry when the data changes.** After updating the database, delete the key; the next read reloads fresh data. (Deleting is safer than updating the cache, because two simultaneous updates could otherwise leave the older value in the cache.)
3. **Follow the database's change log.** A separate process watches every change the database makes and invalidates the matching cache entries, so no code path can forget. Meta built its caching system around this idea.

### How caches fail in the real world

**The stampede (thundering herd).** A very popular cache entry expires, say, the home page data. In the next millisecond, 10,000 requests all miss the cache and all query the database at once, and the database falls over.

> [!EXAMPLE] This exact failure has caused real outages. Fixes: let only **one** request rebuild the value while the others wait for it or use the old value briefly ("single flight", "stale while revalidate"), refresh popular entries a little **before** they expire, and add random **jitter** to expiry times so thousands of keys don't all expire at the same second.

**Hot keys.** One key gets far more traffic than a single cache server can handle, a celebrity's profile, a viral product during a flash sale. Fix: keep several copies of that key on different servers and spread reads across them, or cache it in each app server's own memory too.

**Cache penetration.** Requests for things that **don't exist** (often from attackers sending random IDs) always miss the cache and always hit the database. Fix: cache the "not found" answer briefly too, or use a Bloom filter of existing IDs (DSA track, chapter 3).

**Cold start.** After the cache cluster restarts, it's empty, and the full traffic hits the database at once. Fix: warm the cache before sending traffic, or bring traffic back gradually.

### What to evict when the cache is full

Caches have limited memory, so they throw things out:

- **LRU** (least recently used), evict what hasn't been touched for longest (DSA track, chapter 3).
- **LFU** (least frequently used), evict what's used least often; better when popularity is very uneven.
- **TTL** evict whatever has expired.

The key metric is the **hit ratio**: the percentage of reads answered by the cache. Going from 90% to 99% cuts database reads by a further factor of ten.

## Spreading a cache across many servers

A cache cluster splits keys across several servers. The obvious rule, `server = hash(key) % number_of_servers`, has a nasty problem: add or remove **one** server and almost every key maps to a different server. Suddenly nearly everything is a cache miss, and the database gets hammered.

**Consistent hashing** fixes this. Picture a ring: servers and keys are both placed on it by their hash, and each key belongs to the next server clockwise. Adding a server only takes over the keys between it and its neighbor, roughly 1/N of them. Placing each server at many points around the ring ("virtual nodes") keeps the load even.

::widget HashRing {}

> [!EXAMPLE] Consistent hashing is used by Memcached clients, by Amazon's Dynamo database and Apache Cassandra to spread data, by Discord to route users to chat servers, and by load balancers that want each user to keep hitting the same server.

**Redis** deserves a special mention: beyond simple caching, its built-in data structures (lists, sets, sorted sets, counters with expiry) make it the go-to tool for leaderboards, rate limiters, session storage and simple queues, which also means it often becomes critical infrastructure rather than "just a cache".

> [!RECAP]
> - **Scale up** (bigger machine) is simple but limited; **scale out** (more machines) is unlimited but complex.
> - Make app servers **stateless** keep sessions, files and data in shared services, so any server can handle any request and autoscaling works.
> - **Caching** is the biggest speed lever; it lives in browsers, CDNs, app memory, shared caches like Redis, and databases.
> - **Cache-aside** is the common pattern; keep caches correct with **TTLs** **delete-on-write** or change-log-driven invalidation.
> - Watch for **stampedes** **hot keys** **penetration** and **cold starts**.
> - **Consistent hashing** spreads keys across cache servers so adding or removing one moves only ~1/N of keys.

> [!INTERVIEW] Whenever you add a cache in a design, say: what's cached, the key, how long it lives, how it's invalidated, the eviction policy, the expected hit ratio, and what happens during a stampede or if the cache cluster dies. That level of detail is what separates strong answers.

::quiz {"q":"Why should app servers be stateless when you scale out?","options":["Stateless servers use less CPU","So any server can handle any request, servers can be added, removed or replaced without losing anything","Load balancers require it","It makes the database faster"],"answer":1,"explain":"Shared state lives in Redis, the database or object storage instead."}

::quiz {"q":"A popular cache entry expires and 10,000 requests hit the database at once. What is this called, and how do you prevent it?","options":["Cache penetration; use a Bloom filter","A cache stampede; let one request rebuild while others wait or use the stale value, and add jitter to expiry times","A hot key; add more databases","Cold start; restart the cache"],"answer":1,"explain":"Single-flight rebuilding and jittered TTLs prevent synchronized misses."}

::quiz {"q":"Why use consistent hashing instead of hash(key) % N for a cache cluster?","options":["It's faster to compute","Adding or removing a server moves only about 1/N of the keys, instead of almost all of them","It encrypts keys","It guarantees perfect balance"],"answer":1,"explain":"Mod-N remaps nearly everything when N changes, causing a flood of cache misses."}
