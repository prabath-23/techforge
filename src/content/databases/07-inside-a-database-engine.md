---
title: Inside a Database Engine — Pages, the Buffer Pool and the Write-Ahead Log
summary: What happens inside PostgreSQL or MySQL when you run a query — how rows are laid out in fixed-size pages on disk, how the buffer pool keeps hot pages in memory, how the write-ahead log makes COMMIT both fast and crash-proof, how a query is parsed, planned and executed, and how replication and backups build on the same log.
---

## "Saved" — but where, exactly?

> [!STORY] You run `UPDATE accounts SET balance = 900 WHERE id = 1; COMMIT;` and the database replies in half a millisecond. One microsecond later, someone pulls the server's power cord. When it restarts, the balance is 900. Yet writing a change into the middle of a large file on disk and waiting for the disk to confirm takes far longer than half a millisecond. How can the database be both **fast** and **safe**? The answer is one of the most important ideas in systems: the **write-ahead log**.

## Rows live in pages

A database doesn't read or write individual rows from disk. It works in fixed-size **pages** (8 KB in PostgreSQL, 16 KB in MySQL InnoDB). A table is a file made of pages; each page holds many rows plus a small directory saying where each row starts.

> [!ANALOGY] A filing cabinet where every folder (page) is the same size and holds several documents (rows). You never carry a single sheet to and from the archive — you fetch the whole folder, because the trip is the expensive part.

Why pages? Disks and SSDs are fastest when reading or writing blocks, and fetching one 8 KB page costs about the same as fetching 100 bytes. Indexes (chapter 5) are made of pages too — a B-tree node is a page.

In PostgreSQL, a row's physical address is (page number, slot number); MVCC (chapter 6) means an update writes a **new version** of the row, possibly on another page, and the old one is cleaned up by `VACUUM`. In InnoDB, the table itself is a B-tree ordered by primary key (a **clustered index**), which is why sequential primary keys make inserts efficient there.

## The buffer pool: memory as a cache

Reading from SSD takes ~100 microseconds; reading from RAM ~100 nanoseconds — a thousand times faster. So the database keeps recently used pages in a large memory area called the **buffer pool** (PostgreSQL: `shared_buffers`; InnoDB: `innodb_buffer_pool_size`, often 50–75% of the server's memory).

- On a read, the database first checks the buffer pool. A **hit** is cheap; a **miss** reads the page from disk and keeps it, evicting an old page using an LRU-like policy (DSA track's LRU cache).
- On a write, the page is changed **in memory** and marked **dirty**. It's written back to disk later, in the background.

The **cache hit ratio** is one of the most important health numbers. A database whose working set fits in memory is fast; one that constantly reads from disk is not.

## The write-ahead log: fast and crash-proof

But if changed pages are only in memory, a crash would lose them. The fix:

::widget Stepper {"type":"flow","cols":3,"title":"What happens when you COMMIT","what":"The steps a database takes so that a commit is both fast and survives a crash. The key is writing a small log record before touching the real data files.","steps":["Press Play and follow one UPDATE through to COMMIT.","Notice which step must reach the disk before COMMIT returns — and which can wait.","Then read the crash-recovery box: how the database rebuilds lost changes."],"nodes":[["1. Change the page in memory","The UPDATE finds the page in the buffer pool and changes the row there. The page is now 'dirty'. Nothing has touched the data file yet."],["2. Write a log record","A small record describing the change ('page 812, slot 4: balance 1000 → 900') is appended to the write-ahead log (WAL)."],["3. Flush the log on COMMIT","On COMMIT, the log is forced to disk (fsync). Appending to the end of one file is fast — and many transactions' commits can share one flush ('group commit'). Now COMMIT returns."],["4. Write data pages later","In the background, a checkpoint process writes dirty pages to the data files in efficient batches. Many changes to the same page become one write."],["5. Crash recovery","After a crash, the database reads the WAL from the last checkpoint and re-applies every committed change to the data pages ('redo'). Changes from transactions that never committed are discarded."],["6. Reuse the log","Once a checkpoint has written all pages up to some point, the older log is no longer needed for recovery — but it's useful for replication and backups."]]}

> [!ANALOGY] A shop assistant who's too busy to update the stock spreadsheet after every sale. Instead, they jot each sale on a notepad — quick, always at the bottom of the page — and update the spreadsheet properly at closing time. If the computer crashes mid-day, the notepad tells them exactly what to redo. The notepad is the write-ahead log.

The rule is in the name: the log record must be written **ahead** of the data page. Turning random writes all over the data files into **sequential appends** to one log is what makes commits fast.

> [!WARN] Settings like PostgreSQL's `synchronous_commit = off` or `fsync = off` make commits faster by not waiting for the log flush — and can lose recently "committed" transactions (or, for `fsync = off`, corrupt the database) on a crash. Know exactly what you're trading before touching them.

## The journey of a query

1. **Parse:** check the SQL's grammar and turn it into a tree.
2. **Analyze/rewrite:** resolve table and column names, expand views, check permissions.
3. **Plan:** the **optimizer** considers many possible plans — which indexes, which join order, nested loop vs hash join vs merge join — estimates each one's cost using **statistics** about the data, and picks the cheapest (chapter 5's EXPLAIN shows this).
4. **Execute:** run the plan as a tree of operators, each pulling rows from the ones below it (scan → filter → join → sort → limit).

> [!NOTE] **Join algorithms.** A **nested loop** looks up matches for each row of one table — great when one side is small and the other is indexed. A **hash join** builds a hash table of the smaller side and probes it — great for large unsorted inputs. A **merge join** walks two sorted inputs together. The planner picks based on its size estimates, which is why stale statistics cause bad plans.

## The log powers replication and backups too

The WAL is a complete, ordered record of every change, so it's reused:

- **Replication:** send the WAL to replica servers, which replay it to stay in sync (System Design track, replication chapter). PostgreSQL's streaming replication and MySQL's binlog replication work this way.
- **Point-in-time recovery:** take a full backup nightly and keep all WAL since. To recover to 14:32:07 — just before someone dropped a table — restore the backup and replay the log up to that second.
- **Change data capture:** tools like Debezium read the log and publish every change as an event to Kafka, so other systems (search indexes, caches, warehouses) stay in sync without changing the application.

> [!RECAP]
> - Data lives in fixed-size **pages**; tables and indexes are files of pages.
> - The **buffer pool** caches hot pages in memory; writes change pages in memory, marking them **dirty**.
> - The **write-ahead log** makes COMMIT fast and durable: append a log record and flush it; write data pages later at **checkpoints**; **replay** the log after a crash.
> - Queries are **parsed, planned** (cost-based, using statistics) and **executed** as operator trees; joins use nested loop, hash or merge.
> - The same log drives **replication**, **point-in-time recovery** and **change data capture**.

> [!INTERVIEW] "How does a database guarantee durability without being slow?" — explain the WAL, sequential writes, group commit and checkpoints. It also comes up for designing any system that must not lose data, like a message queue or a payment ledger.

::quiz {"q":"Why is appending to the write-ahead log faster than writing the changed data page?","options":["The log is stored in RAM only","It's a sequential append to one file, and many commits can share one flush","Logs are compressed","Data pages are encrypted"],"answer":1,"explain":"Sequential writes and group commit avoid scattered random writes."}

::quiz {"q":"After a crash, how are committed changes that were never written to the data files restored?","options":["They're lost","By replaying the write-ahead log from the last checkpoint","From the buffer pool","From the replicas only"],"answer":1,"explain":"That's exactly what the log is for."}

::quiz {"q":"What does a high buffer pool hit ratio tell you?","options":["Most reads are served from memory rather than disk","The disk is full","The log is too large","Queries are failing"],"answer":0,"explain":"A working set that fits in memory makes the database fast."}
