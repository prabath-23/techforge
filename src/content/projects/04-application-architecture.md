---
title: Application Architecture: Layers, Clean and Hexagonal Architecture, and Domain-Driven Design
summary: How to structure the code of a real backend application: layered architecture (controller, service, repository) and its responsibilities, DTOs vs entities, validation and error handling, transactions at the service layer, clean and hexagonal architecture with ports and adapters, dependency direction, domain-driven design basics (bounded contexts, aggregates, domain events), package-by-feature, modular monoliths, and how to evolve architecture.
---

::widget Scene {"title": "Following \"place order\" through a layered, hexagonal backend", "sub": "which layer does what, and which way dependencies point", "nodes": [{"id": "http", "kind": "laptop", "label": "HTTP client", "x": 3.72, "y": 3.72}, {"id": "ctl", "kind": "cube", "label": "Controller (adapter in)", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "svc", "kind": "cube", "label": "PlaceOrder use case (application)", "x": 11.72, "y": -4.28, "color": "purple"}, {"id": "dom", "kind": "cube", "label": "Order aggregate (domain)", "x": 5.52, "y": -10.48, "color": "green"}, {"id": "port", "kind": "doc", "label": "Ports: OrderRepository, PaymentGateway", "x": 15.72, "y": -8.28, "color": "orange"}, {"id": "db", "kind": "db", "label": "JPA adapter → Postgres", "x": 16.62, "y": -15.38, "color": "teal"}, {"id": "pay", "kind": "cloud", "label": "Payment adapter → provider", "x": 23.13, "y": -8.87, "color": "pink"}], "links": [["http", "ctl"], ["ctl", "svc"], ["svc", "dom"], ["svc", "port"], ["db", "port", {"dashed": true, "label": "implements"}], ["pay", "port", {"dashed": true, "label": "implements"}]], "metrics": [["layer", "Layer"], ["job", "Responsibility"], ["knows", "Depends on"]], "steps": [{"short": "Req", "tag": "Request", "title": "POST /orders with JSON arrives", "body": "<p>The outside world speaks HTTP and JSON; the core of the app shouldn't care.</p>", "show": ["http"], "metrics": {"layer": ["-"], "job": ["-"], "knows": ["-"]}}, {"short": "Ctl", "tag": "Controller", "title": "Controller: parse and validate the request DTO, call the use case, map the result to a response", "body": "<p>No business rules here. Converts HTTP ↔ application language; maps exceptions to status codes.</p>", "show": ["http", "ctl"], "flow": [["http", "ctl", "#3b82f6", "CreateOrderRequest"]], "metrics": {"layer": ["web / adapter in"], "job": ["HTTP, validation, mapping"], "knows": ["use case interface"]}}, {"short": "UseCase", "tag": "Application", "title": "The use case (service) orchestrates: load, decide, save, publish", "body": "<p>Transaction boundary lives here. It coordinates but delegates business rules to the domain.</p>", "show": ["http", "ctl", "svc"], "flow": [["ctl", "svc", "#a855f7", "placeOrder(cmd)"]], "metrics": {"layer": ["application"], "job": ["orchestration, transactions"], "knows": ["domain + ports"]}}, {"short": "Domain", "tag": "Domain", "title": "The Order aggregate enforces rules: max 50 items, can't pay twice, totals", "body": "<p>Plain Java objects, no Spring, no JPA, no HTTP. Easy to unit-test.</p>", "show": ["http", "ctl", "svc", "dom"], "flow": [["svc", "dom", "#22c55e", "Order.place(items)"]], "metrics": {"layer": ["domain"], "job": ["business rules, invariants"], "knows": ["nothing outside"]}}, {"short": "Ports", "tag": "Ports", "title": "The use case talks to interfaces it owns: OrderRepository, PaymentGateway", "body": "<p>Ports describe what the application needs in its own language.</p>", "show": ["http", "ctl", "svc", "dom", "port"], "flow": [["svc", "port", "#f59e0b", "save, charge"]], "metrics": {"layer": ["ports"], "job": ["contracts"], "knows": ["domain types"]}}, {"short": "Adapters", "tag": "Adapters", "title": "Adapters implement the ports: JPA repository, payment-provider client", "body": "<p>Dependencies point INWARD: infrastructure depends on the core, never the reverse.</p>", "show": ["http", "ctl", "svc", "dom", "port", "db", "pay"], "flow": [["db", "port", "#14b8a6", "implements"], ["pay", "port", "#ec4899", "implements"]], "metrics": {"layer": ["adapters out"], "job": ["DB, APIs, queues"], "knows": ["ports + tech"]}}, {"short": "Swap", "tag": "Benefit", "title": "Swap the payment provider or test with fakes, the core doesn't change", "body": "<p>Use-case tests run with in-memory adapters in milliseconds.</p>", "note": {"kind": "notice", "text": "This is the Dependency Inversion Principle applied to the whole application."}}, {"short": "Cost", "tag": "Trade-off", "title": "Don't over-engineer a CRUD app", "body": "<p>For simple CRUD, controller → service → repository is plenty. Add ports and a rich domain where business rules are complex or integrations change.</p>", "note": {"kind": "key", "text": "Controllers translate, use cases orchestrate, the domain decides, adapters talk to the world, and dependencies always point inward toward the domain."}}]}

## The 3,000-line service class

> [!STORY] A team's `OrderService` grows to 3,000 lines: HTTP status codes, SQL, pricing rules, email templates and payment-provider JSON all mixed together. Changing the payment provider means editing pricing code; testing a discount rule requires a database and a mock HTTP server. Nothing is wrong with Spring or Java, the problem is **application architecture**: where each kind of code lives and what it's allowed to depend on.

## Layered architecture: the baseline

Most backends start with three layers:

| Layer | Responsibility | Must not |
|---|---|---|
| **Controller / web** | HTTP routing, request parsing and validation, auth checks, mapping to/from DTOs, status codes | contain business rules or SQL |
| **Service / application** | use cases: orchestrate domain logic, transactions, calls to other systems | know about HTTP or JSON |
| **Repository / data access** | load and store data | contain business decisions |

Plus **domain/model** classes and **configuration**.

```java
@RestController
@RequestMapping("/orders")
class OrderController {
    private final PlaceOrder placeOrder;
    @PostMapping
    ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest req, @AuthenticationPrincipal User user) {
        Order order = placeOrder.handle(new PlaceOrderCommand(user.id(), req.items()));
        return ResponseEntity.status(201).body(OrderResponse.from(order));
    }
}
```

## DTOs vs entities

- **DTOs** (request/response records) define the API contract.
- **Entities** map to database tables (JPA).
- **Domain objects** hold business rules (sometimes the same class as the entity in simpler apps).

Don't return JPA entities directly from controllers: it leaks internal fields, couples the API to the schema, and triggers lazy-loading surprises during JSON serialisation. Map explicitly (MapStruct or hand-written `from()` methods).

## Validation and errors

- **Input validation** at the edge with Bean Validation (`@NotBlank`, `@Size`, `@Valid`).
- **Business validation** in the domain ("order already paid"), throw domain exceptions.
- **One global error handler** (`@RestControllerAdvice`) maps exceptions to consistent responses (e.g. RFC 9457 problem details) with the right status codes, and logs unexpected errors with a correlation ID.

## Transactions

Put `@Transactional` on **application services** (use cases), one use case, one transaction. Not on controllers (too broad), not on repositories alone (too narrow). Keep external calls (payments, emails) outside the transaction or after commit, using the outbox pattern for reliable events.

## Clean / hexagonal architecture

Layering alone often lets the core depend on frameworks (services importing JPA and HTTP clients). **Hexagonal architecture** (ports and adapters) and **Clean Architecture** fix the **dependency direction**:

- The **domain** (entities, value objects, rules) depends on nothing.
- The **application** (use cases) depends on the domain and on **ports** interfaces it defines for what it needs (`OrderRepository`, `PaymentGateway`, `EventPublisher`).
- **Adapters** implement ports using real technology (JPA, Kafka, REST clients) and drive the application (controllers, message listeners, schedulers).
- **Dependencies always point inward.** Frameworks are details at the edge.

Benefits: domain and use-case tests without databases; swap infrastructure without touching rules; clearer reasoning. Costs: more types and mapping. Use it where the domain is rich or integrations change; skip it for thin CRUD.

## Domain-driven design basics

- **Ubiquitous language:** code uses the business's terms (an `Order` is *placed*, *paid*, *shipped*).
- **Bounded contexts:** a large business splits into areas with their own models (Ordering, Billing, Shipping); "Customer" can mean different things in each. Contexts communicate via APIs or events, often the seams for modules or services.
- **Entities** (identity over time), **value objects** (defined by values, immutable: `Money`, `Address`).
- **Aggregates:** a cluster of objects changed together through one root (`Order` with its `OrderLines`), enforcing invariants inside one transaction. Reference other aggregates by ID.
- **Domain events:** `OrderPlaced`, published after a change for other parts of the system to react.
- **Repositories** per aggregate root.

## Package by feature

```
com.acme.shop
  ordering/      (domain, application, adapters for ordering)
  billing/
  catalog/
  shared/        (small, genuinely shared kernel)
```

Organise by **feature/bounded context** rather than by technical layer (`controllers/`, `services/`, `repositories/` across the whole app). Related code stays together, and boundaries become visible.

## Modular monolith

One deployable, internally split into modules with explicit public APIs and enforced boundaries (ArchUnit tests, Spring Modulith, Java modules). Modules communicate through interfaces or in-process events. You get most of the structure of microservices without the network, and can extract a module into a service later if needed (System Design chapter 11).

## Evolving architecture

- Start simple; introduce ports and richer domain models where complexity appears.
- Enforce rules with tests (ArchUnit: "domain must not depend on Spring").
- Record decisions in ADRs (Practices chapter 7).
- Refactor toward boundaries continuously rather than in big rewrites.

> [!RECAP]
> - Layers: controller (HTTP + mapping), service/use case (orchestration + transactions), repository (data).
> - DTOs for the API, entities for persistence, domain objects for rules; map explicitly.
> - Validate at the edge, enforce rules in the domain, handle errors globally.
> - **Hexagonal/Clean:** domain at the centre, ports defined by the application, adapters at the edge, dependencies inward.
> - DDD: bounded contexts, aggregates, value objects, domain events, ubiquitous language.
> - Package by feature; modular monolith before microservices.

> [!INTERVIEW] "How do you structure a Spring Boot service?", "Why not return entities from controllers?", "Where do transactions belong?", "Explain hexagonal architecture", "What is an aggregate?", "Layered vs clean architecture?", "Modular monolith vs microservices?"

::quiz {"q": "Where should the @Transactional boundary usually be?", "options": ["On controllers", "On application services / use cases", "On every repository method only", "On DTOs"], "answer": 1, "explain": "One use case, one transaction."}

::quiz {"q": "In hexagonal architecture, which way do dependencies point?", "options": ["From domain to database", "Inward: adapters depend on ports and the domain; the domain depends on nothing", "Both ways", "Outward to frameworks"], "answer": 1, "explain": "Frameworks are details at the edge."}

::quiz {"q": "Why not return JPA entities directly from REST controllers?", "options": ["JSON can't serialise them", "It couples the API to the schema, can leak fields and trigger lazy-loading issues", "They are too fast", "Controllers can't access them"], "answer": 1, "explain": "Use DTOs for the API contract."}
