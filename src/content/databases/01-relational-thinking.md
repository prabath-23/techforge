---
title: Relational Thinking: Tables, Keys and Relationships
summary: Why almost every company keeps its most important data in a relational database, what tables, rows, primary keys and foreign keys really are, how one-to-many and many-to-many relationships are modeled, and what a database gives you that a pile of files never could.
---

::widget Scene {"title": "Tables and keys: store each fact once", "sub": "from a messy spreadsheet to customers, orders and products", "nodes": [{"id": "sheet", "kind": "cells", "label": "spreadsheet row", "x": 0.0, "y": 0.0, "values": ["Asha", "asha@x.in", "Kettle", "₹900", "2"]}, {"id": "cu", "kind": "db", "label": "customers (id, name, email)", "x": 6.2, "y": 6.2, "color": "blue"}, {"id": "or", "kind": "db", "label": "orders (id, customer_id, date)", "x": 11.2, "y": 1.2, "color": "purple"}, {"id": "it", "kind": "db", "label": "order_items (order_id, product_id, qty)", "x": 16.2, "y": -3.8, "color": "orange"}, {"id": "pr", "kind": "db", "label": "products (id, name, price)", "x": 21.2, "y": -8.8, "color": "green"}], "links": [["or", "cu", {"label": "FK"}], ["it", "or", {"label": "FK"}], ["it", "pr", {"label": "FK"}]], "metrics": [["issue", "Problem"], ["fix", "Fix"]], "steps": [{"short": "Sheet", "tag": "Start", "title": "Orders tracked in one spreadsheet", "body": "<p>Every row repeats the customer's name, email, the product name and its price.</p>", "show": ["sheet"], "metrics": {"issue": ["-"], "fix": ["-"]}}, {"short": "Update", "tag": "Anomaly", "title": "Asha changes her email", "body": "<p>It must be updated in 40 rows. Miss one and the data disagrees with itself.</p>", "set": {"sheet": {"marks": {"1": "red"}, "ptr": {}}}, "metrics": {"issue": ["update anomaly", "bad"]}}, {"short": "Delete", "tag": "Anomaly", "title": "Delete her only order and her contact details vanish too", "body": "<p>And a new product can't be recorded until someone orders it.</p>", "metrics": {"issue": ["delete / insert anomalies", "bad"]}}, {"short": "Entities", "tag": "Model", "title": "Split by \"things\": customers, products, orders", "body": "<p>Each table describes one kind of thing; each row is one of them.</p>", "show": ["sheet", "cu", "or", "pr"], "set": {"sheet": {"marks": {}, "ptr": {}}}, "metrics": {"fix": ["one table per entity"]}}, {"short": "PK", "tag": "Keys", "title": "Give each row a primary key", "body": "<p>A stable id that never changes, even if the email does. Unique and not null.</p>", "set": {"cu": {"badge": "PK id"}, "pr": {"badge": "PK id"}, "or": {"badge": "PK id"}}, "metrics": {"fix": ["primary keys"]}}, {"short": "FK", "tag": "Relationships", "title": "Link with foreign keys", "body": "<p>orders.customer_id references customers.id. The database refuses an order for a customer that doesn't exist.</p>", "set": {"or": {"badge": "FK → customers"}}, "metrics": {"fix": ["referential integrity", "good"]}}, {"short": "M2M", "tag": "Many-to-many", "title": "An order has many products; a product is in many orders", "body": "<p>A junction table order_items(order_id, product_id, qty) represents many-to-many.</p>", "show": ["sheet", "cu", "or", "it", "pr"], "metrics": {"fix": ["junction table"]}}, {"short": "Price", "tag": "History", "title": "Store the price paid in order_items", "body": "<p>If the product price changes next month, old orders must still show what the customer paid. That's a different fact from the current price.</p>", "set": {"it": {"badge": "+ unit_price"}}}, {"short": "Once", "tag": "Result", "title": "Asha's email now lives in exactly one row", "body": "<p>Change it once; every query sees the new value via a JOIN.</p>", "set": {"cu": {"badge": "email: one place"}}, "metrics": {"issue": ["none", "good"]}, "note": {"kind": "key", "text": "Store each fact once, identify rows with stable keys, connect tables with foreign keys, and use junction tables for many-to-many."}}]}


## The spreadsheet that ate the company

> [!STORY] A small online bookshop starts with one spreadsheet: each row is an order, with the customer's name, email, address, the book title, its price and the date. It works for a year. Then a customer changes her email, and it's wrong on 40 old rows. A book's price changes, and nobody knows what customers actually paid. Two staff edit the file at once and one person's changes vanish. Someone asks "which customers bought more than three books this year?" and it takes an afternoon. Every one of these problems is solved by thinking about the data **relationally**.

In 1970, an IBM researcher named **Edgar F. Codd** proposed storing data as simple **tables** (he called them relations) and asking questions of them with a high-level language, instead of writing programs that walk through files. Fifty years later, PostgreSQL, MySQL, SQL Server, Oracle and SQLite all follow his idea, and SQLite alone runs on every phone in the world.

## Tables, rows and columns

- A **table** holds one kind of thing: customers, books, orders.
- Each **row** is one instance: one customer.
- Each **column** is one fact about it, with a **type**: `email TEXT`, `price NUMERIC(10,2)`, `created_at TIMESTAMP`.

> [!ANALOGY] A well-run library's card catalog. One drawer of cards for books, one for authors, one for members. Each card has the same fields. Instead of writing the author's whole biography on every book card, the book card just says "author #217", and you look up card #217 in the authors drawer.

The key insight from the bookshop: **store each fact exactly once**. The customer's email lives in one row of `customers`. Orders refer to the customer instead of copying their details.

## Keys: how rows find each other

- A **primary key** uniquely identifies each row, usually an ID column (`customer_id`). No two rows can share it, and it never changes.
- A **foreign key** is a column that holds another table's primary key: `orders.customer_id` points to `customers.customer_id`. The database can **enforce** it: you can't create an order for a customer who doesn't exist, or delete a customer who still has orders (unless you say what should happen).

```sql
CREATE TABLE customers (
  customer_id BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE
);

CREATE TABLE orders (
  order_id    BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> [!NOTE] **Natural vs surrogate keys.** You could use the email as the primary key, it's unique. But emails change, and every table that refers to it would need updating. A meaningless generated ID (a **surrogate key**) never needs to change. Keep the email unique with a `UNIQUE` constraint instead.

## The three kinds of relationships

::widget Stepper {"type":"flow","cols":3,"title":"How relationships between tables are modeled","what":"The three shapes relationships take, using the bookshop's data, and how each is stored.","steps":["Press Play and read each relationship.","For each, find which table holds the foreign key.","Notice that many-to-many always needs a table in the middle."],"nodes":[["One-to-one","Each customer has at most one loyalty card. Store card details in the customers table, or in a separate table whose primary key is also a foreign key to customers. Rare in practice."],["One-to-many","One customer places many orders; each order belongs to one customer. The foreign key goes on the 'many' side: orders.customer_id. The most common relationship."],["Many-to-many","An order contains many books, and a book appears in many orders. Neither side can hold a single foreign key, so add a 'join table' in the middle: order_items(order_id, book_id, quantity, price_paid)."]]}

The join table often carries facts that belong to the **relationship** itself, like the **price paid** which is exactly what the spreadsheet lost when book prices changed:

```sql
CREATE TABLE order_items (
  order_id   BIGINT REFERENCES orders(order_id),
  book_id    BIGINT REFERENCES books(book_id),
  quantity   INT NOT NULL CHECK (quantity > 0),
  price_paid NUMERIC(10,2) NOT NULL,      -- the price at the time of purchase
  PRIMARY KEY (order_id, book_id)          -- a composite key: one row per book per order
);
```

## Constraints: rules the database enforces for you

- `NOT NULL`, a value is required.
- `UNIQUE`, no duplicates (no two accounts with the same email).
- `CHECK`, a condition (`quantity > 0`, `price >= 0`).
- `FOREIGN KEY`, the referenced row must exist.

> [!EXAMPLE] A bug in the app sends `quantity = -3`. Without a constraint, a negative order silently enters the data and corrupts every sales report. With `CHECK (quantity > 0)`, the database rejects it and the bug is found immediately. **Constraints are tests that run on every write, forever.**

## What a database gives you that files don't

- **Questions in one line:** "customers with more than three orders this year" is a short SQL query (next chapter), not an afternoon.
- **Many users at once** without lost updates, thanks to **transactions** (chapter 6).
- **Durability:** once it says "saved", a crash won't lose it (chapter 7).
- **Speed at scale** with **indexes** (chapter 5).
- **Integrity** through constraints.

> [!RECAP]
> - Relational databases store data in **tables** of rows and typed columns; each fact is stored **once**.
> - A **primary key** identifies a row; a **foreign key** points to a row in another table, and the database enforces it.
> - **One-to-many**: foreign key on the many side. **Many-to-many**: a **join table** which can hold facts about the relationship.
> - **Constraints** (NOT NULL, UNIQUE, CHECK, foreign keys) are rules enforced on every write.

> [!INTERVIEW] LLD and design interviews often start with "model the data". Identify entities, their keys, relationship types and where foreign keys go, and mention constraints that protect integrity.

::quiz {"q":"Students take many courses and courses have many students. How do you model it?","options":["A course_id column in students","A students list column in courses","A join table enrollments(student_id, course_id)","Two separate databases"],"answer":2,"explain":"Many-to-many always needs a table in the middle."}

::quiz {"q":"Why store price_paid in order_items instead of looking up the book's current price?","options":["It's faster","The book's price changes; the order must record what was actually paid","Prices can't be foreign keys","It isn't needed"],"answer":1,"explain":"It's a fact about the purchase, not about the book."}

::quiz {"q":"Why prefer a generated ID over email as a primary key?","options":["Emails are too long","Emails can change, and every reference would need updating","IDs are encrypted","Emails can't be unique"],"answer":1,"explain":"Primary keys should never change; keep email UNIQUE instead."}
