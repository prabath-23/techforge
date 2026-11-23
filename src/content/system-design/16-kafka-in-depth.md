---
title: Kafka in Depth — Logs, Partitions, Replication, Consumer Groups and Exactly-Once
summary: How Apache Kafka really works: topics as partitioned append-only logs, producers with keys, batching and acks, brokers and in-sync replicas, leader election with KRaft, consumer groups, offsets and rebalancing, delivery guarantees and exactly-once with idempotent producers and transactions, retention and compaction, ordering, sizing partitions, and operating Kafka in production.
---

::widget Scene {"title": "One message through Kafka", "sub": "produce with a key → replicate → commit → consume in a group", "nodes": [{"id": "p", "kind": "server", "label": "Producer (orders service)", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "b1", "kind": "server", "label": "Broker 1: P2 leader", "x": 5.0, "y": -5.0, "color": "purple"}, {"id": "b2", "kind": "server", "label": "Broker 2: P2 follower", "x": 8.72, "y": -1.28, "color": "purple"}, {"id": "b3", "kind": "server", "label": "Broker 3: P2 follower", "x": 12.44, "y": 2.44, "color": "purple"}, {"id": "log", "kind": "cells", "label": "partition 2 log (offsets)", "x": 10.43, "y": -8.57, "values": [4810, 4811, 4812, ""]}, {"id": "cg", "kind": "cpu", "label": "Consumer group \"billing\" (3 consumers)", "x": 19.7, "y": -7.3, "color": "green"}, {"id": "ctl", "kind": "cube", "label": "KRaft controllers", "x": 9.3, "y": 9.3, "color": "orange"}], "links": [["p", "b1"], ["b1", "b2"], ["b1", "b3"], ["b1", "cg"], ["ctl", "b1", {"dashed": true}]], "metrics": [["step", "Step"], ["isr", "In-sync replicas"], ["offset", "Offset"]], "steps": [{"short": "Topic", "tag": "Model", "title": "Topic \"orders\" = 6 partitions, each an append-only log", "body": "<p>Messages are never updated in place; each gets the next offset in its partition. Partitions are spread across brokers, each replicated 3 times.</p>", "show": ["b1", "b2", "b3", "log"], "metrics": {"step": ["—"], "isr": ["3"], "offset": ["4812 last"]}}, {"short": "Key", "tag": "Partition", "title": "Producer sends key=customer-42: hash(key) % 6 → partition 2", "body": "<p>Same key → same partition → per-key ordering. No key → spread for balance.</p>", "show": ["p", "b1", "b2", "b3", "log"], "flow": [["p", "b1", "#3b82f6", "key 42 → P2"]], "metrics": {"step": ["partitioning"]}}, {"short": "Batch", "tag": "Batching", "title": "The producer batches and compresses messages per partition", "body": "<p>linger.ms and batch.size trade a few ms of latency for big throughput gains.</p>"}, {"short": "Leader", "tag": "Write", "title": "The partition leader (broker 1) appends it at offset 4813", "body": "<p>Written to the page cache and the log segment file — sequential writes, very fast.</p>", "set": {"log": {"marks": {"3": "blue"}, "ptr": {}, "values": [4810, 4811, 4812, 4813]}}, "metrics": {"offset": ["4813"]}}, {"short": "Replicate", "tag": "Replicate", "title": "Followers fetch and copy the message", "body": "<p>Replicas that keep up form the ISR (in-sync replica set).</p>", "flow": [["b1", "b2", "#a855f7", "fetch"], ["b1", "b3", "#a855f7", "fetch"]], "metrics": {"step": ["replication"]}}, {"short": "Ack", "tag": "acks=all", "title": "With acks=all, the leader acks only after all ISR replicas have it", "body": "<p>Combined with min.insync.replicas=2, a write survives a broker failure. acks=1 is faster but can lose data on failover.</p>", "flow": [["b1", "p", "#22c55e", "ack offset 4813"]], "metrics": {"step": ["committed (high watermark)"], "isr": ["3", "good"]}}, {"short": "Group", "tag": "Consume", "title": "Consumer group \"billing\": each partition is read by exactly one consumer", "body": "<p>6 partitions, 3 consumers → 2 partitions each. Add consumers up to 6 for more parallelism.</p>", "show": ["p", "b1", "b2", "b3", "log", "cg"], "flow": [["b1", "cg", "#22c55e", "poll P2"]], "metrics": {"step": ["consume"]}}, {"short": "Commit", "tag": "Offsets", "title": "After processing, the consumer commits offset 4814", "body": "<p>Stored in the internal __consumer_offsets topic. Commit after processing = at-least-once; before = at-most-once.</p>", "metrics": {"offset": ["committed 4814"]}}, {"short": "Crash", "tag": "Rebalance", "title": "A consumer crashes: its partitions are reassigned (rebalance)", "body": "<p>The new owner resumes from the last committed offset — messages processed but not committed are re-delivered. Make processing idempotent.</p>", "set": {"cg": {"badge": "rebalance: 2 consumers"}}}, {"short": "Broker", "tag": "Failover", "title": "Broker 1 dies: KRaft controllers elect a new leader from the ISR", "body": "<p>Producers and consumers refresh metadata and continue. Unclean leader election (non-ISR) is off to avoid data loss.</p>", "show": ["p", "b1", "b2", "b3", "log", "cg", "ctl"], "set": {"b1": {"dim": true, "badge": "down"}, "b2": {"badge": "new P2 leader"}}, "metrics": {"isr": ["2"], "step": ["failover", "good"]}}, {"short": "EOS", "tag": "Exactly-once", "title": "Exactly-once: idempotent producer + transactions + read_committed", "body": "<p>Read-process-write pipelines commit output messages and input offsets atomically.</p>", "note": {"kind": "key", "text": "Partitioned, replicated append-only logs. Keys give per-key order; acks=all + min.insync.replicas give durability; consumer groups give parallelism; offsets give replay."}}]}

## The queue that remembered everything

> [!STORY] LinkedIn built Kafka in 2010 because it needed to move enormous streams of activity data — page views, clicks, updates — to many systems at once: search indexing, analytics, monitoring, recommendations. Traditional message queues deleted messages once consumed and buckled at that volume. Kafka's idea was simple and powerful: treat the stream as a **durable, replicated log** that many consumers read independently, at their own pace, and can replay. Today it's the backbone of event-driven architecture at thousands of companies.

## Core model

- **Topic** — a named stream (`orders`, `payments`).
- **Partition** — a topic is split into partitions; each is an **ordered, append-only log** stored on disk. Each message gets an increasing **offset** within its partition.
- **Broker** — a Kafka server storing partitions. A cluster has many brokers.
- **Replication factor** — each partition has copies on several brokers (commonly 3): one **leader** handles reads and writes; **followers** copy it.
- **Retention** — messages are kept for a time (e.g. 7 days) or size limit, regardless of whether they've been consumed.

Ordering is guaranteed **only within a partition**.

## Producers

```java
props.put("acks", "all");
props.put("enable.idempotence", "true");
props.put("linger.ms", "5");
props.put("compression.type", "zstd");
producer.send(new ProducerRecord<>("orders", order.customerId(), orderJson));
```

- **Key → partition** (`hash(key) % partitions`): all events for a customer go to the same partition, so they stay in order.
- **Batching and compression** give high throughput; `linger.ms` waits briefly to fill batches.
- **acks**: `0` (fire and forget), `1` (leader wrote it), `all` (all in-sync replicas wrote it). With `min.insync.replicas=2` and replication factor 3, `acks=all` writes survive any single broker failure.
- **Idempotent producer** — sequence numbers per partition let brokers drop duplicate retries.

## Brokers and replication

Followers continuously fetch from the leader. Replicas that are caught up form the **ISR** (in-sync replica set). A message is **committed** (below the *high watermark*) once all ISR members have it; only committed messages are visible to consumers.

If a leader fails, the **controller** elects a new leader from the ISR. Modern Kafka uses **KRaft** — a Raft-based controller quorum inside Kafka — replacing ZooKeeper. `unclean.leader.election.enable=false` prevents electing an out-of-date replica (which would lose data).

Kafka is fast because it uses **sequential disk I/O**, the OS **page cache**, batching, and **zero-copy** (`sendfile`) to send data from disk to network.

## Consumers and consumer groups

- Consumers **poll** batches of messages and track their position by **offset**.
- A **consumer group** shares the work: each partition is assigned to exactly one consumer in the group. Parallelism is capped by the partition count.
- Different groups (billing, analytics, search) read the same topic independently.
- Offsets are committed to the internal `__consumer_offsets` topic.
- When consumers join or leave, a **rebalance** reassigns partitions. Cooperative (incremental) rebalancing avoids stopping everyone.

> [!WARN] Slow processing that exceeds `max.poll.interval.ms` makes the broker think the consumer died, triggering a rebalance — and the messages get processed again by someone else. Keep per-poll work bounded.

## Delivery guarantees

- **At-most-once:** commit offsets before processing. Crashes lose messages.
- **At-least-once (most common):** process, then commit. Crashes cause duplicates → make consumers **idempotent**.
- **Exactly-once (within Kafka):** idempotent producers + **transactions** that atomically write output messages and commit input offsets; downstream consumers use `isolation.level=read_committed`. Kafka Streams enables this with one setting. Side effects outside Kafka (emails, payments) still need idempotency keys.

## Retention and compaction

- **Delete policy:** remove segments older than the retention time or beyond the size limit.
- **Compaction:** keep at least the **latest value per key** — the topic becomes a changelog/table (e.g. latest customer profile). A message with a null value (tombstone) deletes the key.
- **Tiered storage** moves old segments to object storage for long, cheap retention.

## Choosing partitions

- More partitions → more consumer parallelism and throughput, but more files, longer failovers and more memory.
- Start from target throughput ÷ per-partition throughput (often tens of MB/s), and the number of consumers you need.
- You can add partitions later, but that **changes the key → partition mapping**, breaking per-key ordering for existing keys. Plan ahead.
- Watch for **hot partitions** caused by skewed keys (one huge customer).

## The ecosystem

- **Kafka Connect** — ready-made connectors to databases (CDC with Debezium), object storage, search engines.
- **Kafka Streams / ksqlDB / Flink** — stream processing with state, joins and windows.
- **Schema Registry** — Avro/Protobuf/JSON schemas with compatibility rules so producers can't break consumers.

## Operating Kafka

Key metrics: **consumer lag** (how far behind each group is), under-replicated partitions, ISR shrinks, request latency, disk usage, and controller health. Spread replicas across racks/availability zones (`broker.rack`), secure with TLS + SASL + ACLs, and set quotas so one client can't starve others. Managed services (Confluent Cloud, Amazon MSK) remove much of this work.

> [!RECAP]
> - Topics → **partitions** = ordered append-only logs; offsets; retention independent of consumption.
> - Keys choose partitions and give **per-key ordering**.
> - Replication with leader + followers; **ISR**, `acks=all`, `min.insync.replicas`; KRaft controllers elect leaders.
> - **Consumer groups**: one consumer per partition; commit offsets; rebalances on change.
> - At-least-once + idempotent consumers is standard; exactly-once via idempotent producers + transactions.
> - Compaction keeps the latest value per key; choose partition counts deliberately; monitor **consumer lag**.

> [!INTERVIEW] "How does Kafka guarantee ordering?", "What happens when a broker fails?", "acks=1 vs acks=all?", "How do consumer groups scale?", "How do you get exactly-once?", "Kafka vs RabbitMQ/SQS?", "How do you pick the number of partitions?"

::quiz {"q": "How does Kafka keep all events for one customer in order?", "options": ["It sorts messages globally", "Producers use the customer ID as the key so all its events go to one partition", "Consumers sort them", "Brokers lock the topic"], "answer": 1, "explain": "Ordering holds within a partition."}

::quiz {"q": "A topic has 6 partitions. How many consumers in ONE group can actively consume?", "options": ["Unlimited", "At most 6", "Exactly 1", "12"], "answer": 1, "explain": "Each partition goes to one consumer per group; extras sit idle."}

::quiz {"q": "Which settings protect writes from a single broker failure?", "options": ["acks=0", "acks=all with replication factor 3 and min.insync.replicas=2", "linger.ms=0", "More partitions"], "answer": 1, "explain": "The write is on at least two replicas before success."}
