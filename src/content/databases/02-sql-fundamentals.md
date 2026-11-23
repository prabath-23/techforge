---
title: SQL Fundamentals — From SELECT to JOIN
summary: Learn SQL by asking real questions of a bookshop database — filtering, sorting, inserting and updating rows, the order in which a query really runs, NULL's surprising behavior, and joins explained so you'll never confuse INNER and LEFT again.
---

::widget Scene {"title": "JOINs: putting the tables back together", "sub": "how a query really runs: FROM, JOIN, WHERE, GROUP BY, HAVING, SELECT, ORDER, LIMIT", "nodes": [{"id": "cu", "kind": "cells", "label": "customers", "x": 0.0, "y": 0.0, "values": ["1 Asha", "2 Ben", "3 Chen"]}, {"id": "or", "kind": "cells", "label": "orders (customer, amount)", "x": 4.96, "y": 4.96, "values": ["1 · 500", "1 · 300", "2 · 900", "1 · 200"]}, {"id": "res", "kind": "cells", "label": "result", "x": 9.92, "y": 9.92, "values": ["", "", ""]}], "metrics": [["clause", "Clause"], ["rows", "Rows"], ["note", "Note"]], "steps": [{"short": "Q", "tag": "Query", "title": "Total spent per customer, only those over ₹600, biggest first", "body": "<p>SELECT name, SUM(amount) … JOIN … GROUP BY name HAVING SUM(amount) > 600 ORDER BY 2 DESC.</p>", "show": ["cu", "or"], "metrics": {"clause": ["—"], "rows": ["—"], "note": ["logical order ≠ written order"]}}, {"short": "From", "tag": "FROM / JOIN", "title": "FROM customers JOIN orders ON customers.id = orders.customer_id", "body": "<p>Match every order to its customer. Asha matches 3 orders, Ben 1, Chen none.</p>", "set": {"cu": {"marks": {"0": "blue", "1": "blue"}, "ptr": {}}, "or": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue"}, "ptr": {}}}, "metrics": {"clause": ["FROM + JOIN"], "rows": ["4 joined rows"]}}, {"short": "Inner", "tag": "INNER vs LEFT", "title": "INNER JOIN drops Chen; LEFT JOIN keeps him with NULLs", "body": "<p>Use LEFT JOIN for \"customers with zero orders too\".</p>", "set": {"cu": {"marks": {"0": "blue", "1": "blue", "2": "dark"}, "ptr": {}}}, "metrics": {"note": ["Chen dropped (inner)"]}}, {"short": "Where", "tag": "WHERE", "title": "WHERE filters individual rows (before grouping)", "body": "<p>e.g. WHERE date >= '2026-01-01'. It can't use SUM — groups don't exist yet.</p>", "metrics": {"clause": ["WHERE"], "rows": ["4"]}}, {"short": "Group", "tag": "GROUP BY", "title": "GROUP BY name: one group per customer", "body": "<p>Asha: 500 + 300 + 200 = 1000. Ben: 900.</p>", "set": {"or": {"marks": {"0": "orange", "1": "orange", "3": "orange", "2": "purple"}, "ptr": {}}}, "metrics": {"clause": ["GROUP BY"], "rows": ["2 groups"]}}, {"short": "Having", "tag": "HAVING", "title": "HAVING SUM(amount) > 600 filters groups", "body": "<p>Both pass (1000 and 900).</p>", "metrics": {"clause": ["HAVING"], "rows": ["2"]}}, {"short": "Select", "tag": "SELECT", "title": "SELECT computes the output columns", "body": "<p>Aliases defined here aren't visible in WHERE — that's why.</p>", "set": {"res": {"marks": {"0": "green", "1": "green"}, "ptr": {}, "values": ["Asha 1000", "Ben 900", ""]}}, "metrics": {"clause": ["SELECT"]}}, {"short": "Order", "tag": "ORDER / LIMIT", "title": "ORDER BY total DESC, LIMIT 10", "body": "<p>Sorting happens last, on the final rows.</p>", "metrics": {"clause": ["ORDER BY, LIMIT"], "rows": ["2", "good"]}}, {"short": "NULL", "tag": "Gotcha", "title": "NULL is \"unknown\", not zero", "body": "<p>NULL = NULL isn't true; use IS NULL. SUM ignores NULLs; COUNT(*) counts rows, COUNT(col) skips NULLs.</p>", "note": {"kind": "key", "text": "Logical order: FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Choose INNER or LEFT JOIN deliberately."}}]}


## You describe what you want, not how to get it

> [!STORY] The bookshop owner asks: "Show me every customer from Pune who ordered something in the last 30 days, newest first." In a normal programming language you'd write loops: go through every customer, check the city, go through their orders, check the dates, collect, sort. In SQL you write **one sentence** describing the result, and the database figures out the fastest way to produce it.

**SQL** (Structured Query Language) is **declarative**: you say *what* you want, and the database's **query planner** decides *how* — which indexes to use, which table to read first. That's why the same query keeps working, and often gets faster, as data grows from a thousand rows to a billion.

Our example tables (from chapter 1): `customers(customer_id, name, email, city)`, `books(book_id, title, author, price)`, `orders(order_id, customer_id, created_at)`, `order_items(order_id, book_id, quantity, price_paid)`.

## Reading data: SELECT

```sql
SELECT name, email               -- which columns
FROM customers                   -- from which table
WHERE city = 'Pune'              -- which rows
ORDER BY name                    -- sorted how
LIMIT 20;                        -- how many
```

Useful pieces of `WHERE`:

```sql
WHERE price BETWEEN 200 AND 500
WHERE city IN ('Pune', 'Mumbai')
WHERE title ILIKE '%database%'          -- contains 'database', ignoring case (PostgreSQL)
WHERE created_at >= now() - interval '30 days'
WHERE email IS NULL
```

> [!WARN] Avoid `SELECT *` in application code. It fetches columns you don't need, breaks when columns are added, and can stop the database from answering from an index alone. Name the columns you want.

## The order a query really runs in

You **write** `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT`, but the database **evaluates** it in a different order — which explains many confusing errors:

::widget Stepper {"type":"flow","cols":4,"title":"The logical order a SQL query is evaluated","what":"The order in which the parts of a SELECT statement are logically applied, regardless of the order you write them.","steps":["Press Play from FROM to LIMIT.","Notice that SELECT happens near the end.","Use this to explain why a column alias from SELECT can't be used in WHERE."],"nodes":[["FROM / JOIN","Gather the rows from the tables and combine them."],["WHERE","Throw away rows that don't match the condition."],["GROUP BY","Bundle the remaining rows into groups."],["HAVING","Throw away groups that don't match (e.g. groups with fewer than 3 rows)."],["SELECT","Compute the output columns and aliases."],["DISTINCT","Remove duplicate output rows, if asked."],["ORDER BY","Sort the results — aliases from SELECT can be used here."],["LIMIT / OFFSET","Keep only the requested number of rows."]]}

So `SELECT price * 1.18 AS with_tax … WHERE with_tax > 500` fails: `WHERE` runs before `SELECT` has created `with_tax`.

## Changing data

```sql
INSERT INTO customers (name, email, city)
VALUES ('Asha Rao', 'asha@example.com', 'Pune')
RETURNING customer_id;                       -- get the generated ID back

UPDATE books SET price = price * 0.9 WHERE author = 'R. K. Narayan';

DELETE FROM orders WHERE order_id = 1043;

-- "insert, or update if it already exists" (an upsert)
INSERT INTO stock (book_id, qty) VALUES (17, 5)
ON CONFLICT (book_id) DO UPDATE SET qty = stock.qty + EXCLUDED.qty;
```

> [!WARN] An `UPDATE` or `DELETE` without `WHERE` changes **every row**. Many engineers have a story about this. Run the `WHERE` as a `SELECT` first to see what will be affected, and do risky changes inside a transaction (chapter 6) so you can roll back.

## NULL: the value that isn't

`NULL` means "unknown" or "missing" — not zero, not an empty string. It behaves unlike any other value:

- `NULL = NULL` is not true; it's **unknown**. So `WHERE email = NULL` matches nothing. Use `IS NULL`.
- Any arithmetic with NULL gives NULL: `price + NULL` is NULL.
- `COUNT(*)` counts rows; `COUNT(email)` counts only non-NULL emails.
- `COALESCE(phone, 'not given')` substitutes a default.

> [!ANALOGY] NULL is a sealed envelope. Is the number in envelope A equal to the number in envelope B? You can't say "yes" — you don't know what's in either. SQL answers "unknown", and `WHERE` only keeps rows where the answer is definitely true.

## Joins: combining tables

Since each fact lives in one table, most questions need to **join** tables back together using their keys.

```sql
SELECT c.name, o.order_id, o.created_at
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE c.city = 'Pune'
  AND o.created_at >= now() - interval '30 days'
ORDER BY o.created_at DESC;
```

That's the owner's question from the start, in one statement.

### INNER vs LEFT, once and for all

> [!ANALOGY] A school has a list of students and a list of club memberships. An **inner join** is the photo of students **with** their clubs — anyone in no club isn't in the photo. A **left join** is the photo of **every** student, with an empty space next to those in no club.

::widget Stepper {"type":"hub","title":"The kinds of join","what":"The center is the question; each box is a type of join and which rows it keeps. 'Left' is the table written first.","steps":["Click the center first.","Click INNER and LEFT and compare which customers appear.","Find the join that answers 'which customers have never ordered?'"],"nodes":[["customers JOIN orders","Combine each customer with their orders by matching customer_id. What happens to customers with no orders — and orders with no customer?"],["INNER JOIN","Only pairs that match on both sides. Customers who never ordered disappear. The default when you write just JOIN."],["LEFT JOIN","Every row from the left table (customers), with matching orders where they exist and NULLs where they don't. Customers with no orders appear once, with NULL order columns."],["Finding what's missing","LEFT JOIN orders, then WHERE o.order_id IS NULL — exactly the customers who have never ordered. A classic interview question."],["RIGHT and FULL JOIN","RIGHT keeps every row of the second table (rarely used — swap the tables and use LEFT). FULL keeps unmatched rows from both sides."],["CROSS JOIN","Every row paired with every row: 1,000 × 1,000 = a million rows. Occasionally useful (all sizes × all colors); usually a mistake from a missing ON."]]}

```sql
-- Customers who have never placed an order
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;
```

> [!WARN] **Joins multiply rows.** Joining customers to orders gives one row **per order**, not per customer. If you then sum something from the customer table, you'll count it multiple times. When totals look too big, suspect a join.

> [!RECAP]
> - SQL is **declarative**: describe the result; the query planner decides how.
> - `SELECT … FROM … WHERE … ORDER BY … LIMIT`; logically evaluated as FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.
> - `INSERT`, `UPDATE`, `DELETE`, upserts — always check the `WHERE`.
> - **NULL** means unknown: use `IS NULL`, `COALESCE`, and remember `COUNT(column)` skips NULLs.
> - **INNER JOIN** keeps matches only; **LEFT JOIN** keeps every left row; LEFT JOIN + IS NULL finds what's missing. Joins multiply rows.

> [!INTERVIEW] SQL rounds are common for backend and data roles: joins, "find rows with no match", NULL handling and evaluation order come up constantly. Write it, then explain what each clause does.

::quiz {"q":"Which query finds customers who have never ordered?","options":["INNER JOIN orders WHERE order_id IS NULL","LEFT JOIN orders WHERE o.order_id IS NULL","CROSS JOIN orders","SELECT * FROM orders WHERE customer_id = NULL"],"answer":1,"explain":"The LEFT JOIN keeps unmatched customers with NULL order columns."}

::quiz {"q":"Why does WHERE email = NULL return no rows?","options":["NULL emails don't exist","Comparing with NULL gives 'unknown', not true; use IS NULL","It's a syntax error","Emails are case-sensitive"],"answer":1,"explain":"NULL is never equal to anything, not even NULL."}

::quiz {"q":"Why can't you use a SELECT alias in WHERE?","options":["Aliases are only for display","WHERE is evaluated before SELECT creates the alias","Aliases must be quoted","You can in all databases"],"answer":1,"explain":"Logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY."}
