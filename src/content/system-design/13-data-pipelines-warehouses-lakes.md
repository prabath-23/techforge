---
title: Data Pipelines, Warehouses and Lakes
summary: How companies turn operational data into analytics, reports and machine learning — OLTP vs OLAP, why analytics needs columnar storage, ETL vs ELT, batch and streaming pipelines, change data capture, data warehouses, data lakes and lakehouses (Parquet, Iceberg, Delta), orchestration, data quality, and the modern data stack.
---

::widget Scene {"title": "Batch vs stream processing", "sub": "one clickstream feeding a live dashboard and a nightly report", "nodes": [{"id": "app", "kind": "phone", "label": "Apps", "x": 3.72, "y": 3.72}, {"id": "col", "kind": "server", "label": "Collector", "x": 7.22, "y": 0.22, "color": "blue"}, {"id": "k", "kind": "queue", "label": "Kafka topic: clicks", "x": 10.72, "y": -3.28, "color": "pink"}, {"id": "sp", "kind": "cpu", "label": "Stream job (Flink)", "x": 9.88, "y": -11.12, "color": "orange"}, {"id": "dash", "kind": "laptop", "label": "Live dashboard", "x": 13.38, "y": -14.62}, {"id": "lake", "kind": "disk", "label": "Data lake (Parquet)", "x": 18.56, "y": -2.44, "color": "teal"}, {"id": "bat", "kind": "cpu", "label": "Nightly Spark job", "x": 22.06, "y": -5.94, "color": "purple"}, {"id": "wh", "kind": "db", "label": "Warehouse", "x": 25.56, "y": -9.44, "color": "purple"}], "links": [["app", "col"], ["col", "k"], ["k", "sp"], ["sp", "dash"], ["k", "lake"], ["lake", "bat"], ["bat", "wh"]], "metrics": [["lat", "Freshness"], ["note", "Note"]], "steps": [{"short": "Events", "tag": "Collect", "title": "Every tap is an event: {user, item, ts}", "body": "<p>The collector validates and batches them. Millions per minute.</p>", "show": ["app", "col"], "flow": [["app", "col", "#3b82f6", "click"]], "metrics": {"lat": ["—"], "note": ["—"]}}, {"short": "Log", "tag": "Buffer", "title": "Write to a durable log (Kafka)", "body": "<p>The log decouples producers from consumers and keeps events for days, so any consumer can replay them.</p>", "show": ["app", "col", "k"], "flow": [["col", "k", "#ec4899", "append"]]}, {"short": "Stream", "tag": "Stream", "title": "A stream job reads events as they arrive", "body": "<p>It keeps running counts in its state: \"views per product per minute\".</p>", "show": ["app", "col", "k", "sp", "dash"], "flow": [[["k", "sp", "dash"], "#f59e0b", "counts"]], "metrics": {"lat": ["~2 s", "good"]}}, {"short": "Window", "tag": "Windows", "title": "Group events into 1-minute tumbling windows by event time", "body": "<p>Use when the click happened, not when it arrived — phones go through tunnels.</p>", "set": {"sp": {"badge": "window 10:41"}}}, {"short": "Late", "tag": "Late data", "title": "A click from 10:41 arrives at 10:44", "body": "<p>A watermark says \"we believe all events up to 10:42 have arrived\". Allow some lateness; update the window or send stragglers to a side output.</p>", "flow": [["k", "sp", "#ef4444", "late: 10:41"]], "metrics": {"note": ["watermarks handle late events"]}}, {"short": "Exactly", "tag": "Guarantees", "title": "Crash mid-stream?", "body": "<p>Flink checkpoints its state and Kafka offsets together. On restart it resumes from the checkpoint — counts aren't doubled.</p>", "set": {"sp": {"badge": "checkpoint ✓"}}}, {"short": "Lake", "tag": "Batch", "title": "Meanwhile, raw events land in the data lake", "body": "<p>Cheap object storage, columnar Parquet files, partitioned by date. The full, untouched history.</p>", "show": ["app", "col", "k", "sp", "dash", "lake"], "flow": [["k", "lake", "#14b8a6", "hourly files"]]}, {"short": "Nightly", "tag": "Batch", "title": "At 2 am a Spark job processes all of yesterday", "body": "<p>It joins clicks with orders and products, deduplicates, and computes accurate revenue per category.</p>", "show": ["app", "col", "k", "sp", "dash", "lake", "bat"], "flow": [["lake", "bat", "#a855f7", "1.2 B rows"]], "metrics": {"lat": ["hours"], "note": ["complete and accurate"]}}, {"short": "Warehouse", "tag": "Serve", "title": "Load results into the warehouse for BI and analysts", "body": "<p>Star schema: a fact table of orders with dimension tables for products, customers and dates.</p>", "show": ["app", "col", "k", "sp", "dash", "lake", "bat", "wh"], "flow": [["bat", "wh", "#a855f7", "facts + dims"]]}, {"short": "Choose", "tag": "Trade-off", "title": "Stream for fresh and approximate; batch for complete and exact", "body": "<p>Fraud checks, live dashboards → stream. Finance reports, ML training sets → batch. Many companies run both from the same log.</p>", "note": {"kind": "key", "text": "Event log at the centre; stream jobs for seconds-fresh views; lake + batch for complete history; warehouse for analytics."}}]}


## "How many orders did we have yesterday?"

> [!STORY] The CEO asks a simple question: how many orders did we get yesterday, broken down by city and product category, compared with the same day last year? An engineer runs the query against the production database. It scans 400 million rows, takes 11 minutes, and slows checkout for every customer while it runs. The production database was built to handle millions of tiny, fast transactions — not giant scans over years of history. Answering business questions safely and quickly requires moving data into systems designed for **analysis**, and that's what data pipelines do.

## Two kinds of workload

| | **OLTP** (transactions) | **OLAP** (analytics) |
|---|---|---|
| Example | "Place order #9182", "show my cart" | "Revenue by city and category, last 3 years" |
| Each query touches | A few rows, by key | Millions to billions of rows, a few columns |
| Volume | Thousands of small queries per second | Fewer, much heavier queries |
| Optimized for | Low latency, concurrency, correctness | Scanning and aggregating huge amounts of data |
| Storage | Row-oriented (PostgreSQL, MySQL) | **Column-oriented** (BigQuery, Snowflake, Redshift, ClickHouse) |

## Why columnar storage is so fast for analytics

A row store keeps each row's values together: `[order_id, customer, city, amount, created_at, …]`. A **column store** keeps each **column** together: all cities in one place, all amounts in another.

> [!ANALOGY] A filing cabinet of customer forms (row store) vs a set of ledgers, one per question on the form (column store). To total every customer's spending, the ledger approach lets you read just the "amount" ledger — not pull out every full form.

For "sum of amount by city", a column store:

- Reads **only** the `city` and `amount` columns — perhaps 2 of 50 columns, 25× less data.
- **Compresses** extremely well, because a column holds similar values (city names repeat; dates are sequential) — often 5–10× smaller.
- Processes values in tight batches using **SIMD** instructions (Architecture track, chapter 4).
- Skips whole blocks using min/max statistics ("this block's dates are all from 2023 — skip it").

The trade-off: updating single rows is slow, which is fine for analytics.

## Moving the data: pipelines

### ETL vs ELT

- **ETL** (extract, transform, load): transform data **before** loading into the warehouse. The traditional approach, when warehouse compute was expensive.
- **ELT** (extract, load, transform): load raw data first, then transform it **inside** the warehouse with SQL. The modern default — cloud warehouses are powerful, raw data is kept for reprocessing, and transformations are version-controlled SQL (often managed with **dbt**).

### Batch vs streaming

- **Batch:** process data in chunks on a schedule (hourly, nightly). Simple, efficient, easy to re-run. Fine for most reports.
- **Streaming:** process events continuously as they happen, with seconds of delay — fraud detection, live dashboards, real-time recommendations. Tools: Kafka (transport), Flink, Spark Structured Streaming, Kafka Streams (processing). Harder: late-arriving events, windows, exactly-once processing, state management.

### Getting data out of production safely: change data capture

Rather than repeatedly querying production tables ("give me everything changed since yesterday" — which misses deletes and loads the database), **change data capture (CDC)** reads the database's own write-ahead log or binlog (Databases track, chapter 7) and publishes every insert, update and delete as an event. **Debezium** is the popular open-source tool. Low impact on production, nothing missed, near-real-time.

## The architecture

::widget Architecture {"title":"A modern data platform","what":"How data flows from operational systems into a lakehouse and out to dashboards and machine learning. Arrows show data moving; dashed ones are continuous streams.","steps":["Follow data from the sources on the left to the consumers on the right.","Click the bronze, silver and gold layers to see how data is refined.","Find the component that schedules and monitors every pipeline."],"nodes":[{"id":"db","label":"Production databases","kind":"db","col":0,"row":0,"desc":"Orders, users, payments — the OLTP systems. Never run heavy analytics directly on them."},{"id":"events","label":"App & clickstream events","kind":"client","col":0,"row":1,"desc":"What users do in apps: page views, searches, clicks — sent as events."},{"id":"saas","label":"SaaS tools (CRM, ads, payments)","kind":"external","col":0,"row":2,"desc":"Data from third-party tools, pulled through their APIs by connectors (Fivetran, Airbyte)."},{"id":"kafka","label":"Kafka (CDC + events)","kind":"queue","col":1,"row":0,"desc":"Debezium streams every database change; apps publish events. A durable log that many consumers can read."},{"id":"bronze","label":"Bronze: raw","kind":"storage","col":2,"row":0,"desc":"Raw data exactly as received, in object storage as Parquet/Iceberg tables. Kept so everything can be reprocessed."},{"id":"silver","label":"Silver: cleaned","kind":"storage","col":2,"row":1,"desc":"Deduplicated, typed, validated, joined, with consistent IDs. Personal data masked as required."},{"id":"gold","label":"Gold: business tables","kind":"storage","col":2,"row":2,"desc":"Modeled for use: fact and dimension tables (star schema), daily revenue, active users — the numbers the business agrees on."},{"id":"wh","label":"Query engine / warehouse","kind":"search","col":3,"row":1,"desc":"BigQuery, Snowflake, Databricks SQL, Trino — runs SQL over the lakehouse tables."},{"id":"bi","label":"Dashboards & ML","kind":"ml","col":4,"row":1,"desc":"BI tools (Looker, Tableau, Superset), notebooks, feature stores and model training."},{"id":"orch","label":"Orchestrator + quality checks","kind":"worker","col":3,"row":2,"desc":"Airflow / Dagster schedule pipelines with dependencies, retries and alerts; data-quality tests block bad data from reaching gold tables."}],"edges":[["db","kafka","CDC",true],["events","kafka","stream",true],["saas","bronze","connectors"],["kafka","bronze","land"],["bronze","silver","clean"],["silver","gold","model"],["gold","wh","query"],["wh","bi","SQL"],["orch","silver","runs"]]}

### Warehouses, lakes and lakehouses

- **Data warehouse** (Snowflake, BigQuery, Redshift): structured tables, SQL, strong performance and governance. Historically closed storage formats.
- **Data lake:** cheap object storage (S3, GCS) holding any data in open file formats — raw logs, images, Parquet files. Flexible and cheap, but without care it becomes a "data swamp": no schemas, no transactions, unclear quality.
- **Lakehouse:** open **table formats** — **Apache Iceberg**, **Delta Lake**, **Apache Hudi** — on top of Parquet files in object storage, adding database features: ACID transactions, schema evolution, time travel (query the table as it was last Tuesday), and efficient updates and deletes. Many engines (Spark, Trino, Snowflake, BigQuery, DuckDB) can query the same tables.

**Parquet** is the common columnar **file** format underneath — compressed, with column statistics for skipping.

### Modeling: facts and dimensions

Analytics tables are commonly modeled as a **star schema** (Databases track, chapter 4): a central **fact** table of events (one row per order line: quantity, price, keys) surrounded by **dimension** tables describing them (date, product, customer, store). Business users can then slice any measure by any dimension.

## Keeping pipelines reliable

- **Orchestration:** Airflow, Dagster or Prefect run tasks in dependency order (a DAG — Algorithms track, topological sort), with retries, backfills and alerts.
- **Idempotent, re-runnable jobs:** rerunning "build yesterday's table" should replace that partition, not append duplicates. Partition data by date.
- **Data quality tests:** row counts within expected ranges, no null IDs, unique keys, referential integrity, freshness ("the orders table updated in the last hour"). Tools: dbt tests, Great Expectations, Soda. Failing tests stop bad data from reaching dashboards.
- **Data contracts** between producing teams and the data team: schemas and meanings agreed and versioned, so a renamed column in the app doesn't silently break the CFO's report.
- **Lineage:** knowing which dashboards depend on which tables, so you can assess the impact of a change or an incident.
- **Governance and privacy:** access controls, masking personal data, honoring deletion requests (GDPR / India's DPDP Act) across every copy.

> [!EXAMPLE] **Streaming in practice: fraud detection.** Card transactions flow into Kafka. A Flink job keeps per-card state ("transactions in the last 10 minutes", "countries seen today") and scores each transaction with a model within milliseconds, flagging suspicious ones before the payment completes. The same events also land in the lakehouse for analysts and for retraining the model nightly.

> [!RECAP]
> - **OLTP** handles many small transactions; **OLAP** scans and aggregates huge datasets — keep analytics off production databases.
> - **Columnar storage** reads only needed columns, compresses well and skips blocks: ideal for analytics.
> - **ELT** (load raw, transform with SQL/dbt) is the modern default; **batch** for most needs, **streaming** for real-time.
> - **CDC** streams database changes safely from the log.
> - **Warehouses**, **lakes** and **lakehouses** (Iceberg/Delta on Parquet) store analytical data; **bronze → silver → gold** layers refine it; **star schemas** model it.
> - Reliability: orchestration, idempotent partitioned jobs, quality tests, data contracts, lineage and governance.

> [!INTERVIEW] Data-heavy design questions ("design analytics for an app", "design a metrics pipeline", "real-time leaderboard of sales") test OLTP vs OLAP, columnar storage, batch vs streaming, CDC, late data, exactly-once processing and idempotent jobs.

::quiz {"q":"Why are column stores fast for 'total revenue by city'?","options":["They use more indexes","They read only the needed columns, compress them well and process them in batches","They store fewer rows","They cache everything in RAM"],"answer":1,"explain":"Two columns out of fifty means far less data to read."}

::quiz {"q":"What does change data capture read?","options":["Application logs","The database's write-ahead log / binlog, emitting each insert, update and delete as an event","Screenshots","Backups only"],"answer":1,"explain":"Low impact on production, and deletes aren't missed."}

::quiz {"q":"What do table formats like Iceberg and Delta Lake add to files in object storage?","options":["Faster networks","ACID transactions, schema evolution, time travel and efficient updates — database features on a data lake","Encryption only","Compression only"],"answer":1,"explain":"That's what makes a 'lakehouse'."}
