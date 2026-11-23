---
title: Replication and Sharding — Copying and Splitting Data Across Machines
summary: When one database machine isn't enough. How keeping copies (replication) gives you safety and speed but brings the "where did my comment go?" problem, what happens when the main copy dies, how data is split across machines (sharding), how to choose the split, and what to do about celebrities who break your balance.
---

## Two reasons one machine isn't enough

Eventually a single database server runs into one of two walls:

1. **Too much traffic** — more reads or writes per second than one machine can handle.
2. **Too much data** — more than fits on one machine (or more than you can safely back up and restore in a reasonable time).

And even before those walls, one machine is a single point of failure: when it dies, your whole product is down.

There are two tools, usually used together:

- **Replication** — keep **copies** of the same data on several machines.
- **Partitioning (sharding)** — **split** the data, so each machine holds a different part.

## Part 1: Replication

Why keep copies?

- **Survive failures:** if one machine dies, another has the data.
- **Read faster:** spread read traffic across the copies.
- **Be close to users:** put a copy in each region of the world.

The hard part is **changes**: when data changes, every copy must change too.

### One leader, many followers

The most common setup: **all writes go to one machine — the leader** (also called primary). The leader records each change in its log and streams the log to **followers** (replicas), which apply the same changes in the same order. Reads can go to any copy. PostgreSQL, MySQL, MongoDB and Redis all work this way.

> [!ANALOGY] A newsroom with one editor-in-chief and several bureaus around the world. Only the editor approves changes to the official story; every approved change is sent out to the bureaus, which update their copies. Readers can read the story at any bureau. But a reader at a faraway bureau might see the version from a minute ago.

**Synchronous or asynchronous?** When the leader receives a write, does it wait for followers to confirm before telling the user "saved"?

- **Synchronous:** no data is lost if the leader dies, but one slow follower slows every write.
- **Asynchronous:** fast, but if the leader dies, the last few writes that hadn't reached followers yet are **lost**.
- Most systems compromise: wait for **one** follower, let the rest catch up asynchronously.

### "Where did my comment go?" — replication lag

Asynchronous followers are slightly behind the leader — usually milliseconds, but sometimes seconds or more under heavy load. Users notice:

> [!EXAMPLE] **The disappearing comment.** You post a comment (it's written to the leader). The page reloads, and the read goes to a follower that hasn't received your comment yet. Your comment is gone! You post it again — and now there are two. The fix, called **read-your-writes consistency**: for a short time after a user writes something, send that user's reads to the leader (or to a follower that's known to have caught up).

A related oddity: refresh twice, and a comment appears, then disappears, because the two reads hit followers at different points behind the leader. Fix: send each user's reads to the same follower.

### When the leader dies: failover

If the leader crashes, a follower must be promoted. This is called **failover**, and it's full of traps:

- **Detecting the death** relies on timeouts — but a leader that's just slow looks exactly like a dead one.
- **Lost writes:** with asynchronous replication, the new leader may be missing the old leader's last writes.
- **Split brain:** the old leader wasn't dead, just cut off from the network. It comes back still believing it's the leader, and now **two** machines accept writes, and the data diverges. Systems prevent this with **fencing**: every leader gets an increasing "epoch number", and storage rejects writes from any leader with an outdated number (chapter 5).

> [!STORY] **GitHub, 2012.** During a MySQL failover, a newly promoted database was missing some recent writes, and its auto-increment ID counter went back to numbers that had already been used. Another system (Redis) still held data keyed by those old IDs. The reused IDs caused some private repository data to be linked to the wrong users. A reminder that failover isn't just "start the spare".

### Several leaders, or none

- **Multi-leader:** each region has its own leader that accepts writes, and leaders exchange changes. Writes are fast everywhere, but two people can edit the same thing in two regions at once, creating a **conflict**. Simple fix: "last write wins" (which silently throws one away). Better: merge intelligently. Collaborative apps use special data structures called **CRDTs**, designed so concurrent edits always merge cleanly — this is how many offline-first and collaborative editing apps work.
- **Leaderless** (Amazon's Dynamo design; Cassandra, Riak, ScyllaDB): **any** copy accepts writes. With N copies, a write must be confirmed by W of them, and a read asks R of them and takes the newest answer. If **R + W > N**, every read set overlaps every write set, so reads see the latest write. For example, N = 3, W = 2, R = 2.

> [!ANALOGY] Three friends each keep a copy of the group's shared expense list. When you add an expense, you make sure at least two of them write it down. When you want the total, you ask at least two of them. Since any two friends out of three overlap, at least one of the two you asked has the latest entry.

## Part 2: Partitioning (sharding)

Replication gives you copies of **all** the data. When the data itself is too big, or there are too many writes for one leader, you **split** it: each **shard** holds part of the data, on its own machine (and each shard is usually replicated too).

> [!ANALOGY] A library too big for one building. You split it: the north building holds authors A–M, the south building N–Z. Each building can be staffed and grown independently. Readers need to know which building to go to — and if everybody suddenly wants books by authors starting with "S", the south building gets overwhelmed.

### How to split

::widget Stepper {"type":"hub","title":"Ways to split data across shards — click each","what":"The center is the question every sharded system must answer: given a record, which machine holds it? Each surrounding box is one strategy.","steps":["Click each strategy.","For each, ask: what happens with a sudden burst of new records?","Find the strategy that keeps range queries fast, and the one that keeps load even."],"nodes":[["Which shard holds this record?","Every read and write must find the right shard quickly from the record's key (its 'partition key')."],["By range","Shard 1 holds keys A–F, shard 2 holds G–M, and so on. Range queries ('all orders this week') are efficient. Danger: if keys arrive in order, like timestamps or increasing IDs, ALL new writes hit the last shard."],["By hash","Shard = hash(key) mod number of slots. Spreads load evenly, but a range query must ask every shard."],["Consistent hashing","Keys and shards on a ring (chapter 2). Adding a shard moves only a small slice of data. Used by Cassandra and Dynamo-style databases."],["Lookup directory","A small, highly available table records which key ranges live on which shard. Maximum flexibility; the directory must never go down."],["Compound key","Hash by the first part, sort by the second: (user_id, timestamp) keeps each user's events together on one shard, in time order — exactly what 'show this user's history' needs."]]}

### Choosing the partition key — the most important decision

A good partition key:

- has **many distinct values** and spreads traffic **evenly**;
- matches your **most common query**, so most requests touch just **one** shard: `user_id` for a social app (everything about a user is together), `tenant_id` for a business-software product (each customer's data is together — also great for isolation), `order_id` for an order system;
- is **not** steadily increasing when using range splits (or every new write piles onto the last shard).

### The celebrity problem (hot spots)

Even with perfect hashing, some keys are simply far more popular than others. When a megastar with 100 million followers posts, everyone requests the same few records, which all live on one shard.

Fixes:

- **Cache** the hot items aggressively.
- **Split the hot key**: store a counter for "likes on post 9001" as 10 sub-counters (`9001#0` … `9001#9`), spread across shards; writes go to a random one, and reads add them up.
- **Give the biggest customers their own shard.**

> [!EXAMPLE] DynamoDB and similar systems detect hot keys automatically and split or isolate them, because hot spots are the most common way a well-sharded system still falls over.

### Adding machines later: rebalancing

Data grows, and you add machines. Never use `hash(key) % number_of_machines` directly — adding one machine would move almost every record. Instead:

- create **many more partitions than machines** (say 1,024 partitions on 10 machines), and move whole partitions when machines are added — Redis Cluster uses 16,384 slots this way;
- or let partitions **split** automatically when they grow too large (MongoDB, Spanner);
- or use consistent hashing.

### What gets harder after sharding

- **Queries by anything other than the partition key** ("find all orders over ₹10,000") must ask every shard and combine the results — and they're only as fast as the slowest shard.
- **Joins and transactions across shards** are expensive. Designs avoid them by keeping related data together (same partition key), copying data where needed, or using databases built for distributed transactions (Google Spanner, CockroachDB).

## Putting it together

Real systems **split the data into shards, and replicate each shard**, usually with one leader per shard elected automatically (chapter 5). Kafka topics, Cassandra, Elasticsearch, MongoDB clusters and CockroachDB all follow this shape.

> [!RECAP]
> - **Replication** keeps copies for safety, read capacity and locality; **sharding** splits data that's too big or too busy for one machine.
> - **Leader–follower** is the common setup; asynchronous followers lag, causing "disappearing" writes — fix with **read-your-writes**.
> - **Failover** risks lost writes and **split brain**; fencing tokens prevent two leaders.
> - **Multi-leader** and **leaderless** (quorums with R + W > N) trade conflicts for availability.
> - Choose a **partition key** that spreads load and matches your main query; beware ever-increasing keys and **hot keys**.
> - Rebalance with many fixed partitions or consistent hashing, never `% number_of_machines`.

> [!INTERVIEW] When your design includes a database tier, say: how it's replicated (and how you'll handle lag), how failover works and how split brain is avoided, what the partition key is and why, how hot keys are handled, and how you'd add capacity. Quorum math (R + W > N) is a favorite question.

::quiz {"q":"A user edits their profile, refreshes, and sees the old version. Which guarantee is missing?","options":["Monotonic reads","Read-your-writes consistency","Durability","Atomicity"],"answer":1,"explain":"The read hit a lagging follower; route the user's own reads to the leader or an up-to-date follower."}

::quiz {"q":"With N = 5 copies, which write/read quorum guarantees that reads see the latest write?","options":["W = 2, R = 2","W = 3, R = 3","W = 1, R = 3","W = 2, R = 3"],"answer":1,"explain":"R + W must exceed N: 3 + 3 = 6 > 5."}

::quiz {"q":"Why is an ever-increasing order ID a bad partition key with range-based sharding?","options":["IDs aren't unique","Every new order lands on the last shard, creating a hot spot","IDs can't be indexed","It breaks hashing"],"answer":1,"explain":"Monotonic keys concentrate all new writes on one shard; hash them or choose another key."}
