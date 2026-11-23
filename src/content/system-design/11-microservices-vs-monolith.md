---
title: Microservices vs Monolith: and How to Split
summary: When one deployable application is the right choice and when splitting into services pays off, the real costs of microservices, the modular monolith middle ground, finding service boundaries with domain-driven design, data ownership and avoiding the distributed monolith, communication styles, sagas for cross-service transactions, and migrating safely with the strangler fig pattern.
---

::widget Scene {"title": "Sagas: a transaction across three services", "sub": "an order that reserves stock, charges a card and books delivery, and how it undoes itself", "nodes": [{"id": "c", "kind": "phone", "label": "Customer", "x": 3.72, "y": 3.72}, {"id": "orc", "kind": "cube", "label": "Order saga (orchestrator)", "x": 7.92, "y": -0.48, "color": "orange"}, {"id": "inv", "kind": "server", "label": "Inventory", "x": 8.38, "y": -9.62, "color": "blue"}, {"id": "pay", "kind": "server", "label": "Payments", "x": 12.72, "y": -5.28, "color": "green"}, {"id": "shp", "kind": "server", "label": "Shipping", "x": 17.06, "y": -0.94, "color": "purple"}, {"id": "ob", "kind": "queue", "label": "Outbox → broker", "x": 13.5, "y": 5.1, "color": "pink"}], "links": [["c", "orc"], ["orc", "inv"], ["orc", "pay"], ["orc", "shp"], ["orc", "ob", {"dashed": true}]], "metrics": [["order", "Order state"], ["done", "Completed steps"], ["note", "Note"]], "steps": [{"short": "Problem", "tag": "Problem", "title": "Each service owns its own database", "body": "<p>There is no single database transaction spanning inventory, payments and shipping. Two-phase commit across services is slow and fragile.</p>", "show": ["c", "inv", "pay", "shp"], "metrics": {"order": ["-"], "done": ["-"], "note": ["no global transaction"]}}, {"short": "Saga", "tag": "Idea", "title": "A saga: a sequence of local transactions, each with a compensating undo", "body": "<p>Reserve stock ↔ release stock. Charge card ↔ refund. Book courier ↔ cancel booking.</p>", "show": ["c", "orc", "inv", "pay", "shp"], "focus": ["orc"]}, {"short": "Start", "tag": "Step 0", "title": "Order created as PENDING", "body": "<p>The orchestrator persists the saga's state so it can resume after a crash.</p>", "flow": [["c", "orc", "#3b82f6", "place order"]], "set": {"orc": {"badge": "PENDING"}}, "metrics": {"order": ["PENDING"]}}, {"short": "Reserve", "tag": "Step 1", "title": "Reserve 2 units in inventory", "body": "<p>Local transaction in the inventory database. Success.</p>", "flow": [["orc", "inv", "#3b82f6", "reserve ×2"], ["inv", "orc", "#22c55e", "ok"]], "set": {"inv": {"badge": "reserved"}}, "metrics": {"done": ["reserve"]}}, {"short": "Charge", "tag": "Step 2", "title": "Charge ₹2,400", "body": "<p>Payments uses an idempotency key derived from the order ID, so retries can't double-charge.</p>", "flow": [["orc", "pay", "#3b82f6", "charge"], ["pay", "orc", "#22c55e", "ok"]], "set": {"pay": {"badge": "charged"}}, "metrics": {"done": ["reserve, charge"]}}, {"short": "Fail", "tag": "Step 3", "title": "Shipping fails: no courier serves this pincode", "body": "<p>We can't \"roll back\" the other services' committed transactions. We must undo them with new actions.</p>", "flow": [["orc", "shp", "#3b82f6", "book"], ["shp", "orc", "#ef4444", "unavailable"]], "set": {"shp": {"badge": "failed"}}, "metrics": {"note": ["need to compensate", "bad"]}}, {"short": "Refund", "tag": "Compensate", "title": "Compensate in reverse order: refund the payment", "body": "<p>Compensations must be retried until they succeed, and be idempotent.</p>", "flow": [["orc", "pay", "#f59e0b", "refund"]], "set": {"pay": {"badge": "refunded"}}}, {"short": "Release", "tag": "Compensate", "title": "Then release the reserved stock", "body": "<p>Other customers can buy it again.</p>", "flow": [["orc", "inv", "#f59e0b", "release"]], "set": {"inv": {"badge": "released"}}}, {"short": "Cancel", "tag": "End", "title": "Order marked CANCELLED; the customer is told why", "body": "<p>The system is consistent again, eventually. In between, other users could briefly see the stock as reserved.</p>", "flow": [["orc", "c", "#f59e0b", "cancelled: no delivery"]], "set": {"orc": {"badge": "CANCELLED"}}, "metrics": {"order": ["CANCELLED"], "note": ["consistent again", "good"]}}, {"short": "Outbox", "tag": "Reliability", "title": "Transactional outbox: no lost events", "body": "<p>Each service writes its state change AND the outgoing event in the same local transaction; a relay publishes the outbox to the broker. No \"saved but never announced\".</p>", "show": ["c", "orc", "inv", "pay", "shp", "ob"], "flow": [["orc", "ob", "#ec4899", "OrderCancelled"]]}, {"short": "Choreo", "tag": "Variant", "title": "Choreography: no orchestrator, services react to each other's events", "body": "<p>Fewer central parts, but the flow is hard to see once there are many steps. Orchestration is easier to reason about and monitor.</p>", "note": {"kind": "key", "text": "Sagas replace distributed transactions with local steps + compensations. Make every step and compensation idempotent, persist saga state, and publish events with an outbox."}}]}

::widget Scene {"title": "Service discovery: finding a service that keeps moving", "sub": "pods come and go; names stay", "nodes": [{"id": "o", "kind": "server", "label": "Orders", "x": 3.1, "y": 3.1, "color": "blue"}, {"id": "reg", "kind": "cache", "label": "Registry / DNS", "x": 2.95, "y": -6.05, "color": "green"}, {"id": "p1", "kind": "server", "label": "pricing-1", "x": 9.0, "y": -9.0, "color": "purple"}, {"id": "p2", "kind": "server", "label": "pricing-2", "x": 15.2, "y": -2.8, "color": "purple"}], "links": [["o", "reg", {"dashed": true}], ["o", "p1"], ["o", "p2"], ["p1", "reg", {"dashed": true}], ["p2", "reg", {"dashed": true}]], "metrics": [["inst", "Healthy pricing instances"]], "steps": [{"short": "Register", "tag": "Register", "title": "Instances register themselves (or Kubernetes does it)", "body": "<p>pricing-1 and pricing-2 announce their IPs and keep their entries alive with health checks.</p>", "flow": [["p1", "reg", "#22c55e", "I'm at 10.0.4.7"], ["p2", "reg", "#22c55e", "10.0.5.2"]], "metrics": {"inst": ["2"]}}, {"short": "Lookup", "tag": "Discover", "title": "Orders asks for \"pricing\" and gets current addresses", "body": "<p>In Kubernetes this is just DNS: <code>pricing.svc.cluster.local</code>.</p>", "flow": [["o", "reg", "#3b82f6", "pricing?"], ["o", "p2", "#f59e0b", "call"]]}, {"short": "Change", "tag": "Update", "title": "pricing-1 dies; the registry drops it automatically", "body": "<p>Callers never use hard-coded IPs, so scaling and failures are invisible to them.</p>", "set": {"p1": {"dim": true}}, "metrics": {"inst": ["1"]}, "note": {"kind": "key", "text": "Discovery + health checks + load balancing are what make dynamic fleets usable."}}]}


## Two cautionary tales

> [!STORY] **Tale one:** a fast-growing startup's single Rails application has 300 engineers committing to it. Deploys take two hours, a bug in the recommendations code takes down checkout, and nobody dares touch the billing module. Splitting it into services lets teams ship independently, and saves the company. **Tale two:** a team of eight engineers, inspired by Netflix, starts a new product as 40 microservices. Six months later they spend most of their time on Kubernetes manifests, distributed tracing, versioning internal APIs and debugging network timeouts between services that could have been function calls. They merge everything back into one application. In 2023, Amazon Prime Video publicly described cutting the cost of one monitoring system by 90% by moving it **from** distributed microservices **to** a single process.

Both are right. Architecture should follow **team size, scale and how independently parts of the system need to change** not fashion.

## The options

::widget Stepper {"type":"flow","cols":3,"title":"The spectrum from monolith to microservices","what":"Three common architectures, from one deployable unit to many independent services. Each box describes the shape, what it's good at, and what it costs.","steps":["Press Play and compare the three.","For each, imagine 10 engineers, then 500 engineers working on it.","Find the option that keeps strong boundaries without network calls."],"nodes":[["Monolith","One codebase, one deployable, usually one database. Simple to build, test, debug and deploy; function calls are fast and transactions are easy. Pain appears with many teams: coupled code, slow builds, risky deploys, one scaling unit."],["Modular monolith","Still one deployable, but organized into strongly separated modules (billing, catalog, orders) with explicit interfaces and their own tables, and rules forbidding reaching into another module's internals. Keeps the simplicity, prepares for splitting later. Shopify runs one of the largest Rails apps this way."],["Microservices","Many small services, each owned by one team, deployed independently, each with its own data store, talking over the network. Teams move independently and scale parts separately, at the cost of distributed-systems complexity everywhere."]]}

## What microservices really cost

> [!ANALOGY] A monolith is a big restaurant kitchen: crowded when it grows, but the chefs can shout to each other and hand dishes across the counter. Microservices are separate food trucks around a square: each can open, close, change its menu and grow independently, but now every combined order needs runners between trucks, someone to handle a truck being closed, and a way to bill the customer once.

Each service boundary replaces a function call with a network call, which brings:

- **Failure handling:** timeouts, retries, circuit breakers, partial outages (chapter on reliability).
- **Latency:** a page that fans out to 20 services pays network costs on each, and its p99 is dragged down by the slowest.
- **Data consistency:** no more single database transaction across billing and orders (sagas below).
- **Operational load:** many deploy pipelines, dashboards, alerts, on-call rotations, dependency upgrades.
- **Observability:** debugging requires distributed tracing (Cloud track, chapter 7).
- **Testing:** contract tests and environments where many services run together.

**Benefits** that justify those costs:

- **Independent deployment** by independent teams, the main reason, tied to organization size.
- **Independent scaling** and technology choices where they genuinely differ (a GPU-heavy ML service vs a CRUD service).
- **Fault isolation:** a crash in recommendations doesn't kill checkout (if designed well).

> [!NOTE] **Conway's law:** systems end up mirroring the communication structure of the organization that builds them. Service boundaries work best when they match team boundaries, one team owns a service end to end. Microservices are as much an organizational decision as a technical one.

**Rule of thumb:** start with a well-structured (modular) monolith. Split out a service when there's a clear reason, a team that needs to deploy independently, a component with very different scaling or reliability needs, or a boundary that's already clean.

## Finding good boundaries

Bad boundaries are worse than none. Split by **business capability** not by technical layer:

- ❌ "database service", "validation service", "email-formatting service", every feature touches all of them.
- ✅ "catalog", "pricing", "orders", "payments", "shipping", "notifications", each changes for its own business reasons.

**Domain-driven design** gives tools for this: a **bounded context** is an area where a term has one precise meaning ("product" in the catalog means a description and photos; in shipping, a weight and size). Each bounded context is a candidate service or module.

Signs a boundary is right: most changes stay inside one service; services talk through a few clear APIs or events; each can be understood and tested on its own.

## Data ownership: avoid the distributed monolith

The most important rule: **each service owns its data**. Other services can't read or write its tables directly, only through its API or events.

> [!WARN] **The distributed monolith** services that share a database, must be deployed together, or call each other synchronously in long chains, has all the costs of microservices and none of the benefits. If changing one service's table breaks three others, you haven't really split anything.

Patterns for data that other services need:

- **Ask the owner** through its API (simple, but adds runtime dependency).
- **Subscribe to events** (`OrderPlaced`, `PriceChanged`) and keep a local read-only copy of what you need, loose coupling, eventual consistency.
- **Transactional outbox:** to publish events reliably, write the event into an `outbox` table **in the same database transaction** as the business change; a relay publishes it to Kafka afterwards. This avoids "saved to the DB but the event was lost" (or vice versa).

## How services talk

- **Synchronous** (REST/gRPC): simple request-response, but couples availability, if pricing is down, checkout fails. Use timeouts, retries with backoff, circuit breakers and fallbacks.
- **Asynchronous** (events/queues, chapter on messaging): the sender doesn't wait; services keep working when others are down; natural for "something happened" notifications. Harder to trace and reason about ordering.

Prefer **events for propagating facts** and **synchronous calls for queries that need an immediate answer**. Avoid long synchronous call chains.

## Transactions across services: sagas

Placing an order touches orders, payments and inventory, each with its own database. There's no shared transaction. A **saga** breaks the work into local transactions, each with a **compensating action** that undoes it if a later step fails.

::widget Stepper {"type":"flow","cols":4,"title":"An order saga with compensation","what":"Placing an order across three services, each with its own database. If a later step fails, earlier steps are undone with compensating actions.","steps":["Press Play to follow the happy path.","Then read the failure box: what gets undone, and in what order?","Notice that customers can briefly see intermediate states like 'pending'."],"nodes":[["1. Orders: create order (PENDING)","Local transaction in the orders database. Emits OrderCreated."],["2. Inventory: reserve items","Local transaction. Emits ItemsReserved, or ReservationFailed."],["3. Payments: charge card","Local transaction with an idempotency key. Emits PaymentSucceeded, or PaymentFailed."],["4. Orders: mark CONFIRMED","The saga completes; shipping can start."],["If payment fails…","Compensate in reverse: Inventory releases the reservation; Orders marks the order CANCELLED and tells the customer. Each compensation must itself be idempotent and retryable."],["Choreography vs orchestration","Services can react to each other's events (choreography, simple for short flows), or a central orchestrator (e.g. Temporal, AWS Step Functions) can drive the steps and compensations explicitly (clearer for long or complex flows)."]]}

Sagas give **eventual** consistency: design the UI and business rules for intermediate states ("payment pending"), and make every step idempotent.

## Migrating: the strangler fig

Rewriting a monolith from scratch ("the big bang rewrite") is notoriously risky. The **strangler fig** pattern, named after a vine that slowly grows around a tree until it replaces it, migrates gradually:

1. Put a **routing layer** (gateway or proxy) in front of the monolith.
2. Build one new capability as a service, or extract one module with a clean boundary.
3. Route that functionality's traffic to the new service; keep everything else on the monolith.
4. Migrate its data ownership (often via dual-writes or change data capture, then cut over).
5. Repeat, one slice at a time, until the monolith is small enough to retire, or until the remaining core is fine as it is.

> [!RECAP]
> - **Monoliths** are simple and fast to build; **microservices** enable independent teams and scaling at the cost of distributed complexity. A **modular monolith** is often the best start.
> - Split by **business capability / bounded context** aligned with **teams** (Conway's law).
> - **Each service owns its data**; avoid the **distributed monolith**; share data via APIs, events and the **transactional outbox**.
> - Prefer **events** for propagating facts, synchronous calls for immediate queries, with timeouts and circuit breakers.
> - Cross-service workflows use **sagas** with compensating actions.
> - Migrate gradually with the **strangler fig** pattern.

> [!INTERVIEW] Expect "would you use microservices here?", answer with team size, deployment independence, scaling differences and data ownership rather than a reflexive yes. Be ready to explain sagas, the outbox pattern and how you'd break up a monolith.

::quiz {"q":"Several 'microservices' share one database and must be deployed together. What is this?","options":["A modular monolith","A distributed monolith, microservice costs without the benefits","Event sourcing","A saga"],"answer":1,"explain":"Each service should own its data and deploy independently."}

::quiz {"q":"What problem does the transactional outbox pattern solve?","options":["Slow queries","Saving a business change and publishing its event atomically, so neither happens without the other","Rate limiting","Service discovery"],"answer":1,"explain":"The event is written in the same DB transaction and relayed afterwards."}

::quiz {"q":"In a saga, what happens if step 3 fails?","options":["The database rolls back all services automatically","Compensating actions undo the completed earlier steps","Nothing, it's ignored","The whole system restarts"],"answer":1,"explain":"There's no distributed transaction; each step has an undo."}
