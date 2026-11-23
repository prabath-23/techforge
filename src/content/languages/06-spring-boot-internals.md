---
title: Spring Boot Internals — Dependency Injection, Beans, Proxies, Transactions and Requests
summary: What really happens in a Spring Boot service: auto-configuration, the application context and bean lifecycle, dependency injection and scopes, AOP proxies and why @Transactional on a private or self-invoked method does nothing, transaction propagation, the request path through filters and DispatcherServlet, JPA and the N+1 problem, connection pools, and production readiness with Actuator.
---

::widget Scene {"title": "A request through a Spring Boot service", "sub": "POST /orders from Tomcat thread to committed transaction", "nodes": [{"id": "c", "kind": "laptop", "label": "Client", "x": 3.72, "y": 3.72}, {"id": "tc", "kind": "server", "label": "Tomcat thread pool", "x": 7.32, "y": 0.12, "color": "blue"}, {"id": "f", "kind": "cube", "label": "Filter chain (Security)", "x": 10.92, "y": -3.48, "color": "orange"}, {"id": "ds", "kind": "cube", "label": "DispatcherServlet", "x": 14.52, "y": -7.08, "color": "purple"}, {"id": "ctl", "kind": "cube", "label": "OrderController", "x": 14.4, "y": -14.4, "color": "teal"}, {"id": "px", "kind": "cube", "label": "Proxy (@Transactional)", "x": 21.84, "y": -6.96, "color": "pink"}, {"id": "svc", "kind": "cube", "label": "OrderService", "x": 25.44, "y": -10.56, "color": "green"}, {"id": "db", "kind": "db", "label": "HikariCP → Postgres", "x": 18.93, "y": -17.07, "color": "purple"}], "links": [["c", "tc"], ["tc", "f"], ["f", "ds"], ["ds", "ctl"], ["ctl", "px"], ["px", "svc"], ["svc", "db"]], "metrics": [["stage", "Stage"], ["thread", "Thread"], ["tx", "Transaction"]], "steps": [{"short": "Boot", "tag": "Startup", "title": "At startup: component scan + auto-configuration build the ApplicationContext", "body": "<p>Spring Boot sees a DataSource dependency on the classpath and configures HikariCP, JPA and transactions unless you define your own beans (@ConditionalOnMissingBean).</p>", "show": ["tc", "f", "ds", "ctl", "svc", "db"], "metrics": {"stage": ["startup"], "thread": ["—"], "tx": ["—"]}}, {"short": "DI", "tag": "Injection", "title": "Beans are created and wired by constructor injection", "body": "<p>OrderController receives OrderService — actually a proxy wrapping it, because the service has @Transactional.</p>", "show": ["tc", "f", "ds", "ctl", "px", "svc", "db"]}, {"short": "Req", "tag": "Request", "title": "POST /orders arrives; a Tomcat worker thread takes it", "body": "<p>Thread-per-request: the thread is busy until the response is written (or use virtual threads).</p>", "show": ["c", "tc", "f", "ds", "ctl", "px", "svc", "db"], "flow": [["c", "tc", "#3b82f6", "POST /orders"]], "metrics": {"stage": ["accept"], "thread": ["http-nio-8080-exec-7"]}}, {"short": "Filters", "tag": "Security", "title": "Servlet filters run first: Spring Security checks the JWT", "body": "<p>Authentication is put in the SecurityContext (a ThreadLocal) for this request.</p>", "flow": [["tc", "f", "#f59e0b", "JWT ✓"]], "metrics": {"stage": ["filters"]}}, {"short": "Dispatch", "tag": "MVC", "title": "DispatcherServlet maps the URL to OrderController.create()", "body": "<p>Message converters (Jackson) turn the JSON body into a DTO; @Valid runs Bean Validation.</p>", "flow": [["f", "ds", "#a855f7", ""], ["ds", "ctl", "#14b8a6", "CreateOrder DTO"]], "metrics": {"stage": ["handler mapping + binding"]}}, {"short": "Proxy", "tag": "AOP", "title": "The controller calls the proxy, which begins a transaction", "body": "<p>Gets a connection from Hikari, sets autocommit off, binds it to the thread.</p>", "flow": [["ctl", "px", "#ec4899", "create()"], ["px", "db", "#ec4899", "BEGIN"]], "metrics": {"stage": ["proxy"], "tx": ["begun"]}}, {"short": "Work", "tag": "Service", "title": "OrderService saves the order and items through JPA repositories", "body": "<p>Hibernate batches INSERTs at flush. Lazy relations accessed in a loop would trigger N+1 queries.</p>", "flow": [["px", "svc", "#22c55e", ""], ["svc", "db", "#22c55e", "INSERT …"]]}, {"short": "Commit", "tag": "Commit", "title": "Method returns normally → the proxy commits", "body": "<p>A RuntimeException would roll back. Checked exceptions don't, unless rollbackFor says so.</p>", "flow": [["px", "db", "#22c55e", "COMMIT"]], "metrics": {"tx": ["committed", "good"]}}, {"short": "Self", "tag": "Pitfall", "title": "Calling this.otherTransactionalMethod() inside the service skips the proxy", "body": "<p>No new transaction, no REQUIRES_NEW. Same for private methods. Move it to another bean.</p>", "set": {"px": {"badge": "bypassed by self-call"}}, "metrics": {"tx": ["annotation ignored", "bad"]}}, {"short": "Resp", "tag": "Response", "title": "Jackson writes 201 + JSON; the thread returns to the pool", "body": "<p>Actuator exposes health, metrics and traces for this whole path.</p>", "set": {"px": {"badge": null}}, "flow": [["tc", "c", "#22c55e", "201 Created"]], "metrics": {"stage": ["response"], "thread": ["back to pool"]}, "note": {"kind": "key", "text": "Filters → DispatcherServlet → controller → transactional proxy → service → repository. Proxies only intercept calls coming from outside the bean."}}]}

## @Transactional that did nothing

> [!STORY] A Java team adds `@Transactional(propagation = REQUIRES_NEW)` to an audit-logging method so audit records survive when the main operation rolls back. In production, audit records vanish along with failed orders. The annotation is correct; the call isn't: the service calls its own method with `this.logAudit(...)`, which never goes through Spring's proxy. Spring Boot hides a lot of machinery, and interviews for Java backend roles test whether you know it.

## Auto-configuration and the application context

`@SpringBootApplication` combines component scanning, configuration and **auto-configuration**. Auto-configuration classes are conditional: `@ConditionalOnClass(DataSource.class)`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`. If you add `spring-boot-starter-data-jpa` and a database URL, Boot creates a connection pool, an `EntityManagerFactory` and a transaction manager — unless you define your own.

All objects Spring manages are **beans** in the **ApplicationContext**.

## Dependency injection and the bean lifecycle

Prefer **constructor injection**: dependencies are explicit, `final`, and easy to supply in tests.

Lifecycle: instantiate → inject dependencies → `BeanPostProcessor`s (this is where proxies are created) → `@PostConstruct` → ready → `@PreDestroy` on shutdown.

**Scopes:** `singleton` (default — one instance per context, so it must be thread-safe and stateless), `prototype` (new each time), and web scopes (`request`, `session`).

> [!WARN] Singleton beans are shared by every request thread. Never keep per-request data in a field of a service.

## Proxies and AOP

Cross-cutting features — `@Transactional`, `@Async`, `@Cacheable`, `@PreAuthorize`, retries — are implemented with **proxies**. Other beans receive a proxy that runs extra logic before and after calling your real object.

Consequences:

- **Self-invocation** (`this.method()`) bypasses the proxy: the annotation has no effect.
- Annotations on **private** methods don't apply.
- `final` classes/methods can't be proxied by CGLIB.

Fix by moving the method into another bean, or restructuring the flow.

## Transactions

- By default, **unchecked exceptions** roll back; checked exceptions don't (configure `rollbackFor`).
- **Propagation:** `REQUIRED` (join or start — default), `REQUIRES_NEW` (suspend the outer and start a new one), `NESTED` (savepoint), `MANDATORY`, `SUPPORTS`, `NEVER`.
- **Isolation** follows the database default unless set (Databases track, chapter 6).
- `readOnly = true` lets Hibernate skip dirty checking and some databases route to replicas.
- Keep transactions short: never call slow external APIs inside one; it holds a pool connection the whole time.

## The request path

1. Tomcat accepts the connection; a **worker thread** from its pool handles the request (or a virtual thread, with `spring.threads.virtual.enabled=true`).
2. **Servlet filters** run — Spring Security's filter chain authenticates the request and stores the principal in a `ThreadLocal` `SecurityContext`.
3. **`DispatcherServlet`** finds the handler, runs interceptors, binds and validates the body with Jackson and `@Valid`.
4. Your controller calls services (through proxies), which call repositories.
5. Exceptions are translated to HTTP responses by `@ControllerAdvice` handlers.
6. The response is serialised and the thread returns to the pool.

## JPA and Hibernate pitfalls

- **N+1 queries:** loading 100 orders then touching `order.getCustomer()` lazily runs 100 extra queries. Use `JOIN FETCH`, entity graphs, or DTO projections.
- **LazyInitializationException:** accessing a lazy relation after the transaction closed. Fetch what you need inside the transaction; avoid relying on Open Session in View.
- **Dirty checking:** managed entities changed inside a transaction are saved automatically at commit — sometimes surprisingly.
- **Batch inserts** need `hibernate.jdbc.batch_size` and a sequence (not identity) ID strategy.

## Production readiness

- **Connection pool (HikariCP):** size it from database capacity, not "as big as possible"; pools across many instances multiply.
- **Actuator:** `/actuator/health` (liveness and readiness for Kubernetes), metrics via Micrometer to Prometheus, info and thread dumps.
- **Graceful shutdown:** `server.shutdown=graceful` so in-flight requests finish.
- **Configuration:** profiles and externalised config; secrets from a vault, never in `application.yml`.

> [!RECAP]
> - Auto-configuration is conditional; your beans win.
> - Constructor injection; singleton beans must be stateless.
> - `@Transactional`, `@Async`, `@Cacheable` work through **proxies** — self-calls and private methods skip them.
> - Unchecked exceptions roll back; know `REQUIRED` vs `REQUIRES_NEW`; keep transactions short.
> - Request path: filters → DispatcherServlet → controller → service → repository.
> - Watch N+1 and lazy loading; size Hikari pools; use Actuator health and metrics.

> [!INTERVIEW] "How does Spring Boot auto-configuration work?", "Why doesn't my @Transactional work?", "Bean scopes?", "REQUIRED vs REQUIRES_NEW?", "How do you solve N+1 in JPA?", "How does Spring Security fit in the request flow?"

::quiz {"q": "Why does this.audit() ignore @Transactional(REQUIRES_NEW) on audit()?", "options": ["REQUIRES_NEW is deprecated", "Self-invocation bypasses the Spring proxy that applies the transaction", "audit must be static", "Transactions need XML config"], "answer": 1, "explain": "Call it through another bean."}

::quiz {"q": "Which exception rolls back a @Transactional method by default?", "options": ["Any checked exception", "RuntimeException (unchecked)", "Only SQLException", "None"], "answer": 1, "explain": "Use rollbackFor for checked exceptions."}

::quiz {"q": "100 orders are loaded and order.getCustomer() is called in a loop. What problem appears?", "options": ["Deadlock", "N+1 queries", "Dirty read", "Lost update"], "answer": 1, "explain": "Fetch customers with JOIN FETCH or a projection."}
