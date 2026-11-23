---
title: Databases — Choosing Them, Using Them Well, and How They Work Inside
summary: What a database promises (and what "ACID" really means), the strange bugs that happen when transactions run at the same time, how indexes turn slow queries into instant ones, the two great families of storage engines (B-trees and LSM-trees), the many kinds of "NoSQL", and how to choose.
---

## Where the hard problems live

Stateless app servers are easy to scale: just add more (chapter 2). The difficult part of almost every system is the **state** — the data. Where does it live? What happens if two people change it at the same time? What if the machine dies mid-write? How do you find one record among billions in a millisecond?

That's the job of a **database**. Understanding what databases promise, and what those promises cost, is the foundation for everything else in this track.

## Tables, rows and SQL

The most common kind is the **relational database** (PostgreSQL, MySQL, SQL Server, Oracle, SQLite). Data lives in **tables** — like spreadsheets with strict columns — and tables relate to each other through IDs:

```sql
-- customers(id, name, email)        orders(id, customer_id, total, created_at)
SELECT c.name, SUM(o.total) AS spent
FROM customers c
JOIN orders o ON o.customer_id = c.id          -- connect the two tables
WHERE o.created_at >= '2026-01-01'
GROUP BY c.name
ORDER BY spent DESC
LIMIT 10;                                       -- this year's top 10 customers
```

SQL is **declarative**: you describe *what* you want, and the database's **query planner** figures out *how* to get it efficiently.

## Transactions: all or nothing

You transfer ₹5,000 to a friend. The bank must subtract from your account **and** add to theirs. If the server crashes between the two steps, money must not vanish or appear from nowhere.

A **transaction** groups several changes into one unit with four guarantees, known as **ACID**:

- **Atomicity** — all the changes happen, or none do. A crash halfway means everything is rolled back.
- **Consistency** — the rules you've defined (no negative balances, every order has a real customer) are never violated.
- **Isolation** — transactions running at the same time don't see each other's half-finished work.
- **Durability** — once the database says "committed", the change survives crashes and power loss.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 5000 WHERE id = 'me'  AND balance >= 5000;
UPDATE accounts SET balance = balance + 5000 WHERE id = 'friend';
COMMIT;      -- both happen, or (on any error) neither does
```

> [!ANALOGY] A transaction is like a vending machine purchase: either you get your snack **and** the machine keeps your money, or the purchase fails and your money comes back. You never end up with the money gone and no snack.

## When transactions collide: isolation and its surprises

Full isolation — as if transactions ran strictly one after another — is slow. So databases offer weaker **isolation levels**, which allow certain surprising effects ("anomalies"). These cause real bugs, so it's worth knowing them:

- **Lost update.** Two people both read a stock count of 10, each sells one item and writes back 9. The count should be 8. One update was lost.
- **Dirty read.** You read a change another transaction hasn't committed yet — and then it rolls back. You acted on data that never existed.
- **Non-repeatable read.** You read a row twice within one transaction and get different values, because someone else committed a change in between.
- **Write skew.** The subtle one:

> [!STORY] A hospital rule says at least one doctor must be on call. Alice and Bob are both on call, and both feel unwell. At the same moment, each opens the app; each checks "is another doctor on call?" — yes — and each removes themselves. Both transactions were individually fine. Together, nobody is on call. Neither transaction overwrote the other's data, so simple locking didn't catch it. Only the strictest isolation level (**serializable**) prevents this.

Most databases default to a middle level (PostgreSQL: "read committed"; MySQL: "repeatable read"). Practical ways to prevent lost updates without the slowest level:

```sql
-- 1. Do the arithmetic inside the database, atomically:
UPDATE products SET stock = stock - 1 WHERE id = 42 AND stock > 0;

-- 2. Lock the row while you work with it:
SELECT stock FROM products WHERE id = 42 FOR UPDATE;

-- 3. Optimistic locking with a version number: succeed only if nobody changed it meanwhile
UPDATE products SET stock = 9, version = version + 1 WHERE id = 42 AND version = 7;
-- if 0 rows were updated, someone else won the race: re-read and retry
```

> [!NOTE] Many databases avoid making readers and writers wait for each other using **multi-version concurrency control (MVCC)**: every change creates a new version of the row, and each transaction reads a consistent snapshot as of when it started. Readers never block writers, and writers never block readers.

## Indexes: from minutes to milliseconds

Without help, finding the orders for customer 42 means checking **every row** in the orders table — a **full table scan**. With 500 million orders, that's painfully slow.

An **index** is a separate, sorted structure (almost always a **B+ tree** — DSA track, chapter 4) that maps column values to rows, like the index at the back of a book.

```sql
CREATE INDEX idx_orders_customer_date ON orders (customer_id, created_at);
```

Now "the latest 20 orders for customer 42" walks three or four levels of a tree and reads 20 neighboring entries. You can see the difference with `EXPLAIN`:

```sql
EXPLAIN ANALYZE
SELECT id, total FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;
--  Without the index:  Seq Scan on orders ... (actual time = 9,812 ms)
--  With the index:     Index Scan Backward using idx_orders_customer_date ... (actual time = 0.08 ms)
```

Rules worth knowing:

- **Order matters in multi-column indexes.** An index on `(customer_id, created_at)` helps queries filtering by `customer_id`, or by `customer_id` and `created_at` — but **not** queries filtering only by `created_at`. It's like a phone book sorted by last name then first name: great for finding all the Sharmas, useless for finding everyone named Priya.
- **Indexes cost writes.** Every insert or update must also update every index. Don't index everything — index what your queries actually use.

> [!EXAMPLE] **"Add an index" is the most common fix for slow pages.** A team notices their order history page takes 8 seconds for long-time customers. `EXPLAIN` shows a sequential scan over 300 million rows. One `CREATE INDEX` later, the page loads in 20 ms.

## Inside the database: write-ahead logs and two kinds of engines

How does a database promise durability without writing every change to its final location on disk immediately (which would be slow)? With a **write-ahead log (WAL)**: before changing anything, it appends a description of the change to a log file and forces that to disk. That's a fast, sequential write. If the machine crashes, the database replays the log on restart (the same idea as file-system journaling in the OS track). The same log also feeds replication to other servers (chapter 4).

For storing the actual data, there are two great families of **storage engines**:

**B-tree engines** (PostgreSQL, MySQL's InnoDB, SQL Server, SQLite) keep data in a B+ tree of fixed-size pages and **update pages in place**. Reads are fast and predictable — usually a few page lookups. Writes cost more, because a small change rewrites a whole page.

**LSM-tree engines** (RocksDB, Cassandra, ScyllaDB, HBase, Google's Bigtable) are built for **massive write volumes**:

1. New writes go to the log and an in-memory sorted table.
2. When that fills up, it's written to disk in one go as an **immutable sorted file**.
3. Reads check memory first, then the files from newest to oldest (with filters that skip files that can't contain the key).
4. In the background, files are **merged** ("compaction"), discarding old versions.

Try it:

::widget LsmTree {}

| | B-tree engine | LSM-tree engine |
|---|---|---|
| Writes | Random page updates | Sequential batches — much higher write throughput |
| Reads | Very predictable | May check several files |
| Best for | Typical apps: orders, users, payments | Huge streams of writes: logs, metrics, messages, time series |

> [!EXAMPLE] **Discord** stores trillions of chat messages. Messages arrive at an enormous rate and are mostly read recently and in order — a perfect fit for LSM-based databases, which is why Discord used Cassandra and later moved to ScyllaDB.

## The many kinds of "NoSQL"

"NoSQL" isn't one thing — it's a family of databases, each built for a particular **access pattern**, usually giving up joins and multi-row transactions in exchange for scale or flexibility:

| Kind | Think of it as | Examples | Great for |
|---|---|---|---|
| **Key-value** | A giant hash map | Redis, DynamoDB | Sessions, carts, caching, lookups by ID at huge scale |
| **Wide-column** | Rows with huge sorted lists inside | Cassandra, ScyllaDB, Bigtable | Write-heavy data spread across many data centers: messages, events, IoT |
| **Document** | JSON objects | MongoDB, Firestore | Data that's naturally a nested object, with a flexible shape |
| **Graph** | Nodes and relationships | Neo4j, Amazon Neptune | Friends-of-friends, fraud rings, recommendations |
| **Search** | An inverted index | Elasticsearch, OpenSearch | Full-text search, filtering, log analysis |
| **Time series** | Timestamped measurements | InfluxDB, TimescaleDB, Prometheus | Metrics and sensor data |
| **Columnar / analytics** | Each column stored separately | BigQuery, Snowflake, ClickHouse | "Sum sales by region for 5 years" across billions of rows |

> [!NOTE] **Two different jobs.** Apps doing many small reads and writes ("show this order", "add to cart") are **OLTP** (online transaction processing). Reports scanning huge amounts of data ("revenue by country by month") are **OLAP** (analytics). They need very different storage, so companies copy data from their OLTP databases into an analytics warehouse.

## How to choose

1. **Start with PostgreSQL** unless you have a clear reason not to. It handles relational data, JSON documents, full-text search, geographic data and even AI vector search through extensions, and scales further than most products ever need.
2. **Choose by access pattern**, not by fashion: key lookups at enormous scale → DynamoDB/Cassandra; huge write streams → an LSM-based store; analytics → a columnar warehouse; search → Elasticsearch; deep relationships → a graph database.
3. **Consider your consistency needs** (money needs transactions) and **operational cost** — a managed cloud database saves enormous effort.
4. **Using several is normal.** A typical company runs Postgres for orders, Redis for sessions, Elasticsearch for search, S3 for files and BigQuery for analytics, kept in sync by streaming changes between them.

> [!RECAP]
> - **ACID transactions** make multi-step changes all-or-nothing, isolated and durable.
> - Weaker **isolation levels** allow anomalies — lost updates, dirty reads, **write skew**; fix them with atomic updates, row locks, version checks or serializable isolation.
> - **Indexes** (B+ trees) turn full scans into a few page reads; column order matters, and every index slows writes.
> - A **write-ahead log** provides durability; **B-tree engines** favor predictable reads, **LSM engines** favor heavy writes.
> - **NoSQL** is a family of specialized databases; choose by **access pattern**, and start with Postgres.

> [!INTERVIEW] Be able to explain ACID, show a concrete isolation anomaly (lost update or write skew) and how to prevent it, explain how an index speeds up a query and the column-order rule, compare B-tree and LSM engines, and justify SQL vs NoSQL from access patterns rather than hype.

::quiz {"q":"Two on-call doctors each check that the other is on call, then both sign off simultaneously, leaving nobody on call. Which anomaly is this?","options":["Dirty read","Lost update","Write skew","Phantom read"],"answer":2,"explain":"Each wrote different rows based on overlapping reads; only serializable isolation or explicit locking prevents it."}

::quiz {"q":"An index exists on (customer_id, created_at). Which query can't use it efficiently?","options":["WHERE customer_id = 5","WHERE customer_id = 5 AND created_at > '2026-01-01'","WHERE created_at > '2026-01-01'","WHERE customer_id = 5 ORDER BY created_at"],"answer":2,"explain":"Like a phone book sorted by last name, the index is ordered by customer_id first."}

::quiz {"q":"Why are LSM-tree databases good at very high write rates?","options":["They skip durability","They buffer writes in memory and write them to disk as large sequential, immutable files instead of updating pages in place","They don't support reads","They only store numbers"],"answer":1,"explain":"Sequential batched writes are much cheaper than random page updates."}
