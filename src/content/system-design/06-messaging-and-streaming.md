---
title: Queues and Event Streams — Letting Services Work at Their Own Pace
summary: Why big systems pass messages instead of calling each other directly, the difference between a task queue (RabbitMQ, SQS) and an event log (Kafka), how Kafka works inside, why messages get delivered twice and how to make that harmless, keeping events in order, handling failures, and processing endless streams of events in real time.
---

::widget Scene {"title": "Decoupling with a message queue", "sub": "one order, three downstream jobs, and every failure along the way", "nodes": [{"id": "u", "kind": "phone", "label": "Customer", "x": 3.72, "y": 3.72}, {"id": "os", "kind": "server", "label": "Order service", "x": 7.52, "y": -0.08, "color": "blue"}, {"id": "q", "kind": "queue", "label": "Queue", "x": 11.32, "y": -3.88, "color": "pink"}, {"id": "em", "kind": "cpu", "label": "Email worker", "x": 11.4, "y": -11.4, "color": "teal"}, {"id": "inv", "kind": "cpu", "label": "Invoice worker", "x": 15.12, "y": -7.68, "color": "teal"}, {"id": "an", "kind": "cpu", "label": "Analytics worker", "x": 18.84, "y": -3.96, "color": "teal"}, {"id": "dlq", "kind": "queue", "label": "Dead-letter queue", "x": 16.59, "y": 1.39, "color": "red"}], "links": [["u", "os"], ["os", "q"], ["q", "em"], ["q", "inv"], ["q", "an"], ["q", "dlq", {"dashed": true}]], "metrics": [["resp", "Checkout response"], ["depth", "Queue depth"], ["state", "Note"]], "steps": [{"short": "Sync", "tag": "Before", "title": "Checkout calls email, invoice and analytics directly", "body": "<p>Each call adds latency, and if any one is down, checkout fails — even though the order itself was fine.</p>", "show": ["u", "os", "em", "inv", "an"], "flow": [[["u", "os", "em"], "#3b82f6", ""], [["os", "inv"], "#3b82f6", ""], [["os", "an"], "#3b82f6", ""]], "metrics": {"resp": ["1.4 s", "bad"], "depth": ["—"], "state": ["tight coupling"]}}, {"short": "Down", "tag": "Failure", "title": "The email provider is slow: checkout times out", "body": "<p>Customers can't buy because a welcome email is slow. That is backwards.</p>", "set": {"em": {"badge": "timeout", "dim": true}}, "flow": [["os", "em", "#ef4444", "…"]], "metrics": {"state": ["one slow dep breaks all", "bad"]}}, {"short": "Queue", "tag": "Fix", "title": "Put a queue in between", "body": "<p>The order service saves the order and publishes \"OrderPlaced\". That is all it does before responding.</p>", "show": ["u", "os", "q", "em", "inv", "an"], "set": {"em": {"badge": null, "dim": false}}, "flow": [[["u", "os", "q"], "#ec4899", "OrderPlaced #81"]], "metrics": {"resp": ["90 ms", "good"], "depth": ["1"]}}, {"short": "Consume", "tag": "Consume", "title": "Workers pull messages at their own pace", "body": "<p>Each worker handles its job independently. The queue holds messages until a worker is ready.</p>", "flow": [["q", "inv", "#14b8a6", "#81"], ["q", "an", "#14b8a6", "#81"]], "metrics": {"depth": ["0"]}}, {"short": "Buffer", "tag": "Absorb", "title": "Email worker is down for 10 minutes", "body": "<p>Messages for it wait safely in the queue. Checkout is unaffected. When the worker returns it catches up.</p>", "set": {"em": {"dim": true, "badge": "down"}, "q": {"badge": "2,400 waiting"}}, "metrics": {"depth": ["2,400"], "state": ["failure isolated", "good"]}}, {"short": "Ack", "tag": "Delivery", "title": "A message is deleted only after the worker acknowledges it", "body": "<p>The worker sends the email, then acks. Until then the message is invisible to others but not gone.</p>", "set": {"em": {"dim": false, "badge": null}, "q": {"badge": null}}, "flow": [["q", "em", "#14b8a6", "#81"], ["em", "q", "#22c55e", "ack"]]}, {"short": "Crash", "tag": "At-least-once", "title": "Worker sends the email, then crashes before acking", "body": "<p>The visibility timeout expires and the message is redelivered. The customer could get two emails.</p>", "flow": [["q", "em", "#f59e0b", "#81 again"]], "set": {"em": {"badge": "crashed before ack"}}, "metrics": {"state": ["duplicate delivery", "bad"]}}, {"short": "Idempotent", "tag": "Fix", "title": "Make consumers idempotent", "body": "<p>Record \"email sent for order 81\" and skip if it's already there. Processing a message twice now has the same effect as once.</p>", "set": {"em": {"badge": "seen #81 → skip"}}, "metrics": {"state": ["safe to retry", "good"]}, "note": {"kind": "notice", "text": "Most queues guarantee at-least-once delivery. Exactly-once is achieved by at-least-once + idempotent processing."}}, {"short": "Poison", "tag": "Failure", "title": "One malformed message fails every time", "body": "<p>Retrying forever blocks the queue and burns CPU.</p>", "show": ["u", "os", "q", "em", "inv", "an", "dlq"], "flow": [["q", "inv", "#ef4444", "#99 fails ×5"]], "set": {"em": {"badge": null}}}, {"short": "DLQ", "tag": "Fix", "title": "After N attempts, move it to a dead-letter queue", "body": "<p>Processing continues; an alert fires; an engineer inspects and replays it after the fix.</p>", "flow": [["q", "dlq", "#ef4444", "#99"]], "set": {"dlq": {"badge": "1 message"}}, "metrics": {"state": ["isolated + alerted", "good"]}}, {"short": "Scale", "tag": "Scale", "title": "Sale day: queue depth grows", "body": "<p>Autoscale workers on queue depth. Producers never slow down; consumers scale out.</p>", "set": {"inv": {"count": 3, "badge": "×3 workers"}, "q": {"badge": "depth falling"}}, "metrics": {"depth": ["18k → 200"]}}, {"short": "Order", "tag": "Ordering", "title": "Need order per customer? Partition by customer ID", "body": "<p>Messages with the same key go to the same partition, processed in order by one consumer (Kafka, SQS FIFO groups).</p>", "note": {"kind": "key", "text": "Queues buy decoupling, buffering and independent scaling. Pay for it with at-least-once delivery (idempotency), DLQs and monitoring queue depth."}}]}


::widget Scene {"title": "Pub/sub and event logs: one event, many listeners", "sub": "Kafka topic with three consumer groups", "nodes": [{"id": "p", "kind": "server", "label": "Orders service", "x": 3.1, "y": 3.1, "color": "blue"}, {"id": "k", "kind": "queue", "label": "Topic: order-events", "x": 7.6, "y": -1.4, "count": 6, "color": "orange"}, {"id": "c1", "kind": "server", "label": "Billing", "x": 8.07, "y": -9.93, "color": "green"}, {"id": "c2", "kind": "server", "label": "Search index", "x": 12.72, "y": -5.28, "color": "purple"}, {"id": "c3", "kind": "server", "label": "Analytics", "x": 17.37, "y": -0.63, "color": "teal"}], "links": [["p", "k"], ["k", "c1"], ["k", "c2"], ["k", "c3"]], "metrics": [["off", "Consumer offsets"]], "steps": [{"short": "Publish", "tag": "Append", "title": "Events are appended to a durable log", "body": "<p>Unlike a queue, the log keeps events for days. Each consumer group tracks its own position (offset).</p>", "flow": [["p", "k", "#f59e0b", "OrderPlaced"]], "metrics": {"off": ["billing 41, search 41, analytics 39"]}}, {"short": "Fan out", "tag": "Read", "title": "Every group reads every event, independently", "body": "<p>Billing, search and analytics each get their own copy without the producer knowing they exist.</p>", "flow": [["k", "c1", "#22c55e", ""], ["k", "c2", "#a855f7", ""], ["k", "c3", "#14b8a6", ""]]}, {"short": "Replay", "tag": "Replay", "title": "A new consumer can replay history", "body": "<p>Build a new recommendation service? Start it at offset 0 and it processes last week's events. Order is guaranteed within a partition (key events by order ID).</p>", "note": {"kind": "key", "text": "Queues distribute work items; logs (Kafka, Kinesis) broadcast facts that many services and future services can read."}}]}

## The problem with calling everything directly



You place an order on a shopping site. Behind the scenes, many things must happen: save the order, charge the card, reserve the stock, email a receipt, notify the warehouse, update the recommendations, record analytics, check for fraud…

If the order service **called** each of those directly and waited for each answer:

- Your "Place order" button would take as long as **all** of them combined.
- If the email service is down, your order fails — even though email has nothing to do with whether your order is valid.
- On a sale day with 50× normal traffic, every downstream service gets hit with 50× traffic at the same instant.

The fix is to put a **message broker** in between. The order service saves the order, drops a message — "order 98123 was placed" — into the broker, and immediately tells you "Order confirmed". Every other service picks up the message and does its part **at its own pace**.

> [!ANALOGY] A restaurant's order rail. The waiter doesn't walk into the kitchen and wait while the cook makes the dish; they clip the ticket to the rail and go back to their customers. Cooks take tickets in turn. If the dinner rush brings 30 orders at once, the tickets wait on the rail instead of everyone shouting at the cooks. If one cook steps out, the tickets wait until someone picks them up.

What you gain:

- **Speed for users:** only the essential work happens while they wait.
- **Independence:** if the email service is down, emails simply wait in the queue and go out later.
- **Absorbing spikes:** a burst of 50,000 orders a minute queues up and is processed as fast as workers can manage (**load leveling**).
- **Fan-out:** one event, many interested services — and new ones can be added later without changing the sender.

What it costs: the system becomes **eventually consistent** (the email arrives a few seconds later), debugging is harder (the work happens elsewhere, later), and you must deal with duplicates, ordering and messages that keep failing.

## Two kinds of brokers

### Task queues: "someone please do this job"

**RabbitMQ, Amazon SQS, Google Cloud Tasks.** A message is delivered to **one** worker; when the worker confirms it's done, the message is **deleted**. Many workers can share one queue to spread the load. Ideal for **jobs**: send this email, resize this image, generate this PDF.

### Event logs: "here's what happened — anyone can read it"

**Apache Kafka, Amazon Kinesis, Redpanda, Pulsar.** Messages are appended to an ordered, durable **log** and **kept** (for days, weeks or forever), regardless of who has read them. Each reader keeps track of its own position (its **offset**). That means:

- many different services can read the same events independently;
- a new service can start by reading **history** from the beginning;
- if a bug corrupted some processing, you can fix the bug and **replay** the events.

> [!ANALOGY] A task queue is a to-do board where each sticky note is taken by one person and thrown away when done. An event log is a newspaper archive: anyone can read any issue, as many times as they like, starting from any date — and reading it doesn't remove it.

## How Kafka works

Kafka, created at LinkedIn in 2011, is the backbone of event-driven systems at companies like Netflix, Uber, LinkedIn and thousands more, moving trillions of messages a day.

::widget Stepper {"type":"flow","cols":3,"title":"The parts of Kafka","what":"How a message travels through Kafka, from the service that produces it to the services that consume it.","steps":["Press Play and read each part's job.","Find where order is guaranteed (only within a partition).","Find what limits how many consumers can work in parallel (the number of partitions)."],"nodes":[["Producer","A service sends a message with a key (for example the order ID) and a value. The key decides which partition it goes to, so every message about the same order lands in the same partition, in order."],["Topic and partitions","A topic (say 'orders') is split into partitions: separate, ordered, append-only logs. Order is guaranteed within a partition, not across partitions. Partitions are how Kafka spreads work across machines."],["Brokers and replicas","Each partition is stored on several servers (typically 3). One is the leader; the others copy it. If the leader's machine dies, a copy takes over without losing confirmed messages."],["Consumer groups","Services read in groups. Within a group, each partition is read by exactly one member, so the group shares the work. Two different groups (say 'email' and 'analytics') each get every message."],["Offsets","Each group remembers how far it has read in every partition. Restart a consumer and it continues where it left off; reset the offset and it replays history."],["Retention","Messages are kept for a configured time, or 'compacted' to keep only the latest message per key — handy for rebuilding a current state."]]}

Why is Kafka so fast? It only **appends** to files and reads them **in order** (which disks and SSDs love), batches and compresses messages, relies on the operating system's page cache (OS track), and uses `sendfile` to send data from disk to network without copying it through the application (OS track, chapter 10). A small cluster can handle millions of messages per second.

## Delivered twice? Making it harmless

When a consumer processes a message and then confirms it, there's always a window where it could crash after processing but **before** confirming. On restart, the message is delivered **again**. So brokers offer three guarantees:

- **At most once:** confirm first, then process. A crash loses the message. Acceptable for, say, sampled analytics.
- **At least once:** process first, then confirm. A crash means a **duplicate**. This is the common default.
- **Exactly once:** possible **within** a system (Kafka supports it between Kafka topics), but not in general once the effects leave the system (sending an email, charging a card).

The practical answer is: **assume duplicates will happen, and make processing them harmless** — make consumers **idempotent**:

- Prefer operations that are naturally safe to repeat: "set status to shipped" rather than "add 1 to count".
- Keep a record of processed message IDs, and skip any you've seen — ideally saved in the same database transaction as the work itself.
- When calling external services, pass an **idempotency key** (Networking track, chapter 8) so a repeated "charge ₹500" is recognized as the same charge.

> [!EXAMPLE] **The double email.** An email service processes "send receipt for order 98123", sends the email, then crashes before confirming. On restart it gets the message again and sends a second email. Customers get two receipts — annoying. Now imagine the same bug in a service that **charges cards**. That's why idempotency is non-negotiable in payment systems.

## Keeping things in order

Kafka only guarantees order **within one partition**. Usually that's exactly what you need: events for **the same order** must be processed in order ("created" before "paid" before "shipped"), but events for different orders don't care. So you use the **order ID as the message key**, and all of an order's events go to the same partition.

Pitfalls:

- Retrying a failed message by putting it at the **back** of the queue breaks its order relative to the next message for the same key.
- Changing the number of partitions changes which partition each key maps to.
- Processing messages from one partition in parallel threads can reorder them.

## When messages keep failing

- **Retry with increasing waits** (exponential backoff with some randomness) — a temporary hiccup often fixes itself.
- After several failures, move the message to a **dead-letter queue**: a holding area for messages that can't be processed (malformed data, a bug). One "poison" message shouldn't block everything behind it. Engineers inspect the dead-letter queue, fix the problem, and replay the messages.
- **Watch the lag.** **Consumer lag** — how far behind the newest message a consumer is — is the key health metric. Growing lag means consumers can't keep up: add consumers (up to the number of partitions), speed them up, or slow the producers. An unbounded queue just turns overload into delay, and eventually into running out of disk.

## Event-driven designs

Once services communicate through events, several useful patterns appear:

- **Publish/subscribe:** services announce what happened ("UserSignedUp") without knowing who listens. Adding a "send welcome gift" feature later doesn't touch the signup service at all.
- **Event sourcing:** store the **sequence of events** ("account opened", "deposited ₹1,000", "withdrew ₹300") as the source of truth, and compute the current state from them. You get a perfect audit trail and the ability to answer "what was the balance on March 3rd?". Banks and accounting systems naturally work this way.
- **CQRS:** use separate models for **writing** and **reading**. Events update several read-optimized views — a search index, a dashboard, a cache — each shaped for its own queries.
- **Change data capture (CDC):** stream every change a database makes (from its write-ahead log — chapter 3) into Kafka using tools like Debezium. Search indexes, caches and data warehouses stay in sync without any change to the application's code.

## Processing streams in real time

Some questions need answers continuously, not in a nightly batch: "fraud score for this card transaction, right now", "trending hashtags in the last 10 minutes", "ad clicks per campaign per minute, for billing".

**Stream processors** — Apache Flink, Kafka Streams, Spark Streaming — read events continuously and compute results over **windows** of time (every minute; the last 10 minutes; each user's browsing session). One subtle problem: events arrive **late and out of order** (a phone was offline in a tunnel, then sent its events). Stream processors handle this with **watermarks** — "we've probably seen everything up to 10:05 now" — balancing waiting for stragglers against reporting quickly.

> [!EXAMPLE] **Uber** processes location updates, trip events and pricing signals as streams; **surge pricing** in an area is computed continuously from recent demand and supply in that area, over short time windows.

> [!RECAP]
> - **Message brokers** decouple services: users wait only for essential work; spikes are absorbed; services fail independently.
> - **Task queues** (RabbitMQ, SQS) hand each job to one worker; **event logs** (Kafka) keep an ordered, replayable history readable by many.
> - Kafka: **topics** split into **partitions** (order within a partition), replicated across brokers, read by **consumer groups** tracking **offsets**.
> - Delivery is usually **at least once**, so consumers must be **idempotent**.
> - Key messages by entity for per-entity ordering; use **retries**, **dead-letter queues**, and watch **consumer lag**.
> - Patterns: pub/sub, event sourcing, CQRS, change data capture, and real-time **stream processing** with windows.

> [!INTERVIEW] Whenever you add a queue, specify: queue or log and why; the message key and ordering needs; the delivery guarantee and how consumers stay idempotent; the retry and dead-letter policy; and how you'd monitor lag and handle backpressure. Classic prompts: notification system, order pipeline, analytics ingestion, job scheduler.

::quiz {"q":"A Kafka topic has 6 partitions. How many consumers in one group can read in parallel?","options":["1","6","12","Unlimited"],"answer":1,"explain":"Each partition is read by one member of a group; extra members sit idle."}

::quiz {"q":"With at-least-once delivery, what must consumers be?","options":["Stateless","Idempotent — processing a message twice has the same effect as once","Single-threaded","Synchronous"],"answer":1,"explain":"Duplicates are inevitable after crashes; make them harmless."}

::quiz {"q":"How do you make sure all events for one order are processed in order in Kafka?","options":["Use one topic per order","Use the order ID as the message key so they all go to the same partition","Turn on compaction","Use more partitions"],"answer":1,"explain":"Ordering is guaranteed within a partition; keying routes an order's events to one partition."}
