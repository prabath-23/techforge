---
title: Advanced SQL — Aggregation, Window Functions and CTEs
summary: Answering real business questions in SQL — totals and averages per group with GROUP BY and HAVING, ranking and running totals with window functions, breaking a hard query into readable steps with CTEs, recursive queries for hierarchies, and the classic "top N per group" problem.
---

## The questions managers actually ask

> [!STORY] Monday morning at the bookshop. The owner wants: total revenue per city last month; the three best-selling books **in each genre**; each customer's spending this year compared with last year; a running total of daily sales for the month; and which customers' orders dropped by more than half. Each of these is a single query once you know three tools: **aggregation**, **window functions** and **CTEs**.

## Aggregation: collapsing rows into summaries

**Aggregate functions** turn many rows into one value: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. With `GROUP BY`, you get one result **per group**.

```sql
-- Revenue per city last month, only cities over ₹50,000
SELECT c.city, SUM(oi.quantity * oi.price_paid) AS revenue, COUNT(DISTINCT o.order_id) AS orders
FROM orders o
JOIN customers c   ON c.customer_id = o.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.created_at >= date_trunc('month', now()) - interval '1 month'
  AND o.created_at <  date_trunc('month', now())
GROUP BY c.city
HAVING SUM(oi.quantity * oi.price_paid) > 50000
ORDER BY revenue DESC;
```

- `WHERE` filters **rows** before grouping; `HAVING` filters **groups** after.
- Every column in `SELECT` must either be in `GROUP BY` or inside an aggregate — otherwise, which of the group's many values would it show?

> [!ANALOGY] Sorting a pile of receipts into envelopes by city (GROUP BY), then writing the total on the front of each envelope (SUM), then throwing away envelopes with small totals (HAVING).

**Conditional aggregation** answers "this year vs last year" in one pass:

```sql
SELECT customer_id,
       SUM(amount) FILTER (WHERE created_at >= '2026-01-01') AS this_year,
       SUM(amount) FILTER (WHERE created_at <  '2026-01-01') AS last_year
FROM order_totals
GROUP BY customer_id;
```

## Window functions: calculations across related rows, without collapsing them

`GROUP BY` squashes each group into one row. Often you want to **keep every row** but add a calculation over its neighbors: its rank within its genre, the running total so far, the difference from the previous day.

> [!ANALOGY] A class's exam results. `GROUP BY` gives you one row per class: the average. A **window function** keeps every student's row and adds a column: "your rank in your class" or "how far above your class average you are". Each student looks out of a "window" at their classmates.

```sql
SELECT title, genre, copies_sold,
       RANK()        OVER (PARTITION BY genre ORDER BY copies_sold DESC) AS rank_in_genre,
       copies_sold - AVG(copies_sold) OVER (PARTITION BY genre)          AS vs_genre_avg
FROM book_sales;
```

- `PARTITION BY` sets the groups (the window) — like GROUP BY, but rows are kept.
- `ORDER BY` inside `OVER` sets the order within each window.

::widget Stepper {"type":"hub","title":"The window functions you'll use most","what":"The center explains the OVER clause; each box is a commonly used window function and a real question it answers.","steps":["Click the center first.","Click each function and note the question it answers.","Find the difference between RANK and ROW_NUMBER when two books tie."],"nodes":[["OVER (PARTITION BY … ORDER BY …)","Turns any function into a window function: compute it over the rows in the same partition, in this order, while keeping every row."],["ROW_NUMBER()","1, 2, 3, 4… within each partition, even for ties. Use for 'pick exactly one per group' and pagination."],["RANK() and DENSE_RANK()","Ties share a rank. RANK skips numbers after a tie (1, 1, 3); DENSE_RANK doesn't (1, 1, 2). Use for leaderboards."],["SUM() OVER (ORDER BY day)","A running total: each day's row shows the total of all days up to and including it."],["LAG() and LEAD()","The value from the previous or next row: 'change from yesterday', 'time since the previous order'."],["AVG() OVER (… ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)","A moving average — here, over the last 7 days — to smooth out noisy daily numbers."]]}

```sql
-- Running total and day-over-day change of daily sales
SELECT day, sales,
       SUM(sales) OVER (ORDER BY day)          AS month_to_date,
       sales - LAG(sales) OVER (ORDER BY day)  AS change_from_yesterday
FROM daily_sales
WHERE day >= date_trunc('month', current_date);
```

## CTEs: writing a query in readable steps

A **common table expression** (`WITH`) names an intermediate result, so a complicated query reads top to bottom like a recipe.

### The classic: top N per group

"The three best-selling books in each genre":

```sql
WITH sales AS (                                     -- step 1: copies sold per book
  SELECT b.book_id, b.title, b.genre, SUM(oi.quantity) AS copies
  FROM order_items oi
  JOIN books b ON b.book_id = oi.book_id
  GROUP BY b.book_id, b.title, b.genre
),
ranked AS (                                         -- step 2: rank within each genre
  SELECT *, ROW_NUMBER() OVER (PARTITION BY genre ORDER BY copies DESC) AS rn
  FROM sales
)
SELECT genre, title, copies                         -- step 3: keep the top 3
FROM ranked
WHERE rn <= 3
ORDER BY genre, copies DESC;
```

> [!NOTE] Why not just `WHERE ROW_NUMBER() … <= 3`? Remember the evaluation order from chapter 2: window functions are computed during SELECT, **after** WHERE. So you compute them in one step and filter in the next — exactly what the CTE makes easy.

### Recursive CTEs: walking hierarchies

An employees table where each row has a `manager_id`. "Everyone who reports to Priya, at any level":

```sql
WITH RECURSIVE team AS (
  SELECT employee_id, name, 1 AS depth FROM employees WHERE name = 'Priya'   -- start
  UNION ALL
  SELECT e.employee_id, e.name, t.depth + 1                                    -- then repeatedly add
  FROM employees e JOIN team t ON e.manager_id = t.employee_id                 -- the next level down
)
SELECT * FROM team;
```

The same technique handles category trees, folder structures, bill-of-materials and graph walks — it's breadth-first search (Algorithms track) written in SQL.

> [!EXAMPLE] **Spotting customers who are slipping away.** Combine everything: a CTE computes each customer's monthly spending, `LAG` compares each month with the previous one, and an outer query keeps customers whose spending dropped by more than 50%. That list goes to the marketing team for a "we miss you" discount. Queries like this are the everyday work of data and backend engineers.

> [!RECAP]
> - **Aggregates** with `GROUP BY` give one row per group; `WHERE` filters rows, `HAVING` filters groups; `FILTER` gives conditional totals.
> - **Window functions** (`OVER (PARTITION BY … ORDER BY …)`) compute ranks, running totals, previous values and moving averages **while keeping every row**.
> - `ROW_NUMBER` for one-per-group, `RANK`/`DENSE_RANK` for ties, `LAG`/`LEAD` for neighbors.
> - **CTEs** (`WITH`) break hard queries into named steps; **top N per group** = rank in a CTE, filter outside.
> - **Recursive CTEs** walk hierarchies.

> [!INTERVIEW] "Top N per group", "second-highest salary", "running total", "month-over-month change" and "employees under a manager" are the most frequently asked SQL questions. Each maps to a window function or recursive CTE above.

::quiz {"q":"What's the key difference between GROUP BY and a window function?","options":["Window functions are faster","GROUP BY collapses each group into one row; a window function keeps every row and adds a computed column","GROUP BY can't use SUM","There's no difference"],"answer":1,"explain":"That's what lets you show each row alongside its rank or running total."}

::quiz {"q":"Two books tie for first. What does DENSE_RANK give the next book?","options":["1","2","3","NULL"],"answer":1,"explain":"DENSE_RANK: 1, 1, 2. RANK would give 1, 1, 3."}

::quiz {"q":"How do you filter to the top 3 rows per group?","options":["WHERE ROW_NUMBER() <= 3","Compute ROW_NUMBER() in a CTE or subquery, then filter WHERE rn <= 3 outside it","HAVING COUNT(*) <= 3","LIMIT 3"],"answer":1,"explain":"Window functions are evaluated after WHERE, so filter in an outer step."}
