---
title: Schema Design and Normalization: Organizing Data So It Stays Correct
summary: How to turn a messy real-world problem into a clean set of tables, the update, insert and delete anomalies that bad designs cause, the normal forms explained without jargon, when to deliberately denormalize for speed, and practical choices like IDs, money, time zones, soft deletes and JSON columns.
---

::widget Scene {"title": "Normalization: one messy table becomes clean tables", "sub": "1NF → 2NF → 3NF on a course-enrolment table", "nodes": [{"id": "raw", "kind": "cells", "label": "enrolments", "x": 0.0, "y": 0.0, "values": ["student", "name", "course", "title", "teacher", "teacher_phone"]}, {"id": "s", "kind": "db", "label": "students", "x": 6.2, "y": 6.2, "color": "blue"}, {"id": "c", "kind": "db", "label": "courses", "x": 10.7, "y": 1.7, "color": "purple"}, {"id": "t", "kind": "db", "label": "teachers", "x": 15.2, "y": -2.8, "color": "orange"}, {"id": "e", "kind": "db", "label": "enrolments (student, course)", "x": 16.28, "y": 7.28, "color": "green"}], "links": [["e", "s"], ["e", "c"], ["c", "t"]], "metrics": [["nf", "Normal form"], ["rule", "Rule"], ["issue", "Problem fixed"]], "steps": [{"short": "Raw", "tag": "Start", "title": "One wide table, key = (student, course)", "body": "<p>A cell holds \"DBMS, OS\" for students taking two courses.</p>", "show": ["raw"], "metrics": {"nf": ["none"], "rule": ["-"], "issue": ["-"]}}, {"short": "1NF", "tag": "1NF", "title": "First normal form: one value per cell", "body": "<p>One row per student per course. No lists in cells, so you can query and index each value.</p>", "metrics": {"nf": ["1NF"], "rule": ["atomic values"], "issue": ["lists in cells"]}}, {"short": "Partial", "tag": "2NF", "title": "Student name depends only on student, part of the key", "body": "<p>So it repeats for every course they take. A partial dependency.</p>", "set": {"raw": {"marks": {"0": "blue", "1": "red"}, "ptr": {}}}, "metrics": {"issue": ["name repeats per course", "bad"]}}, {"short": "2NF", "tag": "2NF", "title": "Move it out: students(student, name), courses(course, title, teacher…)", "body": "<p>Every non-key column now depends on the whole key.</p>", "show": ["raw", "s", "c", "e"], "set": {"raw": {"marks": {}, "ptr": {}}}, "metrics": {"nf": ["2NF"], "rule": ["no partial dependencies"]}}, {"short": "Trans", "tag": "3NF", "title": "teacher_phone depends on teacher, not on the course", "body": "<p>A transitive dependency: course → teacher → phone. Change a phone, update every course they teach.</p>", "set": {"c": {"badge": "teacher_phone ✗"}}, "metrics": {"issue": ["phone repeats per course", "bad"]}}, {"short": "3NF", "tag": "3NF", "title": "Move teachers into their own table", "body": "<p>\"Every non-key column depends on the key, the whole key, and nothing but the key.\"</p>", "show": ["raw", "s", "c", "e", "t"], "set": {"c": {"badge": "FK teacher_id"}}, "metrics": {"nf": ["3NF", "good"], "rule": ["no transitive dependencies"]}}, {"short": "Join", "tag": "Cost", "title": "Reading a transcript now needs joins", "body": "<p>Fine for most apps, indexes make joins fast.</p>"}, {"short": "Denorm", "tag": "Trade-off", "title": "Denormalize deliberately for read-heavy hot paths", "body": "<p>e.g. store course_title on a cached report table, but then you own keeping copies in sync.</p>", "note": {"kind": "key", "text": "1NF: atomic values. 2NF: depend on the whole key. 3NF: depend only on the key. Normalize first; denormalize on purpose with a sync plan."}}]}

::widget Scene {"title": "Normalization: one messy table becomes four clean ones", "sub": "the update anomaly", "nodes": [{"id": "big", "kind": "cells", "label": "enrollments (everything)", "x": 3.1, "y": 3.1, "values": ["student", "course", "teacher", "office", "grade"]}], "metrics": [["problem", "Problem"]], "steps": [{"short": "Messy", "tag": "Problem", "title": "The teacher's office is repeated on 600 rows", "body": "<p>Move offices and you must update 600 rows, miss some and the data contradicts itself.</p>", "set": {"big": {"marks": {"3": "red"}, "ptr": {}}}, "metrics": {"problem": ["update anomaly", "bad"]}}, {"short": "Split", "tag": "Fix", "title": "Split by what each fact depends on", "body": "<p>students, courses, teachers(office), enrollments(student, course, grade).</p>", "set": {"big": {"marks": {"0": "blue", "1": "purple", "2": "orange", "3": "orange", "4": "green"}, "ptr": {}}}, "metrics": {"problem": ["each fact in one place", "good"]}, "note": {"kind": "key", "text": "Every column should depend on the key, the whole key and nothing but the key. Denormalize later only for measured speed needs."}}]}

## Three ways a bad table hurts you

> [!STORY] A college keeps one big table: `enrollments(student_name, student_phone, course_code, course_title, teacher_name, teacher_office, grade)`. Three things go wrong within a semester. A teacher moves offices, and the office must be changed on 600 rows, someone misses 40, and now the data disagrees with itself (**update anomaly**). A new course is created but can't be added until a student enrolls, because every row needs a student (**insertion anomaly**). The last student drops a course, the row is deleted, and the college forgets the course existed at all, along with its teacher (**deletion anomaly**).

All three come from one root cause: **facts about different things are mixed in one table**. **Normalization** is the systematic way of separating them.

## The normal forms, in plain words

You'll hear "1NF, 2NF, 3NF, BCNF". The idea behind all of them fits in one sentence, often quoted as: every non-key column should depend on **the key, the whole key, and nothing but the key**.

::widget Stepper {"type":"flow","cols":4,"title":"Normalizing the college table, step by step","what":"How the messy enrollments table is split into clean tables, one normal form at a time.","steps":["Press Play and follow the table being split.","At each step, find which fact was moved out and why.","Check the final design against the three anomalies in the story."],"nodes":[["The messy table","enrollments(student_name, student_phone, course_code, course_title, teacher_name, teacher_office, grade), with some rows holding 'phone1, phone2' in one cell."],["First normal form","One value per cell, no repeating groups. Phone numbers get their own table: student_phones(student_id, phone). Every table gets a key."],["Second normal form","No column should depend on only PART of a composite key. In enrollments(student_id, course_code, …), the course title depends only on course_code, so it moves to courses(course_code, title, teacher_id). Student details move to students."],["Third normal form","No column should depend on another non-key column. teacher_office depends on the teacher, not the course, so it moves to teachers(teacher_id, name, office)."],["The result","students, teachers, courses, and enrollments(student_id, course_code, grade). Each fact lives in exactly one place: moving an office is one update; a course can exist with no students; dropping the last student forgets nothing."]]}

> [!ANALOGY] A well-organized wardrobe: shirts on one shelf, socks in one drawer, shoes on the rack. You don't store a copy of your socks inside each pair of shoes. When you buy new socks, there's exactly one place they go.

**Boyce-Codd normal form (BCNF)** tightens third normal form for rare cases with overlapping candidate keys. In practice, aiming for **3NF** and thinking "does every fact live in one place?" gets you nearly all the way.

## When to break the rules on purpose

Normalized designs are correct and easy to change, but answering a question may need many joins. Sometimes you **denormalize** store a copy or a precomputed value, for speed:

- An `order_count` column on `customers`, updated whenever an order is placed, instead of counting every time a profile loads.
- A copy of the product name on each order line, because it should show what the customer saw at the time anyway.
- Separate **read-optimized** tables or materialized views for dashboards.

> [!WARN] Every copy is a promise to keep it in sync. Denormalize only when you've measured a real performance problem, and decide **how** the copy stays correct: in the same transaction, with a trigger, or by an asynchronous job that tolerates brief staleness.

Analytics warehouses deliberately use a **star schema**: a big central **fact** table (one row per sale) surrounded by **dimension** tables (date, product, store, customer), optimized for summing over billions of rows rather than for updates.

## Practical decisions every schema faces

### IDs

- **Auto-increment integers** (`BIGSERIAL`, `IDENTITY`) are small and fast but reveal how many rows you have (customer #1043 knows you have ~1,000 customers) and need a central counter.
- **UUIDs** can be generated anywhere without coordination and reveal nothing. Random UUIDs (v4) scatter inserts across an index; **time-ordered UUIDs (v7)** or ULIDs keep inserts in order and are usually the best default today.
- Always use 64-bit integers, never 32-bit, 2.1 billion runs out sooner than people expect.

### Money

Never store money in floating-point types: `0.1 + 0.2` is `0.30000000000000004`. Use `NUMERIC(12,2)` or store integer **paise/cents** (`amount_paise BIGINT`), plus a currency column if you handle more than one.

### Time

Store timestamps **with time zone** (PostgreSQL's `TIMESTAMPTZ`, effectively UTC) and convert to the user's local time only for display. Store a **date** (no time) for things like birthdays. Keep `created_at` and `updated_at` on most tables, you'll want them when debugging.

### Soft deletes and history

Instead of deleting, some tables set `deleted_at`. It allows undo and audits, but every query must remember to filter it out and unique constraints get tricky. For full history, consider a separate audit table or temporal tables.

### Enums and lookup tables

For a small fixed set (order status), use a `CHECK` constraint or enum type. For sets that business users edit (product categories), use a lookup table with a foreign key.

### JSON columns

PostgreSQL's `JSONB` lets you store flexible documents, great for truly variable attributes (product specs that differ per category) or raw payloads from other systems. But data the app filters, joins or validates belongs in real columns with constraints.

> [!EXAMPLE] **A clean e-commerce core.** `customers`, `addresses` (many per customer), `products`, `product_variants` (size/color, with SKU and price), `orders` (with status, totals and a copy of the shipping address at the time), `order_items` (variant, quantity, price paid), `payments` (many per order: attempts, refunds), `inventory` (per variant per warehouse). Each fact lives once, except deliberate snapshots of what the customer saw at purchase.

> [!RECAP]
> - Mixing facts about different things in one table causes **update, insertion and deletion anomalies**.
> - **Normalize** so every non-key column depends on the key, the whole key, and nothing but the key (≈ 3NF).
> - **Denormalize** deliberately for measured performance needs, with a plan for keeping copies correct; warehouses use **star schemas**.
> - Use 64-bit or time-ordered UUID keys, **integer or NUMERIC money** **UTC timestamps** and real columns for data you query (JSON for truly flexible parts).

> [!INTERVIEW] "Design the schema for X" is common in LLD and backend rounds. Identify entities and relationships, normalize, then mention where you'd denormalize and why, along with keys, money, time and indexes (next chapter).

::quiz {"q":"A teacher's office is stored on every enrollment row. What problem does this invite?","options":["Slower inserts","An update anomaly, changing the office requires updating many rows, and missing some leaves contradictory data","A deletion anomaly only","None"],"answer":1,"explain":"Each fact should live in exactly one place."}

::quiz {"q":"How should you store a product price?","options":["FLOAT","DOUBLE","NUMERIC(12,2) or integer paise/cents","TEXT"],"answer":2,"explain":"Floating point can't represent most decimal amounts exactly."}

::quiz {"q":"When is denormalization justified?","options":["Always, joins are slow","When a measured performance need exists and you have a plan to keep the copies consistent","Never","Only in NoSQL databases"],"answer":1,"explain":"Every copy is a synchronization promise."}
