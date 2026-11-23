---
title: How to Design a System — The Method and the Math
summary: What "system design" really is, how to turn a vague request like "design Instagram" into clear requirements, how to estimate traffic and storage on the back of an envelope (with worked examples), what "five nines" actually means, and a step-by-step plan for running a 45-minute design interview.
---

## What system design actually is

Building a feature for 100 users is mostly about writing correct code. Building the same feature for 100 million users is a different job. Now you're asking: Where does the data live? What happens when a server dies in the middle of a request? How do we keep it fast for someone in Brazil when the servers are in India? What will it cost?

**System design** is the craft of answering those questions — choosing the components (servers, databases, caches, queues) and how they fit together — so the system meets its goals for speed, reliability, scale and cost.

> [!ANALOGY] It's like the difference between cooking dinner for your family and designing a restaurant chain's kitchens. The recipe still matters, but now you think about how many cooks, where the fridges go, what happens when the dishwasher breaks during the Saturday rush, and how to open a second branch without changing everything.

There's rarely one right answer. There are designs that fit the requirements and designs that don't, and the skill is **reasoning clearly about trade-offs**: faster but more expensive, simpler but less flexible, always available but sometimes slightly out of date. The rest of this track teaches the building blocks — caching, databases, replication, queues, consensus — and then puts them together in 20 real case studies. This chapter is the method you'll apply every time.

## Step 1: Pin down the requirements

A request like "design a URL shortener" or "design Instagram" is deliberately vague. Real engineers — and strong interview candidates — start by asking questions.

### What should it do? (functional requirements)

List the core features from the user's point of view, and **say what's out of scope**. For a URL shortener:

- Create a short link for a long URL (maybe with a custom name and an expiry date).
- Visiting the short link redirects to the long URL.
- Out of scope for now: user accounts, link-editing, a full analytics dashboard.

Picking 2–4 core features keeps the design focused.

### How well must it do it? (non-functional requirements)

These drive the architecture far more than the features do:

- **Scale:** how many users? How many requests per second? How much data, growing how fast?
- **Speed (latency):** "a redirect must take under 50 milliseconds for 99% of users".
- **Availability:** how much downtime is acceptable?
- **Consistency:** if someone creates a link, must it work everywhere **instantly**, or is a one-second delay OK? (A bank balance must be exact; a "likes" counter can lag.)
- **Read vs write mix:** a URL shortener is read about 100 times for every write; a logging system is the opposite.
- **Durability:** can we ever lose data?
- Plus: security, privacy laws, cost.

### What "99.9% available" really means

Availability is quoted in "nines". It's worth knowing what they mean in real downtime:

| Availability | Downtime per year | Per month |
|---|---|---|
| 99% ("two nines") | 3.65 days | 7.3 hours |
| 99.9% | 8.8 hours | 43 minutes |
| 99.99% | 53 minutes | 4.4 minutes |
| 99.999% ("five nines") | 5.3 minutes | 26 seconds |

Two rules of thumb make availability intuitive:

- **Things in a chain multiply.** If a request needs three services and each is 99.9% available, the whole chain is only 0.999 × 0.999 × 0.999 ≈ **99.7%**. Long chains of required services are fragile.
- **Backups add nines.** Two independent copies that are each 99% available, where either one can serve, are together 1 − (0.01 × 0.01) = **99.99%** available. That's why every important component in a real system has at least one spare.

> [!EXAMPLE] **Promises with money attached.** Cloud providers publish **SLAs** (service level agreements) with refunds if they miss them; AWS's S3 storage promises 99.9% monthly availability for its standard tier. Internally, teams set **SLOs** (service level objectives), such as "99.95% of checkout requests succeed in under 300 ms". The gap between perfection and the SLO is the **error budget**: room to take risks and ship new features (Cloud track → SRE).

## Step 2: Back-of-the-envelope estimation

Before drawing anything, estimate the size of the problem. Estimation tells you whether you need one server or ten thousand, and whether your data fits in memory or needs a cluster of databases. The goal is the **right order of magnitude**, not precision.

### Numbers worth memorizing

- 1 day ≈ 86,400 seconds — round to **100,000 (10⁵)** for quick math.
- **1 million requests per day ≈ 12 per second.** 1 billion per day ≈ 12,000 per second.
- Traffic **peaks** at roughly 2–3× the daily average (more for things like live sports).
- 1 KB ≈ 10³ bytes, 1 MB ≈ 10⁶, 1 GB ≈ 10⁹, 1 TB ≈ 10¹².
- Rough capacities: one web server handles thousands to tens of thousands of simple requests per second; one Postgres database thousands of writes per second; one Redis node 100,000+ operations per second.
- Latencies: memory 100 ns · SSD read 0.1 ms · round trip inside a data center 0.5 ms · round trip between continents 100–250 ms.

### Worked example 1: a URL shortener

- **Writes:** 100 million new links per month ÷ ~2.5 million seconds per month ≈ **40 per second**, maybe 100 at peak.
- **Reads:** 100 reads per write ≈ **4,000 redirects per second**, ~10,000 at peak.
- **Storage:** each link record ~500 bytes. Over 10 years: 100 million × 12 × 10 = 12 billion links × 500 bytes ≈ **6 TB**. Too big for one machine's memory, comfortable for a sharded database.
- **Short code length:** using 62 characters (a–z, A–Z, 0–9), 7 characters give 62⁷ ≈ **3.5 trillion** combinations — plenty for 12 billion links.
- **Cache:** if 20% of links get 80% of clicks, caching the popular ones needs a few tens of gigabytes — a small Redis cluster.

### Worked example 2: a photo-sharing app

- 500 million daily users, each viewing about 50 photos and posting 0.2 photos per day.
- **Uploads:** 100 million photos a day ≈ 1,200 per second. At about 2 MB each plus resized versions ≈ **600 TB of new storage per day**. That immediately says: object storage (like Amazon S3) plus a CDN, not a database.
- **Feed views:** 25 billion photo views a day ≈ 300,000 per second. That says: feeds must be **precomputed and cached**, not assembled from scratch on every request (case studies chapter).

> [!NOTE] Always say what your numbers **mean** for the design: "6 TB won't fit on one machine with room to grow, so we'll shard the database"; "300,000 reads per second means we need heavy caching". The numbers are only useful if they change a decision.

## Step 3: Define the API

Agree on how clients talk to the system before drawing boxes:

```text
POST /v1/urls          body: { "long_url": "...", "custom_alias": null }
                       → 201 Created  { "short_url": "https://sho.rt/aZ3k9Qx" }

GET  /{code}           → 302 Found, Location: <the long URL>
```

Decisions show up here: REST or gRPC (Networking track), how clients authenticate, how to make creation safe to retry (idempotency keys), rate limits. Even small details matter — a **301** redirect is cached by browsers forever (fewer requests to your servers, but you can't count clicks), while a **302** sends every click through you.

## Step 4: Model the data

What are the main entities, and — most importantly — **how will they be accessed**? The access pattern decides the storage:

- Lookups by a single key at huge scale → a key-value store (DynamoDB, Cassandra).
- Relationships and transactions (orders, payments, inventory) → a relational database (PostgreSQL, MySQL).
- Large files (photos, videos) → object storage (S3).
- Full-text search → a search engine (Elasticsearch).
- Analytics over billions of events → a column-oriented warehouse (BigQuery, ClickHouse).

Chapter 3 goes deep on choosing.

## Step 5: Sketch the high-level design

Draw the path a request takes, and give every box a clear job. Most web systems start from the same skeleton:

::widget Stepper {"type":"flow","cols":4,"title":"A typical starting point for a read-heavy web system","what":"The usual first sketch for a web service, from the user's device to the data. Each box is one component; the arrows show the path of a request.","steps":["Press Play and read each component's job.","Ask: what happens if this box fails? Which ones need spares?","Notice which steps happen during the request and which happen later (the queue)."],"nodes":[["Users' devices","Browsers and mobile apps. DNS sends each user to the nearest entry point."],["CDN / edge","Serves images, scripts and cacheable pages from a city near the user; also absorbs attacks."],["Load balancer","Spreads requests across many identical servers and skips unhealthy ones."],["Application servers","Stateless: any server can handle any request, so we can add more when traffic grows."],["Cache (Redis)","Keeps popular data in memory; most reads end here in under a millisecond."],["Database","The source of truth. Copies (replicas) for reading; split into shards when one machine isn't enough."],["Queue + workers","Slow or non-urgent work — emails, thumbnails, analytics — happens in the background, off the user's request."],["Object storage + monitoring","Photos and files in S3-style storage; metrics, logs and traces for every component."]]}

## Step 6: Go deep on what's hard

Every system has a few genuinely hard parts. For a URL shortener it's generating unique short codes without a bottleneck; for a chat app, delivering messages in order to users who keep disconnecting; for a payment system, never charging twice. Spend your time there, and talk about **failure** ("what if the cache cluster dies?", "what if a whole data center goes down?") and **growth** ("what changes at 10× the traffic?").

Name every trade-off out loud: "I'm choosing X. It costs us Y, but requirement Z matters more here."

## Running a 45-minute design interview

| Minutes | What to do |
|---|---|
| 0–5 | Ask questions; write down the features and the scale/latency/availability goals |
| 5–10 | Estimate the numbers that will change your design |
| 10–15 | API and data model |
| 15–25 | High-level design: walk one request end to end |
| 25–40 | Deep dives on the hard parts, bottlenecks and failures |
| 40–45 | Summarize, list trade-offs, say what you'd do next |

What interviewers look for: you **drive** the conversation; your decisions are justified by **requirements and numbers**; you think about **failures**; and you **don't over-engineer** (no Kafka for 10 requests per second).

> [!RECAP]
> - System design = choosing components and how they fit, to meet goals for scale, speed, reliability and cost — through explicit **trade-offs**.
> - Start with **functional** and **non-functional** requirements; know what the "nines" mean in real downtime.
> - Chained dependencies **multiply** availability down; redundant copies **add** nines.
> - **Estimate** with round numbers (1M requests/day ≈ 12/s) and say what each number implies.
> - Then: **API → data model → high-level design → deep dives on the hard parts and failures**.

::quiz {"q":"About how many requests per second is 1 billion requests per day, on average?","options":["~1,200","~12,000","~120,000","~1.2 million"],"answer":1,"explain":"10⁹ ÷ ~86,400 seconds ≈ 11,600 per second."}

::quiz {"q":"A request must pass through three services, each 99.9% available. What's the overall availability?","options":["99.9%","About 99.7%","99.99%","About 97%"],"answer":1,"explain":"In a chain, availabilities multiply: 0.999³ ≈ 0.997."}

::quiz {"q":"What should you do first in a system design interview?","options":["Pick a database","Draw the architecture","Clarify the features and the scale, speed and availability requirements","Estimate storage"],"answer":2,"explain":"Requirements shape every later decision."}
