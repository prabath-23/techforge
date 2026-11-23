---
title: NoSQL Data Modeling — Designing for Your Queries
summary: When a key-value, document, wide-column or graph database fits better than a relational one, and how modeling flips around — start from the access patterns, embed or reference, design partition keys that spread load, single-table design in DynamoDB, and the consistency trade-offs you accept.
---

## Same data, opposite approach

> [!STORY] A chat app stores messages in PostgreSQL. At 50 million messages a day, one database server can't keep up, and every "load this conversation" query joins three tables. The team moves messages to Cassandra and designs **one table for one question**: "give me the latest 50 messages in conversation X". Each conversation's messages are stored together, already sorted by time, on a few servers. Loading a chat becomes one fast read, and the cluster grows by adding machines. But they gave something up: they can no longer ask arbitrary new questions — like "all messages containing a word" — without building another table.

That's the essence of NoSQL modeling: **relational design starts from the data; NoSQL design starts from the queries.**

## The families

| Type | Model | Examples | Great for |
|---|---|---|---|
| **Key-value** | A giant dictionary: key → value | Redis, DynamoDB, Memcached | Sessions, caches, carts, counters, feature flags |
| **Document** | JSON-like documents, queried by fields | MongoDB, Firestore, Couchbase | Data that's naturally a nested object: a product with variants, a user profile |
| **Wide-column** | Rows grouped by partition key, sorted within it | Cassandra, ScyllaDB, Bigtable, HBase | Huge write volumes: messages, events, time series, IoT |
| **Graph** | Nodes and relationships | Neo4j, Neptune | Many-hop relationships: social graphs, fraud rings, recommendations |
| **Search** | Inverted indexes | Elasticsearch, OpenSearch | Full-text search, log analytics |
| **Time series** | Timestamped measurements | InfluxDB, TimescaleDB, Prometheus | Metrics, sensors |

> [!NOTE] "NoSQL" isn't one thing, and it isn't "better at scale" by default. PostgreSQL with good indexes handles enormous workloads. Choose NoSQL for a specific reason: a data shape that fits, a write volume beyond one machine, flexible schemas, or predictable single-digit-millisecond access at any size.

## Step 1: list your access patterns first

Before designing anything, write down every question the app will ask, with how often:

1. Get a user's profile by user ID — very frequent.
2. Get a conversation's latest 50 messages — very frequent.
3. List a user's conversations, most recent first — frequent.
4. Get unread count per conversation — frequent.

Each pattern should be answered by **one lookup or one range read** on a key you design. There are no joins; if you need data together, you store it together.

## Step 2: embed or reference?

In a document database, related data can be **embedded** inside a document or **referenced** by ID.

> [!ANALOGY] A recipe card. The ingredients are written **on** the card (embedded) — you always need them together, and they belong to this recipe only. But "see the basic pastry recipe on card 12" is a **reference**, because many recipes share it and it changes on its own.

- **Embed** when data is read together, belongs to one parent, and is bounded in size: an order's line items, a user's addresses.
- **Reference** when it's shared, updated independently, or can grow without limit: a product referenced by many orders; a post's comments (a viral post could have millions).

> [!WARN] Documents have size limits (16 MB in MongoDB, 400 KB per item in DynamoDB), and rewriting an ever-growing embedded array gets slower and slower. "Unbounded arrays" are the most common document-modeling mistake.

## Step 3: design partition keys that spread the load

Distributed NoSQL databases split data across servers by a **partition key** (System Design track, partitioning chapter). Everything with the same partition key lives together; the **sort key** orders items within it.

For chat messages in Cassandra:

```sql
CREATE TABLE messages_by_conversation (
  conversation_id UUID,
  bucket          TEXT,        -- e.g. '2026-11' — keeps any one partition from growing forever
  sent_at         TIMEUUID,
  sender_id       UUID,
  body            TEXT,
  PRIMARY KEY ((conversation_id, bucket), sent_at)
) WITH CLUSTERING ORDER BY (sent_at DESC);
```

"Latest 50 messages in a conversation" reads one partition, already sorted. Good partition keys have **many distinct values** and **evenly spread traffic**.

> [!EXAMPLE] **The hot partition.** A ticketing site partitions orders by `event_id`. When a superstar's concert goes on sale, millions of writes hit one partition — one server — while the rest of the cluster sits idle. Fixes: add a random suffix to spread writes (`event_id#0` … `event_id#9`) and combine the shards when reading, or queue the requests.

## Single-table design in DynamoDB

DynamoDB experts often put **many entity types in one table**, using generic key names and prefixes so that related items share a partition:

| PK | SK | Data |
|---|---|---|
| `USER#42` | `PROFILE` | name, email |
| `USER#42` | `CONVO#2026-11-23T09:14#c7` | conversation c7, last message preview |
| `CONVO#c7` | `MSG#2026-11-23T09:14:02#m91` | sender 42, "See you at 6" |

- "User 42's profile and their conversations, newest first" = one query on `PK = USER#42`.
- "Messages in c7" = one query on `PK = CONVO#c7`.
- **Global secondary indexes** add alternative keys for other access patterns (e.g. look up a user by email).

The price: the table is hard to read for humans, and **new access patterns may need new indexes or a data migration**.

## The trade-offs you accept

- **Consistency:** many NoSQL systems default to **eventual consistency** for replicas; you may read slightly stale data unless you request strongly consistent reads (DynamoDB) or use quorum reads (Cassandra's `QUORUM`) (System Design track, consistency).
- **Transactions:** often limited to one item or one partition; multi-item transactions exist (DynamoDB, MongoDB) but cost more.
- **Duplication:** you deliberately store the same data in several shapes for several queries, and must keep the copies in sync — usually with streams or change events.
- **Ad-hoc queries:** analytics usually happens by exporting to a warehouse, not in the operational NoSQL store.

> [!RECAP]
> - NoSQL families: **key-value, document, wide-column, graph, search, time series** — choose for a specific reason.
> - Model **from access patterns**: each frequent query should be one lookup or range read.
> - **Embed** what's read together and bounded; **reference** what's shared or unbounded.
> - Pick **partition keys** with many values and even traffic; avoid **hot partitions**; use sort keys for ordering.
> - **Single-table design** co-locates related entities; you trade flexibility, strong consistency and ad-hoc queries for scale and speed.

> [!INTERVIEW] In design interviews, justify the database choice from access patterns and scale, show the partition and sort keys, and discuss hot partitions, consistency level and how you'd handle a query the model doesn't support.

::quiz {"q":"What's the first step in designing a NoSQL data model?","options":["Normalize to 3NF","List the access patterns the application needs","Choose the largest instance","Create a table per entity"],"answer":1,"explain":"Keys are designed so each frequent query is one lookup or range read."}

::quiz {"q":"A blog post document embeds all comments in an array. What's the risk?","options":["Comments can't be sorted","The array is unbounded — a popular post can exceed size limits and become slow to update","Embedding is not allowed","Comments become read-only"],"answer":1,"explain":"Reference unbounded collections instead."}

::quiz {"q":"Writes for one hugely popular event all land on one server. What's this called?","options":["A phantom read","A hot partition","A write skew","A cache stampede"],"answer":1,"explain":"Spread writes with key suffixes, or queue them."}
