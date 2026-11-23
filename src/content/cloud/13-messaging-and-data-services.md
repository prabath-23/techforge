---
title: Messaging and Data Services in the Cloud
summary: Choosing and using the managed building blocks that hold and move data, queues (SQS, Pub/Sub) vs logs (Kafka, Kinesis), delivery guarantees and ordering, dead-letter queues, managed caches, picking the right managed database (relational, key-value, document, wide-column, time series, search, vector), object storage patterns, and how they combine in real architectures.
---

::widget Scene {"title": "Queue or log? Choosing the right messaging service", "sub": "the same \"OrderPlaced\" event through SQS-style queues and a Kafka-style log", "nodes": [{"id": "p", "kind": "server", "label": "Order service", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "q", "kind": "queue", "label": "Queue", "x": 4.5, "y": -4.5, "color": "pink"}, {"id": "w", "kind": "cpu", "label": "Workers (compete)", "x": 9.0, "y": -9.0, "color": "teal", "count": 3}, {"id": "log", "kind": "queue", "label": "Log (partitioned, retained)", "x": 11.94, "y": 2.94, "color": "purple"}, {"id": "g1", "kind": "cpu", "label": "Email group", "x": 14.58, "y": -3.42, "color": "green"}, {"id": "g2", "kind": "cpu", "label": "Analytics group", "x": 18.92, "y": 0.92, "color": "orange"}], "links": [["p", "q"], ["q", "w"], ["p", "log"], ["log", "g1"], ["log", "g2"]], "metrics": [["model", "Model"], ["after", "After reading"], ["fit", "Good for"]], "steps": [{"short": "Queue", "tag": "Queue", "title": "Queue: each message goes to ONE of the workers", "body": "<p>Workers compete; add workers to go faster.</p>", "show": ["p", "q", "w"], "flow": [[["p", "q", "w"], "#ec4899", "OrderPlaced #81"]], "metrics": {"model": ["work queue"], "after": ["-"], "fit": ["-"]}}, {"short": "Delete", "tag": "Queue", "title": "Once processed and acknowledged, the message is deleted", "body": "<p>Nobody else can read it later.</p>", "set": {"q": {"badge": "#81 deleted"}}, "metrics": {"after": ["deleted"], "fit": ["background jobs, task distribution"]}}, {"short": "Log", "tag": "Log", "title": "Log: messages are appended and kept (e.g. 7 days)", "body": "<p>Each partition is an ordered, numbered sequence.</p>", "show": ["p", "q", "w", "log"], "flow": [["p", "log", "#a855f7", "append @ offset 5012"]], "set": {"q": {"badge": null}}, "metrics": {"model": ["event log"]}}, {"short": "Groups", "tag": "Log", "title": "Every consumer group reads everything, at its own pace", "body": "<p>Email and analytics each get #81 and track their own offset.</p>", "show": ["p", "q", "w", "log", "g1", "g2"], "flow": [["log", "g1", "#22c55e", "#81"], ["log", "g2", "#f59e0b", "#81"]], "set": {"g1": {"badge": "offset 5012"}, "g2": {"badge": "offset 4800"}}, "metrics": {"after": ["kept; offsets advance"]}}, {"short": "Replay", "tag": "Log", "title": "Analytics had a bug: rewind its offset and reprocess", "body": "<p>Impossible with a queue, those messages are gone.</p>", "set": {"g2": {"badge": "rewind → 3000"}}, "metrics": {"fit": ["event streams, replay, many readers"]}}, {"short": "Order", "tag": "Ordering", "title": "Order is guaranteed only within a partition", "body": "<p>Key by order ID so all events for one order stay in order. Partitions set the maximum parallelism of a group.</p>"}, {"short": "PubSub", "tag": "Fan-out", "title": "Need fan-out with queues? Topic → one queue per subscriber", "body": "<p>SNS → SQS is the classic pattern.</p>"}, {"short": "Choose", "tag": "Choose", "title": "Rule of thumb", "body": "<p>Tasks to be done once → queue. Facts other teams will consume, replay or join → log. Managed options save a lot of operations work.</p>", "note": {"kind": "key", "text": "Queue = competing consumers, delete on ack. Log = retained, ordered per partition, independent consumer groups with replay."}}]}


## Twenty boxes on a diagram

> [!STORY] A team designing a new food-delivery backend opens their cloud console and finds over two hundred services. Should orders go into SQS or Kafka? Is DynamoDB or Aurora right for the order history? Does the menu belong in Redis, Elasticsearch, or both? Each choice looks reasonable in isolation, and each has consequences for cost, consistency and operations that only show up months later. This chapter is a field guide: what each family of managed data service is **for** the trade-offs that matter, and how they fit together.

## Queues vs logs

Both move messages from producers to consumers asynchronously, decoupling services (System Design track, messaging). They behave very differently.

::widget Stepper {"type":"flow","cols":2,"title":"A queue versus a log","what":"Two models for moving messages. In a queue, messages are work items that disappear once handled. In a log, messages are a durable, ordered history that many readers can replay.","steps":["Press Play and compare the two columns.","For each, ask: what happens to a message after it's processed?","Decide which you'd use for 'resize this image' and which for 'every order event, for five different consumers'."],"nodes":[["Queue (SQS, Cloud Tasks, RabbitMQ)","Producers add work items; a pool of workers takes them. Each message is processed by ONE consumer and deleted after acknowledgement."],["Log (Kafka, Kinesis, Pub/Sub Lite, Event Hubs)","Producers append events to an ordered, durable log split into partitions. Messages stay for a retention period (days, or forever)."],["Scaling","Add workers; the queue spreads messages among them. No ordering by default (FIFO queues exist, with limits)."],["Scaling","Parallelism = number of partitions; within a partition, order is preserved. Events with the same key (e.g. order ID) go to the same partition."],["Best for","Task distribution: send emails, resize images, process payments' follow-up jobs. Simple, cheap, scales automatically."],["Best for","Event streams with many independent consumers (billing, analytics, search indexing all read the same order events), replaying history, stream processing, change data capture."]]}

> [!ANALOGY] A queue is a restaurant kitchen's ticket rail: each ticket is taken by one cook and thrown away when the dish is done. A log is the restaurant's sales ledger: every sale is written down in order and kept; the accountant, the stock manager and the marketing team each read it at their own pace, and can go back and re-read last month.

**Google Pub/Sub** sits in between: a fully managed topic/subscription system where each subscription gets every message (fan-out), with optional ordering keys and replay by seeking to a time.

### Delivery guarantees

- **At most once:** may lose messages, never duplicates. Rarely what you want.
- **At least once:** never loses, may deliver duplicates, the default almost everywhere. **Consumers must be idempotent** (dedupe by message ID, or make operations naturally idempotent).
- **Exactly once:** possible within a system (Kafka transactions for read-process-write within Kafka), but end to end with external side effects it's achieved by **at-least-once + idempotency**.

### Visibility, retries and dead letters

With SQS, a consumer **receives** a message, which becomes invisible for a **visibility timeout**; if the consumer doesn't **delete** it in time (it crashed, or is slow), the message reappears for another consumer. After N failed attempts, it moves to a **dead-letter queue** for inspection, so one bad "poison" message doesn't block everything or retry forever.

> [!WARN] Set the visibility timeout longer than your processing time, or slow jobs will be processed twice in parallel. And monitor dead-letter queues, messages sitting there are customer-impacting failures nobody is looking at.

### Ordering

Global ordering doesn't scale. Order **per key** instead: all events for order #9182 go to one partition (Kafka) or one message group (SQS FIFO), so they're processed in sequence, while different orders proceed in parallel.

## Managed caches

**ElastiCache / Memorystore (Redis or Valkey, Memcached)** keep hot data in memory: sessions, rate-limit counters, leaderboards (sorted sets), computed pages, feature flags (System Design track, caching). Choose:

- **Redis/Valkey** for rich data structures, persistence options, replication and pub/sub.
- **Memcached** for a simple, multithreaded key-value cache.

Always plan for cache misses and failures: the database must survive the cache being empty (warm-up, stampede protection).

## Choosing a managed database

| Need | Family | Managed examples |
|---|---|---|
| Transactions, joins, flexible queries, strong consistency | **Relational** | RDS/Aurora (PostgreSQL, MySQL), Cloud SQL, AlloyDB, Azure SQL |
| Relational at global scale with strong consistency | **Distributed SQL** | Spanner, Aurora DSQL, CockroachDB, YugabyteDB |
| Huge scale with predictable key-based access, single-digit ms | **Key-value / wide-column** | DynamoDB, Bigtable, Cassandra (Keyspaces), Cosmos DB |
| Flexible JSON documents, mobile/web sync | **Document** | MongoDB Atlas, Firestore, DocumentDB |
| Full-text search, log analytics | **Search** | OpenSearch, Elastic Cloud |
| Metrics and sensor data over time | **Time series** | Timestream, InfluxDB, TimescaleDB |
| Relationships many hops deep | **Graph** | Neptune, Neo4j Aura |
| Embeddings and similarity search | **Vector** | pgvector on managed Postgres, OpenSearch, Pinecone, Vertex AI Vector Search |
| Analytics over huge datasets | **Warehouse / lakehouse** | BigQuery, Redshift, Snowflake, Databricks (System Design track, chapter 13) |

Rules of thumb:

- **Start with managed PostgreSQL** unless you have a clear reason not to: it handles relational data, JSON, full-text search basics, geospatial (PostGIS) and vectors (pgvector), and scales further than most products ever need.
- Pick **DynamoDB/Bigtable-style stores** when access patterns are known and scale or latency needs are extreme (Databases track, chapter 8), and design keys around those patterns.
- **Add specialized stores** (search, cache, warehouse) as **derived copies** fed by events or CDC, with one system as the source of truth.

> [!EXAMPLE] **Polyglot persistence in a food-delivery app.** Orders and payments live in Aurora PostgreSQL (transactions, the source of truth). Live courier locations live in Redis with geo commands. The restaurant/menu search uses OpenSearch, updated from a CDC stream. Order events flow through Kafka (MSK) to billing, notifications and the analytics lakehouse. Each store does what it's best at, and every derived copy can be rebuilt from the source.

## Object storage patterns

Object storage (S3, GCS, Azure Blob) is the cheapest, most durable store and the backbone of data platforms (chapter 5):

- **Direct uploads/downloads** with pre-signed URLs; serve through a CDN.
- **Event notifications** on new objects trigger processing (serverless, chapter 9).
- **Lifecycle rules** to tier and expire data (chapter 12).
- **Versioning and object lock** for protection against deletion and ransomware.
- **Data lake** storage for Parquet/Iceberg tables.
- Design object **keys** thoughtfully (e.g. `tenant/2026/11/23/…`) for listing, partitioning and lifecycle rules.

## Operating managed data services

Managed doesn't mean maintenance-free:

- **Capacity:** choose provisioned vs on-demand modes (DynamoDB, Kinesis); watch throttling metrics; plan partition counts (Kafka partitions are hard to reduce later).
- **High availability:** multi-AZ deployments; understand failover behaviour and how long it takes; test it.
- **Backups and point-in-time recovery** enabled and **restore-tested** (chapter 8).
- **Connection management:** poolers for databases (especially with serverless clients).
- **Security:** private networking only, IAM authentication where possible, encryption with your KMS keys, least-privilege access per service.
- **Cost:** idle provisioned capacity, cross-AZ replication traffic, retention periods on logs and streams.

> [!RECAP]
> - **Queues** distribute work items to one consumer each; **logs** keep ordered, replayable event streams for many consumers. Pub/Sub sits between.
> - Delivery is usually **at least once** → idempotent consumers; use **visibility timeouts** and **dead-letter queues**; order **per key**.
> - **Managed caches** (Redis/Valkey) for hot data, with the database able to survive misses.
> - Default to **managed PostgreSQL**; use key-value/wide-column for extreme known-pattern scale; add search, cache, warehouse and vector stores as **derived copies** of a single source of truth.
> - Object storage: pre-signed transfers, events, lifecycle, versioning, lakehouse tables.
> - Operate deliberately: capacity, multi-AZ failover, tested restores, connection pooling, security and cost.

> [!INTERVIEW] Design interviews constantly ask "which database and why?" and "queue or Kafka?". Justify choices from access patterns, consistency needs, scale and team operations, and explain idempotent consumers, dead-letter queues and per-key ordering.

::quiz {"q":"Five independent services need to process every order event, and you want to replay last week's events. Which fits?","options":["A simple work queue","A log like Kafka or Kinesis (or Pub/Sub with multiple subscriptions)","A cache","A relational table polled every second"],"answer":1,"explain":"Logs keep ordered history that many consumers read independently."}

::quiz {"q":"An SQS consumer takes 2 minutes per message but the visibility timeout is 30 seconds. What happens?","options":["Nothing","The message becomes visible again and another worker processes it too, duplicates","Messages are lost","SQS rejects the consumer"],"answer":1,"explain":"Set the timeout above the processing time and keep consumers idempotent."}

::quiz {"q":"How do you keep events for the same order in sequence while processing many orders in parallel?","options":["Use one global queue with one consumer","Partition or group messages by order ID","Sort messages by time later","Use a cache"],"answer":1,"explain":"Order is preserved per key, parallelism across keys."}
