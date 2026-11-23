---
title: Replication and Sharding: Copying and Splitting Data Across Machines
summary: When one database machine isn't enough. How keeping copies (replication) gives you safety and speed but brings the "where did my comment go?" problem, what happens when the main copy dies, how data is split across machines (sharding), how to choose the split, and what to do about celebrities who break your balance.
---

::widget Scene {"title": "Leader-follower replication and failover", "sub": "a write, a lagging read, a crash and a safe promotion", "nodes": [{"id": "app", "kind": "server", "label": "App", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "ld", "kind": "db", "label": "Leader", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "f1", "kind": "db", "label": "Follower A", "x": 9.0, "y": -9.0, "color": "teal"}, {"id": "f2", "kind": "db", "label": "Follower B", "x": 16.44, "y": -1.56, "color": "teal"}, {"id": "mon", "kind": "cube", "label": "Failover monitor", "x": 2.33, "y": -6.67, "color": "orange"}], "links": [["app", "ld"], ["ld", "f1", {"label": "log stream"}], ["ld", "f2"], ["app", "f1", {"dashed": true}], ["mon", "ld", {"dashed": true}], ["mon", "f1", {"dashed": true}]], "metrics": [["leader", "Leader"], ["lag", "Replica lag"], ["state", "Status"]], "steps": [{"short": "Roles", "tag": "Setup", "title": "One leader takes writes; followers copy it", "body": "<p>Followers hold full copies of the data. They serve reads and stand by to take over.</p>", "show": ["app", "ld", "f1", "f2"], "metrics": {"leader": ["Leader"], "lag": ["0"], "state": ["healthy", "good"]}}, {"short": "Write", "tag": "Write path", "title": "App writes: UPDATE balance = 500", "body": "<p>The leader applies it and appends it to its replication log (the WAL).</p>", "flow": [["app", "ld", "#3b82f6", "UPDATE"]], "set": {"ld": {"badge": "balance 500"}}}, {"short": "Stream", "tag": "Replicate", "title": "The log streams to followers, which replay it in order", "body": "<p>Same changes, same order → same data.</p>", "flow": [["ld", "f1", "#a855f7", "WAL"], ["ld", "f2", "#a855f7", "WAL"]], "set": {"f1": {"badge": "500"}, "f2": {"badge": "500"}}}, {"short": "Sync?", "tag": "Choice", "title": "Sync or async acknowledgement?", "body": "<p><b>Sync:</b> wait for a follower before confirming, no data loss, but slower and blocked if it is down. <b>Async:</b> confirm immediately, fast, but a crash can lose the last writes. Common: one sync follower, the rest async (\"semi-sync\").</p>", "set": {"f1": {"badge": "sync"}, "f2": {"badge": "async"}}}, {"short": "Lag", "tag": "Anomaly", "title": "User changes balance to 300, then reloads the page", "body": "<p>The write hit the leader; the reload read Follower B, which is 2 s behind. They see 500 and think their change failed.</p>", "flow": [["app", "ld", "#3b82f6", "= 300"], ["app", "f2", "#ef4444", "read → 500 (stale)"]], "set": {"ld": {"badge": "300"}, "f2": {"badge": "500 (behind)"}}, "metrics": {"lag": ["2 s", "bad"]}}, {"short": "RYW", "tag": "Fix", "title": "Read-your-writes: route this user's reads to the leader for a while", "body": "<p>Or track the log position of their last write and only read from followers that have reached it.</p>", "flow": [["app", "ld", "#22c55e", "read → 300"]], "set": {"f2": {"badge": "300"}}, "metrics": {"lag": ["0"]}}, {"short": "Crash", "tag": "Failure", "title": "The leader crashes", "body": "<p>Writes now fail. Reads from followers still work.</p>", "show": ["app", "ld", "f1", "f2", "mon"], "set": {"ld": {"dim": true, "badge": "down"}}, "metrics": {"state": ["no leader", "bad"]}}, {"short": "Detect", "tag": "Detect", "title": "The monitor notices missed heartbeats", "body": "<p>Too short a timeout causes failovers during a brief GC pause; too long means minutes of downtime. ~10–30 s is typical.</p>", "focus": ["mon"], "set": {"mon": {"badge": "3 heartbeats missed"}}}, {"short": "Pick", "tag": "Elect", "title": "Choose the follower with the most up-to-date log", "body": "<p>Follower A was synchronous, so it has every confirmed write. Promoting B could lose data.</p>", "focus": ["f1"], "set": {"f1": {"badge": "newest log"}}}, {"short": "Promote", "tag": "Promote", "title": "Promote A and repoint the app", "body": "<p>DNS or a proxy now sends writes to A. Follower B starts replicating from A.</p>", "flow": [["app", "f1", "#22c55e", "writes"], ["f1", "f2", "#a855f7", "WAL"]], "set": {"f1": {"label": "Leader (was A)", "badge": "leader"}, "mon": {"badge": null}}, "metrics": {"leader": ["A"], "state": ["recovered", "good"]}}, {"short": "Zombie", "tag": "Danger", "title": "The old leader comes back thinking it's still in charge", "body": "<p>Two leaders accepting writes = split brain, and conflicting data.</p>", "set": {"ld": {"dim": false, "badge": "I'm leader?!"}}, "metrics": {"state": ["split-brain risk", "bad"]}}, {"short": "Fence", "tag": "Fix", "title": "Fencing: the old leader's epoch is outdated, so its writes are rejected", "body": "<p>Each promotion increments an epoch (term) number. It rejoins as a follower and discards writes that were never replicated.</p>", "set": {"ld": {"label": "Follower (old leader)", "badge": "epoch 7 < 8"}}, "metrics": {"state": ["one leader", "good"]}, "note": {"kind": "key", "text": "Replication gives read scale and survival. The hard parts are lag anomalies and failover: detect, pick the freshest replica, promote, fence the old one."}}]}


::widget Scene {"title": "Sharding: splitting data across machines", "sub": "routing each key to its partition", "nodes": [{"id": "app", "kind": "server", "label": "App", "x": 4.65, "y": 4.65, "color": "blue"}, {"id": "r", "kind": "router", "label": "Shard router: hash(user) % 3", "x": 8.45, "y": 0.85, "color": "teal"}, {"id": "s0", "kind": "db", "label": "Shard 0", "x": 8.0, "y": -8.0, "color": "orange"}, {"id": "s1", "kind": "db", "label": "Shard 1", "x": 12.96, "y": -3.04, "color": "green"}, {"id": "s2", "kind": "db", "label": "Shard 2", "x": 17.92, "y": 1.92, "color": "purple"}], "links": [["app", "r"], ["r", "s0"], ["r", "s1"], ["r", "s2"]], "metrics": [["rows", "Rows per shard"], ["q", "Query"]], "steps": [{"short": "Too big", "tag": "Problem", "title": "One database can't hold or serve everything", "body": "<p>300 million users, 40 TB of data, 200k writes per second, more than any single machine can handle. Replication helps reads, not writes or size.</p>", "show": ["app", "s1"], "metrics": {"rows": ["300 M on one machine", "bad"], "q": ["-"]}}, {"short": "Split", "tag": "Partition", "title": "Split users across 3 shards by a hash of their ID", "body": "<p>Each shard holds roughly a third of the users. Which shard? <code>hash(user_id) % 3</code>, fast to compute, evenly spread.</p>", "show": ["app", "r", "s0", "s1", "s2"], "metrics": {"rows": ["~100 M each", "good"]}}, {"short": "Route", "tag": "Route", "title": "A query for one user touches one shard", "body": "<p>\"Get user 8817's orders\": hash says shard 1. Only that machine does any work. Shards work independently, so capacity grows with the number of shards.</p>", "flow": [[["app", "r", "s1"], "#f59e0b", "user 8817"]], "focus": ["s1"], "metrics": {"q": ["1 shard", "good"]}}, {"short": "Scatter", "tag": "Gotcha", "title": "A query across all users touches every shard", "body": "<p>\"Top 10 spenders this month\" has no single shard key, the router must ask all shards and merge the results (scatter-gather). Slower, and only as fast as the slowest shard.</p>", "flow": [["r", "s0", "#f59e0b", "top 10?"], ["r", "s1", "#f59e0b", "top 10?"], ["r", "s2", "#f59e0b", "top 10?"]], "metrics": {"q": ["all shards", "bad"]}}, {"short": "Add a shard", "tag": "Rebalance", "title": "Adding a 4th shard moves almost everything", "body": "<p>With <code>% 3</code> → <code>% 4</code>, about 75% of keys change shard, a huge, risky migration. That's why real systems use <b>consistent hashing</b> or many small virtual partitions that move individually.</p>", "note": {"kind": "key", "text": "Choose the shard key carefully: it should spread load evenly and match your most common queries. A bad key creates hot shards or constant scatter-gather."}}]}

::widget Scene {"title": "Consistent hashing: adding a server moves only a few keys", "sub": "a ring of caches", "nodes": [{"id": "a", "kind": "cache", "label": "Cache A", "x": 3.1, "y": 3.1, "color": "blue"}, {"id": "b", "kind": "cache", "label": "Cache B", "x": 2.45, "y": -5.55, "color": "green"}, {"id": "c", "kind": "cache", "label": "Cache C", "x": 11.1, "y": -4.9, "color": "purple"}, {"id": "d", "kind": "cache", "label": "Cache D (new)", "x": 11.75, "y": 3.75, "color": "orange"}], "links": [["a", "b"], ["b", "c"], ["c", "d", {"dashed": true}], ["d", "a", {"dashed": true}]], "metrics": [["moved", "Keys that move when D joins"], ["mod", "With hash % N"]], "steps": [{"short": "Ring", "tag": "Idea", "title": "Place servers and keys on a ring by hash", "body": "<p>Each key belongs to the next server clockwise.</p>", "show": ["a", "b", "c"], "metrics": {"moved": ["-"], "mod": ["-"]}}, {"short": "Add D", "tag": "Grow", "title": "Add Cache D between C and A", "body": "<p>Only keys between C and D move to D. Everything else stays put.</p>", "flow": [["a", "d", "#f59e0b", "some keys"]], "metrics": {"moved": ["~25%", "good"], "mod": ["~75%", "bad"]}}, {"short": "Virtual nodes", "tag": "Balance", "title": "Give each server many points on the ring", "body": "<p>Virtual nodes spread load evenly and let a bigger server take more keys. Used by DynamoDB, Cassandra and CDNs.</p>", "note": {"kind": "key", "text": "hash % N reshuffles almost everything when N changes, a cache stampede. Consistent hashing limits the damage to ~1/N of keys."}}]}

::widget Scene {"title": "Unique IDs at scale without a central counter", "sub": "Snowflake-style 64-bit IDs", "nodes": [{"id": "id", "kind": "cells", "label": "64-bit ID", "x": 3.1, "y": 3.1, "values": ["time ms", "machine", "sequence"]}], "metrics": [["ex", "Example"]], "steps": [{"short": "Problem", "tag": "Problem", "title": "One auto-increment counter can't serve 1,000 servers", "body": "<p>Every insert would wait on one database. UUIDs work but are 128-bit and random (bad for index locality).</p>", "metrics": {"ex": ["-"]}}, {"short": "Pieces", "tag": "Layout", "title": "Timestamp + machine ID + per-millisecond sequence", "body": "<p>41 bits of milliseconds, 10 bits of machine ID, 12 bits of sequence: each machine creates 4,096 unique IDs per millisecond with no coordination.</p>", "set": {"id": {"marks": {"0": "blue", "1": "purple", "2": "green"}, "ptr": {}}}, "metrics": {"ex": ["1765432109876 | 42 | 7"]}}, {"short": "Sortable", "tag": "Bonus", "title": "IDs sort by time", "body": "<p>Newest-first queries need no extra index, and B-tree inserts stay at the end. Twitter's Snowflake, Instagram's IDs and UUIDv7 all use this idea.</p>", "note": {"kind": "key", "text": "Watch for clock skew: if a machine's clock jumps backwards, it must wait or it could repeat IDs."}}]}

## Two reasons one machine isn't enough

Eventually a single database server runs into one of two walls:

1. **Too much traffic** more reads or writes per second than one machine can handle.
2. **Too much data** more than fits on one machine (or more than you can safely back up and restore in a reasonable time).

And even before those walls, one machine is a single point of failure: when it dies, your whole product is down.

There are two tools, usually used together:

- **Replication** keep **copies** of the same data on several machines.
- **Partitioning (sharding)** **split** the data, so each machine holds a different part.

## Part 1: Replication



Why keep copies?

- **Survive failures:** if one machine dies, another has the data.
- **Read faster:** spread read traffic across the copies.
- **Be close to users:** put a copy in each region of the world.

The hard part is **changes**: when data changes, every copy must change too.

### One leader, many followers

The most common setup: **all writes go to one machine, the leader** (also called primary). The leader records each change in its log and streams the log to **followers** (replicas), which apply the same changes in the same order. Reads can go to any copy. PostgreSQL, MySQL, MongoDB and Redis all work this way.

> [!ANALOGY] A newsroom with one editor-in-chief and several bureaus around the world. Only the editor approves changes to the official story; every approved change is sent out to the bureaus, which update their copies. Readers can read the story at any bureau. But a reader at a faraway bureau might see the version from a minute ago.

**Synchronous or asynchronous?** When the leader receives a write, does it wait for followers to confirm before telling the user "saved"?

- **Synchronous:** no data is lost if the leader dies, but one slow follower slows every write.
- **Asynchronous:** fast, but if the leader dies, the last few writes that hadn't reached followers yet are **lost**.
- Most systems compromise: wait for **one** follower, let the rest catch up asynchronously.

### "Where did my comment go?", replication lag

Asynchronous followers are slightly behind the leader, usually milliseconds, but sometimes seconds or more under heavy load. Users notice:

> [!EXAMPLE] **The disappearing comment.** You post a comment (it's written to the leader). The page reloads, and the read goes to a follower that hasn't received your comment yet. Your comment is gone! You post it again, and now there are two. The fix, called **read-your-writes consistency**: for a short time after a user writes something, send that user's reads to the leader (or to a follower that's known to have caught up).

A related oddity: refresh twice, and a comment appears, then disappears, because the two reads hit followers at different points behind the leader. Fix: send each user's reads to the same follower.

### When the leader dies: failover

If the leader crashes, a follower must be promoted. This is called **failover** and it's full of traps:

- **Detecting the death** relies on timeouts, but a leader that's just slow looks exactly like a dead one.
- **Lost writes:** with asynchronous replication, the new leader may be missing the old leader's last writes.
- **Split brain:** the old leader wasn't dead, just cut off from the network. It comes back still believing it's the leader, and now **two** machines accept writes, and the data diverges. Systems prevent this with **fencing**: every leader gets an increasing "epoch number", and storage rejects writes from any leader with an outdated number (chapter 5).

> [!STORY] **GitHub, 2012.** During a MySQL failover, a newly promoted database was missing some recent writes, and its auto-increment ID counter went back to numbers that had already been used. Another system (Redis) still held data keyed by those old IDs. The reused IDs caused some private repository data to be linked to the wrong users. A reminder that failover isn't just "start the spare".

### Several leaders, or none

- **Multi-leader:** each region has its own leader that accepts writes, and leaders exchange changes. Writes are fast everywhere, but two people can edit the same thing in two regions at once, creating a **conflict**. Simple fix: "last write wins" (which silently throws one away). Better: merge intelligently. Collaborative apps use special data structures called **CRDTs** designed so concurrent edits always merge cleanly, this is how many offline-first and collaborative editing apps work.
- **Leaderless** (Amazon's Dynamo design; Cassandra, Riak, ScyllaDB): **any** copy accepts writes. With N copies, a write must be confirmed by W of them, and a read asks R of them and takes the newest answer. If **R + W > N** every read set overlaps every write set, so reads see the latest write. For example, N = 3, W = 2, R = 2.

> [!ANALOGY] Three friends each keep a copy of the group's shared expense list. When you add an expense, you make sure at least two of them write it down. When you want the total, you ask at least two of them. Since any two friends out of three overlap, at least one of the two you asked has the latest entry.

## Part 2: Partitioning (sharding)



Replication gives you copies of **all** the data. When the data itself is too big, or there are too many writes for one leader, you **split** it: each **shard** holds part of the data, on its own machine (and each shard is usually replicated too).

> [!ANALOGY] A library too big for one building. You split it: the north building holds authors A–M, the south building N–Z. Each building can be staffed and grown independently. Readers need to know which building to go to, and if everybody suddenly wants books by authors starting with "S", the south building gets overwhelmed.

### How to split

::widget Stepper {"type":"hub","title":"Ways to split data across shards, click each","what":"The center is the question every sharded system must answer: given a record, which machine holds it? Each surrounding box is one strategy.","steps":["Click each strategy.","For each, ask: what happens with a sudden burst of new records?","Find the strategy that keeps range queries fast, and the one that keeps load even."],"nodes":[["Which shard holds this record?","Every read and write must find the right shard quickly from the record's key (its 'partition key')."],["By range","Shard 1 holds keys A–F, shard 2 holds G–M, and so on. Range queries ('all orders this week') are efficient. Danger: if keys arrive in order, like timestamps or increasing IDs, ALL new writes hit the last shard."],["By hash","Shard = hash(key) mod number of slots. Spreads load evenly, but a range query must ask every shard."],["Consistent hashing","Keys and shards on a ring (chapter 2). Adding a shard moves only a small slice of data. Used by Cassandra and Dynamo-style databases."],["Lookup directory","A small, highly available table records which key ranges live on which shard. Maximum flexibility; the directory must never go down."],["Compound key","Hash by the first part, sort by the second: (user_id, timestamp) keeps each user's events together on one shard, in time order, exactly what 'show this user's history' needs."]]}

### Choosing the partition key, the most important decision

A good partition key:

- has **many distinct values** and spreads traffic **evenly**;
- matches your **most common query** so most requests touch just **one** shard: `user_id` for a social app (everything about a user is together), `tenant_id` for a business-software product (each customer's data is together, also great for isolation), `order_id` for an order system;
- is **not** steadily increasing when using range splits (or every new write piles onto the last shard).

### The celebrity problem (hot spots)

Even with perfect hashing, some keys are simply far more popular than others. When a megastar with 100 million followers posts, everyone requests the same few records, which all live on one shard.

Fixes:

- **Cache** the hot items aggressively.
- **Split the hot key**: store a counter for "likes on post 9001" as 10 sub-counters (`9001#0` … `9001#9`), spread across shards; writes go to a random one, and reads add them up.
- **Give the biggest customers their own shard.**

> [!EXAMPLE] DynamoDB and similar systems detect hot keys automatically and split or isolate them, because hot spots are the most common way a well-sharded system still falls over.

### Adding machines later: rebalancing

Data grows, and you add machines. Never use `hash(key) % number_of_machines` directly, adding one machine would move almost every record. Instead:

- create **many more partitions than machines** (say 1,024 partitions on 10 machines), and move whole partitions when machines are added, Redis Cluster uses 16,384 slots this way;
- or let partitions **split** automatically when they grow too large (MongoDB, Spanner);
- or use consistent hashing.

### What gets harder after sharding

- **Queries by anything other than the partition key** ("find all orders over ₹10,000") must ask every shard and combine the results, and they're only as fast as the slowest shard.
- **Joins and transactions across shards** are expensive. Designs avoid them by keeping related data together (same partition key), copying data where needed, or using databases built for distributed transactions (Google Spanner, CockroachDB).

## Putting it together

Real systems **split the data into shards, and replicate each shard** usually with one leader per shard elected automatically (chapter 5). Kafka topics, Cassandra, Elasticsearch, MongoDB clusters and CockroachDB all follow this shape.

> [!RECAP]
> - **Replication** keeps copies for safety, read capacity and locality; **sharding** splits data that's too big or too busy for one machine.
> - **Leader–follower** is the common setup; asynchronous followers lag, causing "disappearing" writes, fix with **read-your-writes**.
> - **Failover** risks lost writes and **split brain**; fencing tokens prevent two leaders.
> - **Multi-leader** and **leaderless** (quorums with R + W > N) trade conflicts for availability.
> - Choose a **partition key** that spreads load and matches your main query; beware ever-increasing keys and **hot keys**.
> - Rebalance with many fixed partitions or consistent hashing, never `% number_of_machines`.

> [!INTERVIEW] When your design includes a database tier, say: how it's replicated (and how you'll handle lag), how failover works and how split brain is avoided, what the partition key is and why, how hot keys are handled, and how you'd add capacity. Quorum math (R + W > N) is a favorite question.

::quiz {"q":"A user edits their profile, refreshes, and sees the old version. Which guarantee is missing?","options":["Monotonic reads","Read-your-writes consistency","Durability","Atomicity"],"answer":1,"explain":"The read hit a lagging follower; route the user's own reads to the leader or an up-to-date follower."}

::quiz {"q":"With N = 5 copies, which write/read quorum guarantees that reads see the latest write?","options":["W = 2, R = 2","W = 3, R = 3","W = 1, R = 3","W = 2, R = 3"],"answer":1,"explain":"R + W must exceed N: 3 + 3 = 6 > 5."}

::quiz {"q":"Why is an ever-increasing order ID a bad partition key with range-based sharding?","options":["IDs aren't unique","Every new order lands on the last shard, creating a hot spot","IDs can't be indexed","It breaks hashing"],"answer":1,"explain":"Monotonic keys concentrate all new writes on one shard; hash them or choose another key."}
