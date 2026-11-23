---
title: Multi-Region Architecture — Active-Passive, Active-Active and Data Across Regions
summary: Designing systems that span regions: why go multi-region (latency, availability, data residency), routing users with GeoDNS and anycast, stateless tiers vs data, single-writer with regional read replicas, partitioned "home region" designs, multi-writer with conflict resolution, global consensus databases, failover and failback, consistency pitfalls, and cost.
---

::widget Scene {"title": "Active-active with home regions", "sub": "Indian users write in Mumbai, US users in Virginia — what crosses the ocean?", "nodes": [{"id": "in", "kind": "user", "label": "User in Pune", "x": 0.0, "y": 0.0}, {"id": "us", "kind": "user", "label": "User in Ohio", "x": 7.44, "y": 7.44}, {"id": "geo", "kind": "router", "label": "GeoDNS / anycast", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "mum", "kind": "server", "label": "Mumbai region", "x": 8.5, "y": -8.5, "color": "purple"}, {"id": "va", "kind": "server", "label": "Virginia region", "x": 15.94, "y": -1.06, "color": "teal"}, {"id": "db1", "kind": "db", "label": "Users with home=IN", "x": 13.0, "y": -13.0, "color": "purple"}, {"id": "db2", "kind": "db", "label": "Users with home=US", "x": 20.44, "y": -5.56, "color": "teal"}], "links": [["in", "geo"], ["us", "geo"], ["geo", "mum"], ["geo", "va"], ["mum", "db1"], ["va", "db2"], ["db1", "db2", {"dashed": true, "label": "async replica"}]], "metrics": [["req", "Request"], ["lat", "Latency"], ["note", "Note"]], "steps": [{"short": "Why", "tag": "Why", "title": "One region means 250 ms round trips for distant users — and one region's outage is total", "body": "<p>Multi-region buys latency, availability and data residency — at a large cost in complexity.</p>", "show": ["in", "us"], "metrics": {"req": ["—"], "lat": ["250 ms cross-ocean"], "note": ["—"]}}, {"short": "Route", "tag": "Routing", "title": "GeoDNS or anycast sends each user to the nearest healthy region", "body": "<p>Health checks remove a failed region from DNS answers.</p>", "show": ["in", "us", "geo", "mum", "va"], "flow": [["in", "geo", "#3b82f6", ""], ["geo", "mum", "#3b82f6", "nearest"], ["us", "geo", "#3b82f6", ""], ["geo", "va", "#3b82f6", ""]], "metrics": {"lat": ["~20 ms to region", "good"]}}, {"short": "Stateless", "tag": "Easy part", "title": "Stateless services run identically everywhere", "body": "<p>The hard part is always the data.</p>"}, {"short": "Home", "tag": "Partition", "title": "Give each user a home region; their data lives there", "body": "<p>Writes go to the home region's primary: no write conflicts, because each record has exactly one writer region. Also satisfies data-residency rules.</p>", "show": ["in", "us", "geo", "mum", "va", "db1", "db2"], "flow": [["mum", "db1", "#a855f7", "write"], ["va", "db2", "#14b8a6", "write"]], "metrics": {"req": ["local writes"], "note": ["single writer per record"]}}, {"short": "Travel", "tag": "Edge case", "title": "An Indian user travelling in the US is routed to Virginia", "body": "<p>Virginia forwards their writes to Mumbai (one slower request) — or the app routes them by account, not geography.</p>", "flow": [["va", "db1", "#f59e0b", "forward write (+200 ms)"]], "metrics": {"req": ["travelling user"], "lat": ["+200 ms for writes"]}}, {"short": "Reads", "tag": "Reads", "title": "Asynchronously replicate each region's data to the other for global reads and DR", "body": "<p>Reads of remote users' profiles may be slightly stale.</p>", "flow": [["db1", "db2", "#14b8a6", "async"]], "metrics": {"note": ["stale cross-region reads OK?"]}}, {"short": "Fail", "tag": "Failover", "title": "Mumbai fails: Virginia promotes its replica of IN data", "body": "<p>Up to a few seconds of unreplicated writes may be lost (RPO), and latency rises for Indian users until failback.</p>", "set": {"mum": {"dim": true, "badge": "down"}, "db1": {"dim": true}, "db2": {"badge": "now also primary for IN"}}, "flow": [["geo", "va", "#22c55e", "all traffic"]], "metrics": {"note": ["RPO = replication lag"]}}, {"short": "Global", "tag": "Alternative", "title": "Need strong global consistency? Use a consensus database (Spanner, CockroachDB)", "body": "<p>Writes pay cross-region quorum latency (tens to 100+ ms), but no conflicts and no data loss on failover.</p>", "set": {"mum": {"dim": false, "badge": null}, "db1": {"dim": false}, "db2": {"badge": null}}}, {"short": "Choose", "tag": "Choose", "title": "Choose per dataset", "body": "<p>Profiles: home region. Global unique usernames: consensus or a single global service. Likes/counters: CRDTs. Product catalogue: single writer + replicas everywhere.</p>", "note": {"kind": "key", "text": "Route users to the nearest region; keep services stateless; give each record one writer region (or use consensus/CRDTs); replicate asynchronously for reads and DR; rehearse failover."}}]}

## When one region isn't enough

> [!STORY] A cloud provider's region suffers a multi-hour outage. Thousands of companies go offline — not because their code failed, but because everything they ran lived in that one region. Meanwhile, a few companies barely notice: their traffic shifts to another region within minutes. Building that resilience is one of the hardest problems in system design, because data doesn't move at the speed of DNS.

## Why go multi-region?

1. **Latency** — a round trip from India to the US east coast is ~200–250 ms. Serving from a nearby region cuts that to tens of milliseconds.
2. **Availability** — survive a full regional outage (power, network, control-plane bugs).
3. **Data residency** — laws may require certain users' data to stay in a country or region.

The cost: more infrastructure, cross-region data transfer charges, and — above all — **data consistency complexity**. Many systems are better served by multiple availability zones in one region plus a solid DR plan (Cloud chapter 15).

## Routing users

- **GeoDNS / latency-based DNS** returns the IP of the nearest healthy region; failover by removing unhealthy regions (keep TTLs low).
- **Anycast** announces the same IP from many locations; the network delivers to the nearest (common for CDNs and global load balancers).
- **Application-level routing** by account: send each user to their home region regardless of where they connect.

## Stateless tiers are easy; data is hard

Web servers, APIs and workers can run identically in every region. The design question is what happens to **writes**.

### Pattern 1: single writer, regional read replicas

One primary region takes all writes; other regions have read replicas. Simple, consistent writes, fast local reads (possibly stale). Remote users pay cross-region latency on writes. Failover = promote a replica.

### Pattern 2: partitioned by home region (active-active without conflicts)

Each user (or tenant) has a **home region** where all their writes go. Each region is primary for its own users and replicates asynchronously to others for reads and DR. No write conflicts because each record has one writer region. Watch cross-user operations (a payment between an Indian and a US user) — they need a defined owner or a saga.

### Pattern 3: multi-writer with conflict resolution

Any region accepts writes to any record; replication is asynchronous and conflicts are resolved by last-writer-wins, application merge logic or **CRDTs** (chapter 17). Great availability and latency; only safe for data where merging is acceptable (counters, carts, presence, collaborative docs) — never for balances.

### Pattern 4: global consensus database

Spanner, CockroachDB, YugabyteDB replicate with Raft/Paxos across regions. Every write needs a quorum, often across regions → write latency of tens to 100+ ms, but strong consistency and zero data loss on regional failure. Placement policies can pin data to regions for residency and locality.

## Consistency pitfalls

- **Read-your-writes across regions:** a user writes in one region, then a request lands in another region whose replica hasn't caught up. Pin sessions to a region or route reads for recently written data to the writer.
- **Global uniqueness** (usernames, emails): needs a single authority or consensus.
- **Clock-based ordering across regions** is unreliable (chapter 17).
- **Caches and search indexes** in each region need invalidation from replicated change streams.

## Failover and failback

- Decide **who declares** a regional failover and on what signals (automatic failover can flap on partial outages).
- **Fence** the old primary to prevent split brain.
- Ensure the surviving region has **capacity** for all traffic (pre-provisioned or quickly scalable).
- **Failback** deliberately: resync, verify, shift traffic back gradually.
- Practise regularly (game days).

## Cost

Duplicate infrastructure, cross-region replication traffic, and engineering complexity add up. Common compromise: active-active for stateless and read-heavy parts, warm standby for the database.

> [!RECAP]
> - Multi-region for **latency, availability and residency** — at significant cost.
> - Route with GeoDNS/anycast or by home region.
> - Data patterns: **single writer + replicas**, **home-region partitioning**, **multi-writer with CRDT/merge**, **global consensus DB**.
> - Mind read-your-writes, global uniqueness, clock ordering and cache invalidation.
> - Plan failover, fencing, capacity and failback; practise.

> [!INTERVIEW] "Design WhatsApp/Netflix/payments to survive a regional outage", "Active-active vs active-passive?", "How do you handle a user's writes when they travel?", "How do you guarantee unique usernames globally?", "Spanner vs Cassandra across regions?"

::quiz {"q": "How do home-region designs avoid write conflicts?", "options": ["They block all writes", "Each record has exactly one region allowed to write it", "They use wall-clock timestamps", "They replicate synchronously everywhere"], "answer": 1, "explain": "Single writer per record, multiple writers overall."}

::quiz {"q": "What does a global consensus database cost you?", "options": ["Data loss on failover", "Higher write latency due to cross-region quorums", "No SQL support", "No replication"], "answer": 1, "explain": "Strong consistency needs coordination."}

::quiz {"q": "Which data is safe for multi-writer with automatic merging?", "options": ["Bank balances", "Like counters and shopping carts using CRDTs", "Unique usernames", "Ledger entries"], "answer": 1, "explain": "Merging must be acceptable for the data."}
