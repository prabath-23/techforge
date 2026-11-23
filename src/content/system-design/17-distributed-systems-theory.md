---
title: Distributed Systems Theory — Time, Clocks, Quorums, CRDTs, Gossip and Leases
summary: The ideas senior system design rounds probe: why wall clocks lie, Lamport and vector clocks for ordering, detecting concurrent writes, quorum reads and writes (R + W > N), CRDTs that merge without coordination, gossip protocols and failure detection, PACELC beyond CAP, leases and fencing tokens, and the FLP and two-generals impossibility results in plain language.
---

::widget Scene {"title": "Vector clocks detect a conflict", "sub": "two replicas update the same shopping cart while partitioned", "nodes": [{"id": "a", "kind": "server", "label": "Replica A", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "bb", "kind": "server", "label": "Replica B", "x": 7.44, "y": 7.44, "color": "purple"}, {"id": "m", "kind": "cube", "label": "Merge on read", "x": 9.72, "y": -2.28, "color": "orange"}, {"id": "cl", "kind": "laptop", "label": "Client", "x": 14.72, "y": -7.28}], "links": [["a", "m"], ["bb", "m"], ["m", "cl"]], "metrics": [["va", "A's version"], ["vb", "B's version"], ["rel", "Relationship"]], "steps": [{"short": "Start", "tag": "Start", "title": "Cart = [milk], clock {A:1, B:0} on both replicas", "body": "<p>A vector clock keeps one counter per replica: \"how many updates from each replica this version has seen\".</p>", "show": ["a", "bb"], "set": {"a": {"badge": "[milk] {A1,B0}"}, "bb": {"badge": "[milk] {A1,B0}"}}, "metrics": {"va": ["{A1, B0}"], "vb": ["{A1, B0}"], "rel": ["equal"]}}, {"short": "Split", "tag": "Partition", "title": "The network splits A from B", "body": "<p>Both stay available (an AP choice), accepting writes.</p>"}, {"short": "WA", "tag": "Write A", "title": "On A: add bread → A increments its own counter → {A:2, B:0}", "body": "<p>Only the replica that handles the write increments its entry.</p>", "set": {"a": {"badge": "[milk, bread] {A2,B0}"}}, "metrics": {"va": ["{A2, B0}"]}}, {"short": "WB", "tag": "Write B", "title": "On B: add eggs → {A:1, B:1}", "body": "<p>B never saw bread.</p>", "set": {"bb": {"badge": "[milk, eggs] {A1,B1}"}}, "metrics": {"vb": ["{A1, B1}"]}}, {"short": "Compare", "tag": "Compare", "title": "Heal: compare the clocks", "body": "<p>X happened-before Y if every counter in X ≤ Y and at least one is smaller. {A2,B0} vs {A1,B1}: A is bigger in one, B in the other.</p>", "show": ["a", "bb", "m"], "flow": [["a", "m", "#3b82f6", "{A2,B0}"], ["bb", "m", "#a855f7", "{A1,B1}"]], "metrics": {"rel": ["concurrent (conflict)", "bad"]}}, {"short": "LWW", "tag": "Wrong fix", "title": "Last-writer-wins by wall clock would silently drop one item", "body": "<p>And clocks on two servers can be seconds apart.</p>"}, {"short": "Merge", "tag": "Merge", "title": "Keep both versions (siblings) and merge: union of items", "body": "<p>[milk, bread, eggs] with clock {A2, B1} — the element-wise maximum. Amazon's Dynamo did this for carts.</p>", "show": ["a", "bb", "m", "cl"], "flow": [["m", "cl", "#22c55e", "merged cart"]], "set": {"m": {"badge": "[milk, bread, eggs] {A2,B1}"}}, "metrics": {"rel": ["merged", "good"]}}, {"short": "CRDT", "tag": "CRDT", "title": "Better: make the data type merge itself — a CRDT", "body": "<p>An add-wins set merges deterministically on every replica, no application code needed.</p>"}, {"short": "Cost", "tag": "Trade-off", "title": "Vector clocks grow with the number of writers", "body": "<p>Systems prune them or use version vectors per replica rather than per client.</p>", "note": {"kind": "key", "text": "Vector clocks tell \"before\", \"after\" or \"concurrent\". Concurrent writes need merging (siblings or CRDTs) — not wall-clock last-writer-wins."}}]}

## The order that arrived before it was placed

> [!STORY] An engineer debugging an incident sorts logs from three services by timestamp and finds an order being shipped *before* it was created. Nothing was wrong with the code — the shipping server's clock was 700 milliseconds ahead of the order server's. In a distributed system there is no single "now". Senior system design interviews probe whether you know how systems order events, detect conflicts and agree, despite unreliable clocks and networks.

## Why wall clocks lie

Each machine's clock drifts and is periodically corrected by **NTP** — sometimes jumping backwards. Clock skew of milliseconds (sometimes seconds) between machines is normal. So:

- Never use wall-clock timestamps from different machines to decide which event happened first.
- Use **monotonic clocks** for measuring durations on one machine.
- Use **logical clocks** for ordering across machines.

Google Spanner's **TrueTime** is the exception that proves the rule: GPS and atomic clocks give a bounded uncertainty interval, and Spanner *waits out* the uncertainty before committing so timestamps are safe.

## Lamport clocks

Each process keeps a counter: increment it before each event; attach it to messages; on receiving, set `counter = max(local, received) + 1`. If A happened before B, then `L(A) < L(B)`. The reverse isn't guaranteed — Lamport clocks give a total order consistent with causality, but can't tell you whether two events were **concurrent**.

## Vector clocks

A vector clock keeps one counter per node. Comparing two vectors tells you whether one version **happened before** the other or whether they're **concurrent** (see the lesson). Concurrent versions are a conflict that must be resolved: return both to the application, merge with domain logic, or use a CRDT.

**Hybrid logical clocks (HLC)** combine physical time with a logical counter, giving timestamps close to real time that still respect causality (used by CockroachDB and others).

## Quorums

With **N** replicas, write to **W** and read from **R**:

- If **R + W > N**, every read set overlaps every write set, so a read sees the latest acknowledged write (with care around concurrent writes and failures).
- N=3, W=2, R=2 is the classic balance. W=1 speeds writes; R=1 speeds reads, each weakening guarantees.
- **Sloppy quorums** and **hinted handoff** (Dynamo-style) keep writes available during failures by storing on substitute nodes, later handing data back; **read repair** and **anti-entropy** with Merkle trees fix replicas that drifted.

## CRDTs: merge without coordination

**Conflict-free replicated data types** are data structures designed so that replicas can be updated independently and always converge when they exchange state, in any order:

- **G-Counter** — each replica counts its own increments; value = sum. Merge = element-wise max.
- **PN-Counter** — two G-Counters (increments and decrements).
- **OR-Set** (observed-remove set) — add-wins semantics with unique tags.
- **LWW-Register** — last-writer-wins with (hybrid) timestamps, where losing updates is acceptable.
- Sequence CRDTs power collaborative editors (alongside operational transformation).

Used by Redis active-active, Riak, Figma-style collaboration, and offline-first apps.

## Gossip and failure detection

In large clusters, nodes learn about each other by **gossip**: every second each node exchanges state with a few random peers. Information spreads to all N nodes in about log N rounds, without a central coordinator — robust and scalable. Cassandra and Consul use gossip for membership.

Failure detection can't be perfect: a slow node looks like a dead one. **Phi-accrual detectors** output a suspicion level based on heartbeat history; **SWIM** adds indirect probing through other nodes to avoid false positives from a single bad link.

## PACELC: CAP's missing half

CAP (System Design chapter 5) only describes behaviour during a **P**artition: choose **A**vailability or **C**onsistency. **PACELC** adds: **E**lse — in normal operation — choose **L**atency or **C**onsistency, because strong consistency needs coordination round trips even when nothing is broken.

- **PA/EL:** Dynamo, Cassandra (by default) — available and fast, eventually consistent.
- **PC/EC:** Spanner, etcd, traditional single-leader databases with synchronous replication — consistent, pays latency.
- Many systems are tunable per request.

## Leases and fencing tokens

A **lease** is a lock with an expiry: "you're the leader for 10 seconds; renew before then". If the holder crashes, the lease expires and someone else takes over — no deadlock forever.

The danger: a holder pauses (GC, VM migration) longer than its lease, wakes up, and still thinks it's the leader. The fix is a **fencing token** — a number that increases with each new lease. Storage rejects writes carrying an older token than it has already seen.

## Impossibility results, in one paragraph each

- **Two generals:** over an unreliable channel, two parties can never be *certain* they agree — every acknowledgement needs its own acknowledgement. Systems settle for high probability, timeouts and idempotent retries.
- **FLP:** in a fully asynchronous system where even one process may crash, no deterministic consensus algorithm can guarantee termination. Practical algorithms (Raft, Paxos) are always safe and make progress when the network behaves reasonably — using timeouts and randomisation.

> [!RECAP]
> - Wall clocks skew; use logical clocks (Lamport, **vector**, hybrid) for ordering.
> - Vector clocks distinguish before/after from **concurrent**; resolve conflicts by merging, not by timestamps.
> - Quorums: **R + W > N**; repair with read repair and anti-entropy.
> - **CRDTs** converge without coordination.
> - **Gossip** spreads membership in O(log N) rounds; failure detection is probabilistic.
> - **PACELC**: during partitions A vs C; otherwise latency vs consistency.
> - Leases need **fencing tokens**.

> [!INTERVIEW] "How would you order events across services?", "What's a vector clock?", "Explain R + W > N", "How does a shopping cart handle concurrent writes?", "What is a CRDT?", "Why do leases need fencing tokens?", "Explain PACELC."

::quiz {"q": "Two versions have vector clocks {A:2,B:0} and {A:1,B:1}. What are they?", "options": ["A happened before B", "B happened before A", "Concurrent — a conflict", "Identical"], "answer": 2, "explain": "Each is greater in one component."}

::quiz {"q": "With N=3 replicas, which setting guarantees reads overlap the latest write?", "options": ["W=1, R=1", "W=2, R=2", "W=1, R=2", "W=0, R=3"], "answer": 1, "explain": "R + W must exceed N."}

::quiz {"q": "What problem do fencing tokens solve?", "options": ["Slow DNS", "A paused former lock holder writing after its lease expired", "Clock drift on one machine", "Disk failure"], "answer": 1, "explain": "Storage rejects writes with stale tokens."}
