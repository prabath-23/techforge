---
title: Scaling and Caching — Handling More Users, Faster
summary: Two ways to grow (bigger machines vs more machines), why servers should forget everything between requests, and caching — the single most powerful tool for speed — including where caches live, how to keep them correct, and the classic ways they fail (stampedes, hot keys) that have taken down real sites.
---

## Your app just went viral

Your side project gets mentioned by a celebrity. Yesterday you had 100 users; today 100,000 people try to sign up in an hour. Your single server's CPU is at 100%, pages take 30 seconds, then the database stops accepting connections. What now?

There are two ways to grow.

## Scaling up vs scaling out

> [!ANALOGY] A café with a long line. You can **scale up**: replace your barista with a faster one and buy a bigger coffee machine. Or **scale out**: hire more baristas and add more counters. Scaling up is simple but hits a limit — there's no infinitely fast barista — and if your one star barista calls in sick, the café closes. Scaling out can grow almost without limit and survives one person being absent, but now you need someone to direct customers to counters, and the baristas have to coordinate.

- **Vertical scaling (scale up):** a bigger machine — more CPU, more memory. No code changes. Today's largest servers have hundreds of cores and terabytes of memory, so this goes surprisingly far. But it has a ceiling, gets expensive at the top end, and one machine is one point of failure.
- **Horizontal scaling (scale out):** more machines sharing the work. Practically unlimited, uses cheap standard hardware, and survives individual failures. The price is complexity: distributing work, keeping data consistent, and handling partial failures — the subject of the rest of this track.

> [!EXAMPLE] Don't dismiss scaling up. Stack Overflow famously served one of the busiest websites in the world for years from a handful of powerful servers running Microsoft SQL Server. Simplicity has real value: fewer machines means fewer things to break.

## Making servers interchangeable: statelessness

To scale out, you put a **load balancer** in front of many app servers (Networking track, chapter 9). But there's a catch. If server #3 keeps your shopping cart in its own memory, every one of your requests must go back to server #3. If server #3 crashes or is replaced during an update, your cart is gone.

The solution is to make app servers **stateless**: they keep nothing between requests that another server would need. Every piece of state lives somewhere shared:

- **User sessions** → a shared store like Redis, or a signed token the browser sends with each request.
- **Uploaded files** → object storage (S3), never a server's local disk.
- **Background jobs** → a queue (chapter 6).
- **Data** → the database.

Now any server can handle any request. You can add servers when traffic rises, remove them when it falls, and replace a broken one without anyone noticing. Cloud platforms do this automatically: **autoscaling** adds servers when CPU or request rates cross a threshold and removes them when traffic drops.

> [!ANALOGY] A call center where any agent can help any customer, because the customer's history is in the shared computer system — not in one agent's personal notebook. If an agent goes home, the next agent picks up seamlessly.

## Caching: the biggest speed lever there is

A **cache** stores a copy of data somewhere faster, so you don't have to fetch or compute it again. It's the single most effective way to make a system faster and to protect your database from load.

> [!ANALOGY] A chef keeps salt, oil and the most-used spices **on the counter** instead of walking to the storeroom every time. The storeroom (database) still holds everything; the counter (cache) holds what's needed constantly. Walking to the storeroom for every pinch of salt would be absurd.

The numbers are dramatic: reading from Redis takes well under a millisecond, while a database query typically takes 5–50 milliseconds. If 95% of reads hit the cache, the database sees **20 times less** read traffic.

### Where caches live

::widget Stepper {"type":"layers","title":"The layers of caching, from the user inward","what":"A request may be answered at any of these layers. The higher the layer that answers, the faster the response and the less work for everything below.","steps":["Press Play from top to bottom.","For each layer, ask: who shares this cache — one user, one city, one server, or everyone?","Notice that each layer is slower but more complete than the one above."],"nodes":[["Browser or app cache","Your own device keeps copies of images, scripts and some responses. Fastest possible: no network at all."],["CDN","Copies stored in a city near you, shared by everyone nearby (Networking track, chapter 9)."],["Application memory","Each app server keeps a small in-memory map of very hot data. Nanoseconds, but each server has its own copy, so copies can disagree."],["Shared cache (Redis / Memcached)","A cluster of memory-based servers shared by all app servers. Under a millisecond."],["Database's own cache","The database keeps recently used data in memory; the operating system caches files too (OS track)."],["Database on disk","The source of truth. Slowest, but complete."]]}

### The most common pattern: cache-aside

The application checks the cache first; on a **miss**, it reads from the database and puts the result into the cache for next time.

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

Other strategies exist for writes: **write-through** (update the cache and database together, so the cache is always fresh), **write-back** (update only the cache and save to the database later — very fast, but you can lose data if the cache dies first).

### The hard part: keeping the cache correct

> [!NOTE] There's a famous quip by Phil Karlton: *"There are only two hard things in computer science: cache invalidation and naming things."* The reason: a cache is a **copy**, and copies go out of date.

When data changes, the cached copy is **stale**. Options, from simplest to most robust:

1. **Expire after a time (TTL).** Accept that data may be up to, say, 5 minutes old. Perfect for things like product listings or profile pictures.
2. **Delete the cache entry when the data changes.** After updating the database, delete the key; the next read reloads fresh data. (Deleting is safer than updating the cache, because two simultaneous updates could otherwise leave the older value in the cache.)
3. **Follow the database's change log.** A separate process watches every change the database makes and invalidates the matching cache entries, so no code path can forget. Meta built its caching system around this idea.

### How caches fail in the real world

**The stampede (thundering herd).** A very popular cache entry expires — say, the home page data. In the next millisecond, 10,000 requests all miss the cache and all query the database at once, and the database falls over.

> [!EXAMPLE] This exact failure has caused real outages. Fixes: let only **one** request rebuild the value while the others wait for it or use the old value briefly ("single flight", "stale while revalidate"), refresh popular entries a little **before** they expire, and add random **jitter** to expiry times so thousands of keys don't all expire at the same second.

**Hot keys.** One key gets far more traffic than a single cache server can handle — a celebrity's profile, a viral product during a flash sale. Fix: keep several copies of that key on different servers and spread reads across them, or cache it in each app server's own memory too.

**Cache penetration.** Requests for things that **don't exist** (often from attackers sending random IDs) always miss the cache and always hit the database. Fix: cache the "not found" answer briefly too, or use a Bloom filter of existing IDs (DSA track, chapter 3).

**Cold start.** After the cache cluster restarts, it's empty, and the full traffic hits the database at once. Fix: warm the cache before sending traffic, or bring traffic back gradually.

### What to evict when the cache is full

Caches have limited memory, so they throw things out:

- **LRU** (least recently used) — evict what hasn't been touched for longest (DSA track, chapter 3).
- **LFU** (least frequently used) — evict what's used least often; better when popularity is very uneven.
- **TTL** — evict whatever has expired.

The key metric is the **hit ratio**: the percentage of reads answered by the cache. Going from 90% to 99% cuts database reads by a further factor of ten.

## Spreading a cache across many servers

A cache cluster splits keys across several servers. The obvious rule, `server = hash(key) % number_of_servers`, has a nasty problem: add or remove **one** server and almost every key maps to a different server. Suddenly nearly everything is a cache miss, and the database gets hammered.

**Consistent hashing** fixes this. Picture a ring: servers and keys are both placed on it by their hash, and each key belongs to the next server clockwise. Adding a server only takes over the keys between it and its neighbor — roughly 1/N of them. Placing each server at many points around the ring ("virtual nodes") keeps the load even.

::widget HashRing {}

> [!EXAMPLE] Consistent hashing is used by Memcached clients, by Amazon's Dynamo database and Apache Cassandra to spread data, by Discord to route users to chat servers, and by load balancers that want each user to keep hitting the same server.

**Redis** deserves a special mention: beyond simple caching, its built-in data structures (lists, sets, sorted sets, counters with expiry) make it the go-to tool for leaderboards, rate limiters, session storage and simple queues — which also means it often becomes critical infrastructure rather than "just a cache".

> [!RECAP]
> - **Scale up** (bigger machine) is simple but limited; **scale out** (more machines) is unlimited but complex.
> - Make app servers **stateless** — keep sessions, files and data in shared services — so any server can handle any request and autoscaling works.
> - **Caching** is the biggest speed lever; it lives in browsers, CDNs, app memory, shared caches like Redis, and databases.
> - **Cache-aside** is the common pattern; keep caches correct with **TTLs**, **delete-on-write**, or change-log-driven invalidation.
> - Watch for **stampedes**, **hot keys**, **penetration** and **cold starts**.
> - **Consistent hashing** spreads keys across cache servers so adding or removing one moves only ~1/N of keys.

> [!INTERVIEW] Whenever you add a cache in a design, say: what's cached, the key, how long it lives, how it's invalidated, the eviction policy, the expected hit ratio, and what happens during a stampede or if the cache cluster dies. That level of detail is what separates strong answers.

::quiz {"q":"Why should app servers be stateless when you scale out?","options":["Stateless servers use less CPU","So any server can handle any request — servers can be added, removed or replaced without losing anything","Load balancers require it","It makes the database faster"],"answer":1,"explain":"Shared state lives in Redis, the database or object storage instead."}

::quiz {"q":"A popular cache entry expires and 10,000 requests hit the database at once. What is this called, and how do you prevent it?","options":["Cache penetration; use a Bloom filter","A cache stampede; let one request rebuild while others wait or use the stale value, and add jitter to expiry times","A hot key; add more databases","Cold start; restart the cache"],"answer":1,"explain":"Single-flight rebuilding and jittered TTLs prevent synchronized misses."}

::quiz {"q":"Why use consistent hashing instead of hash(key) % N for a cache cluster?","options":["It's faster to compute","Adding or removing a server moves only about 1/N of the keys, instead of almost all of them","It encrypts keys","It guarantees perfect balance"],"answer":1,"explain":"Mod-N remaps nearly everything when N changes, causing a flood of cache misses."}
