---
title: Anatomy of a Full-Stack App: Vue + Spring Boot + PostgreSQL, End to End
summary: How all the pieces of a production full-stack application fit together: repository layout, the API contract with OpenAPI, the Vue frontend and Spring Boot backend, PostgreSQL with Flyway migrations, authentication with an identity provider, local development with Docker Compose and the Vite proxy, configuration per environment, testing at each level, CI/CD, containers and deployment, and observability, following one feature from design to production.
---

::widget Scene {"title": "One feature, the whole stack", "sub": "\"Cancel order\" from the button to the database and back, and how it ships", "nodes": [{"id": "ui", "kind": "laptop", "label": "Vue SPA (CDN)", "x": 3.72, "y": 3.72, "color": "green"}, {"id": "gw", "kind": "router", "label": "Load balancer / ingress", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "api", "kind": "server", "label": "Spring Boot API (containers)", "x": 11.72, "y": -4.28, "color": "purple"}, {"id": "idp", "kind": "cube", "label": "Identity provider", "x": 1.52, "y": -6.48, "color": "orange"}, {"id": "db", "kind": "db", "label": "PostgreSQL (Flyway)", "x": 12.62, "y": -11.38, "color": "teal"}, {"id": "q", "kind": "queue", "label": "Events (outbox → Kafka)", "x": 19.13, "y": -4.87, "color": "pink"}, {"id": "obs", "kind": "cube", "label": "Logs, metrics, traces", "x": 17.92, "y": 1.92, "color": "dark"}], "links": [["ui", "gw"], ["gw", "api"], ["ui", "idp", {"dashed": true}], ["api", "db"], ["api", "q"], ["api", "obs", {"dashed": true}]], "metrics": [["stage", "Stage"], ["artifact", "Artifact"]], "steps": [{"short": "Contract", "tag": "Design", "title": "Start with the contract: POST /orders/{id}/cancel in the OpenAPI spec", "body": "<p>Reviewed by frontend and backend; generates the TypeScript client and server interfaces/DTOs.</p>", "show": ["ui", "api"], "metrics": {"stage": ["API design"], "artifact": ["openapi.yaml"]}}, {"short": "DB", "tag": "Database", "title": "A Flyway migration adds cancelled_at and a reason column", "body": "<p>V12__order_cancellation.sql, versioned, applied automatically at startup or in the pipeline; backward-compatible with the running version.</p>", "show": ["ui", "api", "db"], "metrics": {"stage": ["schema"], "artifact": ["V12__...sql"]}}, {"short": "Backend", "tag": "Backend", "title": "Backend: controller → CancelOrder use case → Order.cancel() rule → repository", "body": "<p>Rule: only unshipped orders can be cancelled. Transaction + outbox event OrderCancelled.</p>", "show": ["ui", "api", "db", "q"], "flow": [["api", "db", "#14b8a6", "UPDATE + outbox"], ["api", "q", "#ec4899", "OrderCancelled"]], "metrics": {"stage": ["backend feature"]}}, {"short": "Frontend", "tag": "Frontend", "title": "Frontend: a CancelOrderDialog calls the generated client through a composable", "body": "<p>Optimistic status update, error mapping (409 \"already shipped\"), and an audit-friendly reason field.</p>", "show": ["ui", "api", "db", "q", "gw"], "flow": [["ui", "gw", "#3b82f6", "POST /cancel"], ["gw", "api", "#3b82f6", ""]], "metrics": {"stage": ["frontend feature"]}}, {"short": "Auth", "tag": "Auth", "title": "Auth: the SPA signs in with the IdP (OIDC + PKCE); the API validates the token and checks ownership", "body": "<p>Spring Security resource server; authorisation on every object.</p>", "show": ["ui", "api", "db", "q", "gw", "idp"], "flow": [["ui", "idp", "#f59e0b", "login"], ["gw", "api", "#22c55e", "JWT ✓ owner ✓"]]}, {"short": "Local", "tag": "Local dev", "title": "Locally: docker compose up (Postgres, Kafka, Keycloak), mvn spring-boot:run, npm run dev", "body": "<p>Vite proxies /api to localhost:8080, one origin, no CORS setup.</p>", "metrics": {"stage": ["local development"], "artifact": ["compose.yaml"]}}, {"short": "Test", "tag": "Tests", "title": "Tests at each level", "body": "<p>Domain unit tests; API tests with Testcontainers Postgres; frontend component tests with MSW; one Playwright E2E for the cancel flow.</p>", "metrics": {"stage": ["tests"]}}, {"short": "CI", "tag": "CI/CD", "title": "CI builds both, runs tests, builds a container image and static assets, deploys with a canary", "body": "<p>Frontend to object storage + CDN; backend image to Kubernetes; migration runs before the new version.</p>", "metrics": {"stage": ["ship"], "artifact": ["image + dist/"]}}, {"short": "Obs", "tag": "Observe", "title": "In production: trace the request from browser to database", "body": "<p>Correlation ID from the SPA header through logs, metrics (cancellations/min, 409 rate) and traces.</p>", "show": ["ui", "api", "db", "q", "gw", "idp", "obs"], "flow": [["api", "obs", "#a855f7", "telemetry"]], "note": {"kind": "key", "text": "Contract first → migration → backend use case → frontend → auth → local stack → tests → CI/CD → observability. Each piece has a clear owner and a clear interface."}}]}

## Seeing the whole picture

Many engineers know their half, the Vue app or the Spring Boot service, well, but are hazier on how a complete product fits together: where the frontend is hosted, how the browser authenticates to the API, how the database schema changes safely, how a laptop runs the whole thing, and how a commit reaches production. This chapter walks through a typical, solid full-stack setup.

## The architecture

```
Browser ── CDN (Vue SPA static files)
   │
   ├── Identity provider (OIDC login)
   │
   └── HTTPS ── Load balancer / ingress ── Spring Boot API (N containers)
                                              ├── PostgreSQL (primary + replica)
                                              ├── Redis (cache, rate limits)
                                              └── Outbox → Kafka → workers (emails, search index)
```

- The **frontend** is static files (HTML, JS, CSS) built by Vite, served from object storage behind a CDN, cheap, fast, no servers.
- The **backend** is a stateless API in containers behind a load balancer; scales horizontally.
- **PostgreSQL** is the source of truth; Redis for caching; a message broker for asynchronous work.

## Repository layout

A **monorepo** keeps frontend, backend, the API contract and infrastructure together:

```
shop/
  api/openapi.yaml             # the contract
  backend/                     # Spring Boot (pom.xml, src/...)
  frontend/                    # Vue + Vite (package.json, src/...)
  infra/                       # Terraform / Helm charts
  compose.yaml                 # local dependencies
  .github/workflows/           # CI/CD
```

A polyrepo (separate repos) also works; then version and publish the API contract as an artifact.

## Contract first

Design endpoints in **OpenAPI** and review them before coding. Generate the TypeScript client for the frontend and DTOs/interfaces for the backend (or generate the spec from annotated controllers, pick one source of truth). Contract tests or schema checks in CI catch breaking changes.

## Backend

Spring Boot with the layering from chapter 4: controllers, use cases, domain, repositories. Key production concerns:

- **Flyway** (or Liquibase) **migrations** versioned SQL files applied in order, never edited after release. Use **expand/contract** for zero-downtime changes: add a nullable column → deploy code that writes both → backfill → switch reads → drop the old column later.
- **Validation and problem-details errors** global exception handling.
- **Security:** Spring Security as an OAuth2 resource server validating JWTs from the IdP; object-level authorisation in use cases.
- **Outbox** for reliable events; idempotent consumers.
- **Actuator** health/readiness probes, Micrometer metrics, OpenTelemetry traces, structured JSON logs.

## Frontend

Vue + Vite with the architecture from chapter 5: feature folders, typed API client, composables, Pinia for session/preferences, lazy routes. Authentication via OIDC with PKCE, either directly in the SPA, or (more secure) through a **backend-for-frontend** that keeps tokens server-side and gives the browser an HttpOnly session cookie.

## Local development

```yaml
# compose.yaml
services:
  postgres: { image: postgres:17, environment: { POSTGRES_PASSWORD: dev }, ports: ["5432:5432"] }
  kafka:    { image: apache/kafka:3.9.0, ports: ["9092:9092"] }
  keycloak: { image: quay.io/keycloak/keycloak:26.0, command: start-dev, ports: ["8081:8080"] }
```

- `docker compose up -d` for dependencies, `./mvnw spring-boot:run` for the API (Spring Boot can also start Compose services itself), `npm run dev` for the SPA.
- The **Vite dev proxy** forwards `/api` to `localhost:8080`, so the browser talks to one origin.
- Seed data and a test user make the app usable immediately.

## Configuration per environment

- Backend: `application.yml` defaults + Spring profiles + **environment variables** for anything environment-specific; secrets from a vault/secret manager, never in git.
- Frontend: build once, load runtime config (`/config.json`) per environment.
- Same container image and same static bundle promoted from staging to production.

## Testing pyramid across the stack

| Level | Backend | Frontend |
|---|---|---|
| Unit | domain rules, use cases with fakes (JUnit) | composables, utils (Vitest) |
| Integration | controllers + DB with **Testcontainers** | components with Testing Library + MSW |
| Contract | OpenAPI schema checks / consumer-driven contracts | generated types compile |
| End-to-end | - | a few Playwright journeys against a deployed environment |

## CI/CD and deployment

1. On pull request: lint, unit and integration tests for both apps, build, security scans (dependencies, containers), preview environment.
2. On merge: build the **container image** (backend) and **static bundle** (frontend), tag with the commit SHA.
3. Deploy to staging: run **migrations** deploy the image (Kubernetes/ECS), upload the bundle to object storage + CDN invalidation of `index.html`.
4. Smoke tests, then production with a **canary** and automatic rollback on error-rate increase.

Deploy order matters: backward-compatible migrations first, then backend, then frontend (or feature-flag new UI until the API is live everywhere).

## Observability

Pass a **correlation ID** from the SPA (request header) through the gateway, API logs, traces and async events. Track RED metrics (rate, errors, duration) per endpoint, frontend Core Web Vitals and JavaScript errors (with source maps), and business metrics (orders/min, cancellations). Alert on SLOs.

> [!RECAP]
> - SPA on a CDN, stateless API containers behind a load balancer, PostgreSQL + cache + broker.
> - Monorepo with an **OpenAPI contract** generating clients/DTOs.
> - Backend: layered/hexagonal Spring Boot, **Flyway** migrations with expand/contract, OIDC resource server, outbox, Actuator.
> - Frontend: feature-structured Vue, typed client, OIDC/BFF auth, runtime config.
> - Local: Docker Compose + Vite proxy. Tests at every level with Testcontainers and MSW.
> - CI/CD: image + bundle per commit, migrations first, canary deploys, end-to-end observability.

> [!INTERVIEW] "Walk me through the architecture of an app you built end to end", "How do you change the database schema without downtime?", "How does the browser authenticate to your API?", "How do you run the whole stack locally?", "How do frontend and backend stay in sync?", "What's your deployment pipeline?"

::quiz {"q": "What is the expand/contract approach to schema changes?", "options": ["Delete and recreate tables", "Add new structures compatibly, migrate code and data, then remove old structures later, enabling zero-downtime deploys", "Shrink the database", "Use NoSQL instead"], "answer": 1, "explain": "Old and new versions keep working during the rollout."}

::quiz {"q": "How does the Vite dev proxy help local development?", "options": ["It caches the database", "It forwards /api to the backend so the browser sees one origin and CORS is unnecessary", "It deploys the app", "It mocks authentication"], "answer": 1, "explain": "Same-origin in development."}

::quiz {"q": "In which order should a release with a schema change usually roll out?", "options": ["Frontend, backend, migration", "Backward-compatible migration, then backend, then frontend", "All at once", "Backend, migration, frontend"], "answer": 1, "explain": "Each step stays compatible with what is already running."}
