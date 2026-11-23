---
title: Transactions and Isolation — Many Users, One Correct Answer
summary: What a transaction guarantees (ACID) and why it matters for money, the anomalies that happen when users act at the same time — lost updates, dirty reads, phantoms, write skew — what each isolation level prevents, how databases implement it with locks and MVCC, and practical patterns like SELECT FOR UPDATE, optimistic locking and retries.
---

::widget Scene {"title": "Two people buy the last concert seat", "sub": "ACID, isolation levels and the lost update", "nodes": [{"id": "a", "kind": "phone", "label": "Txn A (Asha)", "x": 0.0, "y": 0.0}, {"id": "bb", "kind": "phone", "label": "Txn B (Ben)", "x": 7.44, "y": 7.44}, {"id": "db", "kind": "db", "label": "seats: A5 status", "x": 8.72, "y": -1.28, "color": "purple"}, {"id": "pay", "kind": "cloud", "label": "Payments", "x": 13.72, "y": -6.28, "color": "green"}], "links": [["a", "db"], ["bb", "db"], ["db", "pay", {"dashed": true}]], "metrics": [["a", "Txn A"], ["b", "Txn B"], ["res", "Outcome"]], "steps": [{"short": "ACID", "tag": "ACID", "title": "A transaction: all-or-nothing, consistent, isolated, durable", "body": "<p>Book seat + record payment either both happen or neither does.</p>", "show": ["a", "bb", "db"], "metrics": {"a": ["—"], "b": ["—"], "res": ["—"]}}, {"short": "ReadA", "tag": "Race", "title": "A: SELECT status FROM seats WHERE id = A5 → free", "body": "<p>Under the default READ COMMITTED isolation.</p>", "flow": [["db", "a", "#3b82f6", "free"]], "metrics": {"a": ["read: free"]}}, {"short": "ReadB", "tag": "Race", "title": "B reads the same row → free", "body": "<p>A hasn't written yet.</p>", "flow": [["db", "bb", "#f59e0b", "free"]], "metrics": {"b": ["read: free"]}}, {"short": "Write", "tag": "Lost update", "title": "Both UPDATE status = sold and COMMIT", "body": "<p>The second overwrites the first. Two tickets sold for one seat.</p>", "flow": [["a", "db", "#3b82f6", "sold to A"], ["bb", "db", "#f59e0b", "sold to B"]], "set": {"db": {"badge": "sold to B (A lost)"}}, "metrics": {"res": ["double sale", "bad"]}}, {"short": "Lock", "tag": "Fix 1", "title": "SELECT … FOR UPDATE locks the row", "body": "<p>B's read waits until A commits, then sees \"sold\".</p>", "set": {"db": {"badge": "locked by A"}}, "metrics": {"a": ["locked + sold"], "b": ["waits, then: sold"], "res": ["one sale", "good"]}}, {"short": "Cond", "tag": "Fix 2", "title": "Or a conditional update", "body": "<p>UPDATE seats SET status = sold WHERE id = A5 AND status = free. Check the row count: 1 = you won, 0 = too late. Atomic, no explicit lock.</p>", "set": {"db": {"badge": "1 row / 0 rows"}}}, {"short": "Levels", "tag": "Isolation", "title": "Isolation levels trade safety for concurrency", "body": "<p>Read committed: no dirty reads. Repeatable read / snapshot: a stable view for the whole transaction. Serializable: as if run one at a time.</p>"}, {"short": "Serial", "tag": "Serializable", "title": "Under SERIALIZABLE, the database aborts one of them", "body": "<p>The app must catch the serialization error and retry.</p>", "metrics": {"b": ["aborted → retry → sold out"]}}, {"short": "Ext", "tag": "Beyond the DB", "title": "Don't hold a transaction open while calling a payment API", "body": "<p>Reserve the seat (with a timeout), commit, call payments, then confirm or release in a new transaction.</p>", "show": ["a", "bb", "db", "pay"], "flow": [["db", "pay", "#22c55e", "after commit"]], "note": {"kind": "key", "text": "Read-then-write races need a lock, a conditional update, or serializable isolation with retries. Keep transactions short."}}]}


## The concert ticket sold twice

> [!STORY] One seat is left for a sold-out concert. Two fans click "buy" within the same millisecond. Both requests read the seat's status: available. Both charge the fan's card. Both mark the seat as sold. Two people turn up at the venue with tickets for seat F-14. Nothing crashed; every line of code did exactly what it was told. The bug is that two operations **interleaved**, and nothing stopped them.

Databases solve this with **transactions**: a group of operations that the database treats as one indivisible unit.

## ACID: what a transaction promises

```sql
BEGIN;
UPDATE accounts SET balance = balance - 5000 WHERE account_id = 1;   -- Asha pays
UPDATE accounts SET balance = balance + 5000 WHERE account_id = 2;   -- Ravi receives
COMMIT;
```

- **Atomicity** — all or nothing. If the server crashes between the two updates, the first is undone; money never vanishes. You can also `ROLLBACK` yourself.
- **Consistency** — constraints hold before and after (no negative balance if there's a `CHECK`).
- **Isolation** — concurrent transactions don't see each other's half-finished work; ideally, the result is as if they ran one after another.
- **Durability** — once `COMMIT` returns, the change survives a crash (via the write-ahead log, chapter 7).

> [!ANALOGY] A bank transfer done in person: the clerk counts out the money, both account books are updated, and only then do you sign. If the power fails halfway, nothing is signed and nothing happened. Atomicity is the signature.

Isolation is the hard one, because full isolation is expensive. Databases offer **levels** that trade safety for speed — and the defaults are weaker than most developers assume.

## What goes wrong when transactions overlap

::widget Sequence {"title":"A lost update: two transactions overwrite each other","what":"Two concurrent requests both add stock to the same product. Each arrow is a step; read from top to bottom in time order.","steps":["Step through the messages in order.","Track the stock value at each step.","Find the moment the first transaction's work is lost, and think of two ways to prevent it."],"actors":["Transaction A","Database","Transaction B"],"msgs":[[0,1,"read stock → 10","A reads the current stock: 10."],[2,1,"read stock → 10","B reads it too, before A writes: also 10."],[0,1,"write stock = 15","A adds 5 delivered units: 10 + 5 = 15."],[2,1,"write stock = 13","B adds 3 units based on the 10 it read: 10 + 3 = 13."],[1,1,"final stock = 13","It should be 18. A's 5 units have vanished — a lost update. Fix it with an atomic UPDATE stock = stock + 3, SELECT … FOR UPDATE, or a version check."]]}

The classic anomalies:

| Anomaly | What happens |
|---|---|
| **Dirty read** | Reading another transaction's change before it commits — then it rolls back, and you acted on data that never existed. |
| **Non-repeatable read** | Reading the same row twice in one transaction and getting different values, because someone committed in between. |
| **Phantom** | Running the same query twice and getting extra rows that someone inserted in between. |
| **Lost update** | Two read-modify-write cycles overlap, and one overwrites the other (the diagram). |
| **Write skew** | Two transactions each check a condition, then make changes that together break it. |

> [!EXAMPLE] **Write skew in a hospital.** The rule: at least one doctor must be on call. Two doctors are on call; both feel ill and open the app at the same moment. Each transaction checks "are at least 2 on call?" — yes — and marks its own doctor off call. Both commit. Nobody is on call. Neither transaction changed a row the other changed, so many isolation levels don't notice.

## Isolation levels

| Level | Prevents | Still allows |
|---|---|---|
| **Read uncommitted** | (almost nothing) | Dirty reads and everything else |
| **Read committed** — *default in PostgreSQL, Oracle, SQL Server* | Dirty reads | Non-repeatable reads, phantoms, lost updates, write skew |
| **Repeatable read / snapshot isolation** — *MySQL InnoDB default* | Dirty and non-repeatable reads; most phantoms; lost updates in PostgreSQL | Write skew |
| **Serializable** | Everything: the result equals some one-at-a-time order | — (but transactions may be aborted and must be retried) |

> [!WARN] Many applications run at **read committed** without realizing it, and their read-then-write logic has race conditions that only appear under real traffic — like the concert ticket.

## How databases implement it

- **Locking:** a transaction that writes a row locks it; others wanting to write it wait. Simple, but readers and writers can block each other, and transactions waiting on each other's locks can **deadlock** — the database detects this and aborts one.
- **MVCC (multi-version concurrency control):** used by PostgreSQL, MySQL InnoDB and Oracle. Every update creates a **new version** of the row instead of overwriting it. Each transaction reads from a consistent **snapshot** — the versions that were committed when it started. **Readers never block writers, and writers never block readers.** Old versions are cleaned up later (PostgreSQL's `VACUUM`).

> [!ANALOGY] MVCC is like a shared document with version history. When you open it, you see a frozen copy as of that moment, even while others keep editing. Your reading never stops their typing.

## Practical patterns

### 1. Let the database do the arithmetic

```sql
UPDATE products SET stock = stock + 3 WHERE product_id = 17;          -- atomic, no lost update
UPDATE seats SET status = 'sold', buyer = 42
WHERE seat_id = 'F-14' AND status = 'available';                      -- check 1 row was updated
```

The second statement fixes the concert: only one transaction can change the seat from available to sold; the other updates **zero rows** and tells its user the seat is gone.

### 2. Pessimistic locking: SELECT … FOR UPDATE

```sql
BEGIN;
SELECT balance FROM accounts WHERE account_id = 1 FOR UPDATE;   -- lock the row until COMMIT
-- application checks the balance, applies business rules …
UPDATE accounts SET balance = balance - 5000 WHERE account_id = 1;
COMMIT;
```

Others wanting to lock that row wait. Good when conflicts are common. Always lock rows in a **consistent order** (e.g. lower account ID first) to avoid deadlocks.

### 3. Optimistic locking: a version number

```sql
UPDATE documents SET body = $1, version = version + 1
WHERE doc_id = $2 AND version = $3;     -- 0 rows updated → someone else changed it; reload and retry
```

No locks held while a user edits; conflicts are detected at save time. Good when conflicts are rare — like wiki edits.

### 4. Serializable + retry

For complex invariants (the on-call doctors), use `SERIALIZABLE` and **retry** transactions that fail with a serialization error. Or enforce the rule with a constraint or a lock on a shared row.

### 5. Keep transactions short

Never hold a transaction open while calling an external API or waiting for a user. Long transactions hold locks, block cleanup, and cause pile-ups.

> [!RECAP]
> - A **transaction** is all-or-nothing (**ACID**: atomicity, consistency, isolation, durability).
> - Concurrent transactions can cause **dirty reads, non-repeatable reads, phantoms, lost updates and write skew**.
> - **Isolation levels** trade safety for speed; the common default, **read committed**, allows lost updates and write skew. **Serializable** prevents everything but needs retries.
> - Databases use **locks** and **MVCC** (snapshots; readers and writers don't block each other).
> - Patterns: **atomic updates** with conditions, **SELECT FOR UPDATE**, **optimistic version checks**, serializable with **retries**, short transactions.

> [!INTERVIEW] "How do you prevent double-booking a seat or overselling inventory?" is one of the most common design questions. Describe a conditional update or row lock, mention isolation levels and their defaults, and explain optimistic vs pessimistic locking and when each fits.

::quiz {"q":"Two requests run 'read stock; write stock + n' at the same time. What's the simplest fix?","options":["Add an index","Use a single atomic statement: UPDATE … SET stock = stock + n","Use read uncommitted","Add a cache"],"answer":1,"explain":"The database applies the arithmetic under its own row lock."}

::quiz {"q":"What is MVCC's key benefit?","options":["Smaller tables","Readers see a consistent snapshot and don't block writers (and vice versa)","It eliminates the need for transactions","It prevents all anomalies at any level"],"answer":1,"explain":"Each transaction reads committed versions as of its snapshot."}

::quiz {"q":"When is optimistic locking (a version column) a better fit than SELECT FOR UPDATE?","options":["When conflicts are frequent","When conflicts are rare and you don't want to hold locks — e.g. while a user edits a document","Never","Only in NoSQL"],"answer":1,"explain":"Detect conflicts at save time and retry, instead of blocking."}
