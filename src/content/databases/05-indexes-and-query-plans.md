---
title: Indexes and Query Plans — Making Queries Fast
summary: Why a query that took 2 ms with a thousand rows takes 20 seconds with ten million, how a B-tree index finds one row among billions in a handful of steps, composite and covering indexes and the left-prefix rule, reading EXPLAIN output, why indexes sometimes aren't used, and what every index costs.
---

::widget Scene {"title": "With and without an index", "sub": "find one email among 10 million users, and read the plan", "nodes": [{"id": "q", "kind": "laptop", "label": "SELECT * FROM users WHERE email = ?", "x": 3.72, "y": 3.72}, {"id": "heap", "kind": "blocks", "label": "Table (10M rows)", "x": 12.13, "y": 2.13, "count": 16, "color": "dark"}, {"id": "root", "kind": "cube", "label": "B-tree root", "x": 5.0, "y": -5.0, "color": "purple"}, {"id": "mid", "kind": "cube", "label": "Inner page", "x": 9.0, "y": -9.0, "color": "purple"}, {"id": "leaf", "kind": "cube", "label": "Leaf: email → row id", "x": 13.0, "y": -13.0, "color": "green"}], "links": [["q", "heap"], ["q", "root", {"dashed": true}], ["root", "mid"], ["mid", "leaf"], ["leaf", "heap", {"dashed": true}]], "metrics": [["plan", "Plan"], ["reads", "Pages read"], ["time", "Time"]], "steps": [{"short": "Seq", "tag": "No index", "title": "Without an index: sequential scan", "body": "<p>Read every page and check every row's email.</p>", "show": ["q", "heap"], "flow": [["q", "heap", "#ef4444", "scan all"]], "metrics": {"plan": ["Seq Scan"], "reads": ["~250,000"], "time": ["~1.8 s", "bad"]}}, {"short": "Create", "tag": "Index", "title": "CREATE INDEX ON users(email)", "body": "<p>A B-tree: sorted emails in pages, a few levels deep, each entry pointing to its row.</p>", "show": ["q", "heap", "root", "mid", "leaf"], "metrics": {"plan": ["—"]}}, {"short": "Root", "tag": "Lookup", "title": "Start at the root: which range contains \"asha@x.in\"?", "body": "<p>Each page holds hundreds of keys, so the tree is only 3–4 levels for 10M rows.</p>", "flow": [["q", "root", "#3b82f6", "asha@x.in"]], "set": {"root": {"badge": "a–f"}}, "metrics": {"plan": ["Index Scan"], "reads": ["1"]}}, {"short": "Down", "tag": "Lookup", "title": "Inner page, then leaf", "body": "<p>Binary search inside each page.</p>", "flow": [["root", "mid", "#3b82f6", ""], ["mid", "leaf", "#3b82f6", ""]], "set": {"leaf": {"badge": "row 8,812,004"}}, "metrics": {"reads": ["3"]}}, {"short": "Fetch", "tag": "Lookup", "title": "Fetch the row from the table", "body": "<p>4 page reads instead of 250,000.</p>", "flow": [["leaf", "heap", "#22c55e", "fetch row"]], "metrics": {"reads": ["4"], "time": ["~0.2 ms", "good"]}}, {"short": "Explain", "tag": "EXPLAIN", "title": "EXPLAIN ANALYZE shows which plan ran", "body": "<p>Estimated vs actual rows; if they're wildly different, statistics are stale — run ANALYZE.</p>"}, {"short": "Composite", "tag": "Composite", "title": "Index (country, city): leftmost-prefix rule", "body": "<p>Helps WHERE country = ? and WHERE country = ? AND city = ?. Not WHERE city = ? alone.</p>"}, {"short": "Covering", "tag": "Covering", "title": "If the index contains every needed column, skip the table", "body": "<p>An index-only scan.</p>", "set": {"heap": {"dim": true}}, "metrics": {"plan": ["Index Only Scan"], "reads": ["3"]}}, {"short": "Cost", "tag": "Cost", "title": "Indexes aren't free", "body": "<p>Every INSERT and UPDATE must update every index, and they use disk and memory. Functions on the column (LOWER(email)) can't use a plain index — index the expression.</p>", "set": {"heap": {"dim": false}}, "note": {"kind": "key", "text": "B-tree index = sorted keys in a shallow tree → O(log n) lookups. Read plans with EXPLAIN ANALYZE; design composite indexes for your WHERE and ORDER BY."}}]}

## The query that got slower every month

> [!STORY] When the bookshop launched, the "my orders" page loaded instantly. Two years and ten million orders later, it takes eight seconds, and at sale time the database's CPU sits at 100%. The query hasn't changed: `SELECT … FROM orders WHERE customer_id = 4821 ORDER BY created_at DESC LIMIT 20`. The problem: to find one customer's orders, the database reads **all ten million rows**. One line fixes it — `CREATE INDEX ON orders (customer_id, created_at DESC)` — and the page drops to 3 milliseconds.

## What an index is


> [!ANALOGY] The index at the back of a textbook. To find every mention of "deadlock" without it, you'd read all 900 pages. With it, you look up "deadlock" alphabetically — "pages 212, 340, 341" — and go straight there. A database index is the same: a separate, sorted structure mapping values to the rows that contain them.

Without an index, the database does a **sequential scan**: read every row and check it. With an index on `customer_id`, it looks up 4821 in the sorted index and jumps directly to that customer's rows.

### The B-tree: the index behind almost everything

Most database indexes are **B-trees** (DSA track covers them in detail). A B-tree is a very wide, shallow sorted tree: each node is one disk page holding hundreds of keys, so even a billion rows need only about **4 levels**.

::widget Stepper {"type":"tree","title":"Finding customer 4821 in a B-tree index","what":"A simplified B-tree index on orders.customer_id. Each box is one page read from disk or memory; the search goes from the root down.","steps":["Click the root and follow the path to customer 4821.","Count how many pages were read in total.","Notice the leaf pages are linked, so a range ('customers 4800–4900') is a walk along the bottom."],"nodes":[["Root page: 1 … 5000 … 10000 …","The top of the tree. 4821 is less than 5000, so follow the first pointer. One page read."],["Inner page: 1 … 2500 … 4000 …","4821 is beyond 4000, so follow that pointer. Two pages read."],["Inner page: 5001 … 7500 …","(A different branch — not visited for this search.)"],["Leaf page: 4000 … 4821 … 4999","Found 4821. The leaf lists the exact locations of that customer's rows. Three pages read in total — instead of ten million rows."],["Leaf page: 2500 … 3999","Neighboring leaf. Leaves are linked in order, which makes range queries and ORDER BY cheap."],["Leaf page: 5001 … 6000","Not visited."]]}

Because the index is **sorted**, it also speeds up range filters (`created_at > …`), `ORDER BY` and `MIN`/`MAX` — not just exact lookups.

## Composite indexes and the left-prefix rule

An index on **several columns** is sorted by the first column, then by the second within each first-column value, and so on — like a phone book sorted by surname, then first name.

An index on `(customer_id, created_at)` helps:

- `WHERE customer_id = 4821` ✓
- `WHERE customer_id = 4821 AND created_at > '2026-01-01'` ✓
- `WHERE customer_id = 4821 ORDER BY created_at DESC LIMIT 20` ✓ — reads exactly 20 entries, already in order
- `WHERE created_at > '2026-01-01'` ✗ — like searching a phone book for everyone named "Priya" regardless of surname

> [!NOTE] **Column order rule of thumb:** put columns tested with **equality** first, then the column used for a **range** or **sort**. `(status, created_at)` serves "pending orders from today" well; `(created_at, status)` much less so.

### Covering indexes

If the index contains every column a query needs, the database answers from the index alone and never visits the table (an **index-only scan**):

```sql
CREATE INDEX orders_customer_recent ON orders (customer_id, created_at DESC) INCLUDE (total, status);
```

### Other useful kinds

- **Unique** indexes enforce uniqueness (that's how `UNIQUE` constraints work).
- **Partial** indexes cover only some rows: `CREATE INDEX … ON orders (created_at) WHERE status = 'pending'` — tiny, when pending orders are 1% of the table.
- **Expression** indexes: `ON users (lower(email))` for case-insensitive lookups.
- **Hash** indexes for equality only; **GIN** for full-text search, arrays and JSONB; **GiST/BRIN** for geographic data and huge append-only tables.

## Reading a query plan

`EXPLAIN` shows the plan the database chose; `EXPLAIN ANALYZE` actually runs it and shows real timings:

```text
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 4821 ORDER BY created_at DESC LIMIT 20;

-- Before the index:
Limit  (actual time=8213.4..8213.5 rows=20)
  -> Sort  (Sort Key: created_at DESC)
       -> Seq Scan on orders  (rows=10,000,000 → filter removed 9,999,880)

-- After:
Limit  (actual time=0.04..0.09 rows=20)
  -> Index Scan using orders_customer_recent on orders  (Index Cond: customer_id = 4821)
```

What to look for: **Seq Scan** on a big table with a selective filter; a big gap between the **estimated** and **actual** rows (stale statistics — run `ANALYZE`); expensive **Sort** steps; and **nested loop** joins over many rows.

> [!ANALOGY] A satnav choosing a route. It estimates traffic on each road (statistics), compares options, and picks the fastest. If its traffic data is out of date, it confidently sends you down a jammed road. Query planners work the same way — they're only as good as their statistics.

## Why isn't my index being used?

- **A function on the column:** `WHERE lower(email) = …` can't use an index on `email` (use an expression index), and `WHERE created_at::date = '2026-11-23'` should become a range.
- **Leading wildcard:** `LIKE '%smith'` can't use a B-tree; `LIKE 'smith%'` can.
- **Type mismatch:** comparing a text column to a number forces a conversion.
- **Low selectivity:** if the filter matches 40% of rows, reading the whole table is genuinely faster, and the planner is right.
- **Wrong column order** in a composite index.
- **Stale statistics** after big data changes.

## The cost of indexes

Indexes aren't free:

- Every `INSERT`, `UPDATE` and `DELETE` must also update **every index** on the table. Ten indexes make writes much slower.
- They take disk and memory, competing with your data for cache space.

So index for the queries you actually run (find them with the slow-query log or `pg_stat_statements`), and drop indexes nobody uses.

> [!RECAP]
> - Without an index, a query **scans every row**; a **B-tree** index finds a row in ~3–4 page reads, even among billions, and also serves ranges and sorts.
> - **Composite** indexes follow the **left-prefix rule**: equality columns first, then range/sort columns. **Covering** indexes avoid touching the table.
> - Use **EXPLAIN ANALYZE**: look for sequential scans, estimate mismatches and sorts.
> - Indexes are skipped for functions on columns, leading wildcards, type mismatches, low selectivity and stale statistics.
> - Every index **slows writes** and uses memory — index for real queries.

> [!INTERVIEW] "This query is slow — what do you do?" Answer: look at the plan, check indexes against the WHERE/JOIN/ORDER BY columns, explain composite column order, consider a covering index, and mention the write cost. Knowing why a B-tree is shallow is a common follow-up.

::quiz {"q":"An index exists on (last_name, first_name). Which query can't use it efficiently?","options":["WHERE last_name = 'Rao'","WHERE last_name = 'Rao' AND first_name = 'Asha'","WHERE first_name = 'Asha'","WHERE last_name LIKE 'Ra%'"],"answer":2,"explain":"The left-prefix rule: the index is sorted by last_name first."}

::quiz {"q":"Why can't WHERE lower(email) = 'a@b.com' use a plain index on email?","options":["Indexes are case-sensitive by law","The index stores email values, not lower(email); use an expression index on lower(email)","Emails can't be indexed","It can always use it"],"answer":1,"explain":"Applying a function to the column hides it from the index."}

::quiz {"q":"What's the main cost of adding many indexes?","options":["Slower reads","Every write must update every index, and they use disk and memory","They expire","They lock the table permanently"],"answer":1,"explain":"Index for the queries you actually run."}
