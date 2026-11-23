---
title: API Design for Large Systems
summary: Designing the contracts between services and clients that thousands of developers will depend on — resource-oriented REST, gRPC and GraphQL compared, naming and versioning, pagination that survives billions of rows, idempotency for safe retries, errors, rate limits, long-running operations, webhooks, and evolving an API without breaking anyone.
---

## The API you can never change

> [!STORY] A payments company launches an API with a field called `amount` holding a decimal number of dollars. Two years later, 40,000 businesses have integrated with it, and the team realizes floating-point dollars cause rounding errors and don't work for currencies like the Japanese yen. They can't just change the field: thousands of systems they don't control would break overnight. Stripe, facing similar choices, made `amount` an **integer in the smallest currency unit** from day one, and built a system that keeps every customer pinned to the API version they first integrated with. Once an API is public, **every decision is permanent** — so API design deserves as much care as database design.

An API is a **contract**. Inside one codebase, you can change a function and fix every caller. Across services, teams and companies, you can't. Good APIs are **predictable, hard to misuse, and able to evolve** without breaking existing clients.

## Choosing a style

| | **REST (HTTP + JSON)** | **gRPC** | **GraphQL** |
|---|---|---|---|
| Model | Resources and HTTP verbs | Remote procedure calls defined in Protobuf | A typed graph; clients ask for exactly the fields they want |
| Transport | HTTP/1.1 or 2 | HTTP/2, binary | Usually HTTP POST |
| Strengths | Universal, cacheable, easy to explore with curl | Fast, compact, strongly typed, streaming, code generation | One request fetches nested data for a screen; no over-fetching |
| Weaknesses | Over/under-fetching; looser contracts unless you use OpenAPI | Not browser-native; harder to debug by hand | Caching is harder; expensive queries need limits; more complex servers |
| Typical use | Public APIs, web backends | Internal service-to-service calls | Frontend-facing APIs over many backends (GitHub, Shopify) |

> [!NOTE] Many large companies use **gRPC inside** (between microservices) and **REST or GraphQL at the edge** (for browsers, mobile apps and partners), with a gateway translating between them.

## Designing a REST API well

### Resources and verbs

Model **nouns** (resources) and use HTTP **methods** for actions:

```http
GET    /v1/orders?customer_id=c_42&status=open     list (filtered)
POST   /v1/orders                                   create
GET    /v1/orders/ord_9f2                          read one
PATCH  /v1/orders/ord_9f2                          partial update
DELETE /v1/orders/ord_9f2                          delete
POST   /v1/orders/ord_9f2/cancel                   an action that isn't plain CRUD
```

- Plural nouns, lowercase, consistent casing for fields (`snake_case` or `camelCase` — pick one forever).
- **Opaque, prefixed IDs** (`ord_9f2…`, `cus_…`) — readable in logs, impossible to confuse between types, and not sequential (so they don't leak your volume or invite enumeration).
- Use status codes meaningfully: `200`, `201 Created`, `204`, `400` (bad input), `401` (not authenticated), `403` (not allowed), `404`, `409` (conflict), `422` (validation), `429` (rate limited), `5xx` (our fault).

### Errors that help

```json
{
  "error": {
    "type": "invalid_request",
    "code": "amount_too_small",
    "message": "Amount must be at least 50 (₹0.50).",
    "param": "amount",
    "request_id": "req_7Hq2…"
  }
}
```

A stable machine-readable `code`, a human message, the offending field, and a **request ID** support teams can trace (Cloud track, chapter 7).

## Pagination that scales

**Offset pagination** (`?page=500&per_page=20` → `OFFSET 9980`) is simple but breaks at scale: the database must walk past every skipped row (slow on deep pages), and items shift between pages when data changes, causing duplicates or gaps.

**Cursor (keyset) pagination** returns an opaque cursor pointing to the last item seen:

```http
GET /v1/orders?limit=20
→ { "data": [...], "next_cursor": "eyJjcmVhdGVkIjoiMjAyNi0xMS0yM1QwOToxNCIsImlkIjoib3JkXzlmMiJ9" }

GET /v1/orders?limit=20&cursor=eyJjcmVhdGVk…
```

The cursor encodes (created_at, id) of the last row; the next query is `WHERE (created_at, id) < (…) ORDER BY created_at DESC, id DESC LIMIT 20` — an index seek (Databases track, chapter 5), equally fast on page 1 or page 50,000, and stable while new items arrive.

> [!ANALOGY] Offset pagination is "start reading at the 9,980th word of the book" — you have to count from the beginning every time, and if someone inserts a paragraph, you lose your place. A cursor is a **bookmark**: you open straight to it, wherever it has moved.

## Idempotency: making retries safe

Networks fail **after** the server did the work but **before** the client got the response (Networking track). The client can't tell whether the payment happened. If it retries a plain `POST /payments`, the customer may be charged twice.

::widget Sequence {"title":"A retried payment made safe with an idempotency key","what":"A client creates a payment, loses the response to a network failure, and retries. The idempotency key lets the server recognize the retry and return the original result instead of charging again.","steps":["Step through the messages.","Find the moment the response is lost.","Notice what the server stores the first time and how it answers the retry."],"actors":["Client","API server","Idempotency store","Payment processor"],"msgs":[[0,1,"POST /payments  Idempotency-Key: 7d1e…","The client generates a unique key for this one logical operation and sends it with the request."],[1,2,"key 7d1e… seen? no → record 'in progress'","The server records the key atomically, so a concurrent duplicate can't slip through."],[1,3,"charge ₹4,999","The card is charged once."],[1,2,"store result for 7d1e…","The final response is saved against the key (kept for, say, 24 hours)."],[1,0,"201 Created — lost in the network","The client never receives it and can't tell whether the charge happened."],[0,1,"retry: same request, same key","Safe to retry because the key identifies the same operation."],[1,0,"201 Created (stored result)","The server finds the key and returns the original response. No second charge."]]}

- `GET`, `PUT` and `DELETE` are naturally idempotent if designed so; `POST` needs an **idempotency key**.
- Store keys with the result; reject a reused key with a **different** request body.
- Clients should retry with **exponential backoff and jitter** (chapter on reliability; Algorithms track, chapter 10).

## Protecting the API

- **Authentication:** API keys for server-to-server, OAuth access tokens for user-delegated access (Security track).
- **Rate limits and quotas** per key, user and endpoint, returning `429` with `Retry-After` and `RateLimit-*` headers (token bucket — try the figure in chapter 5 of this track).
- **Limits on payloads**, page sizes, query complexity (especially GraphQL depth and cost).
- **Validation** at the edge against a schema; reject unknown fields on writes to avoid mass assignment (Security track, chapter 6).

## Long-running work and events

- **Asynchronous operations:** if a request takes minutes (a video transcode, a large export), return `202 Accepted` with an operation resource: `GET /v1/exports/exp_31` → `{"status": "running", "progress": 0.4}`, then `"succeeded"` with a download URL.
- **Webhooks:** notify clients when something happens (`payment.succeeded`). Sign them (HMAC — Security track, chapter 2), include an event ID for de-duplication, retry with backoff for days, and let clients fetch missed events from an events API. Delivery is **at least once**, so receivers must handle duplicates.
- **Streaming:** server-sent events or WebSockets for live updates (Networking track, chapter 13); gRPC streams internally.

## Evolving without breaking anyone

**Additive changes are safe:** new endpoints, new optional fields, new enum values (if clients were told to expect unknown ones). **Breaking changes** include removing or renaming fields, changing types or meanings, making optional fields required, and changing default behavior.

Strategies:

- **Version** the API: in the URL (`/v1/`, `/v2/`) for big changes, or by date with per-account pinning (Stripe's `Stripe-Version: 2026-10-01`), translating old versions through compatibility layers.
- **Tolerant readers:** clients ignore fields they don't understand; servers accept missing optional fields.
- **Deprecate** gradually: announce, add `Deprecation`/`Sunset` headers, measure who still uses old fields, contact them, then remove.
- For Protobuf/gRPC: never reuse field numbers; add new fields rather than changing existing ones.
- **Contract tests** (Practices track, testing) catch accidental breaking changes before release.

## Document and design first

Describe the API in **OpenAPI** (REST), `.proto` files (gRPC) or a GraphQL schema **before** implementing it; review it like code; generate docs, client libraries and mock servers from it. Good API docs include runnable examples, every error code, and a changelog.

> [!RECAP]
> - An API is a **permanent contract**: design for predictability and evolution.
> - **REST** for public and web APIs, **gRPC** internally, **GraphQL** for flexible client-driven fetching.
> - Resource-oriented URLs, meaningful status codes, **prefixed opaque IDs**, **helpful errors** with request IDs, **integer money**.
> - **Cursor pagination** stays fast and stable at any depth.
> - **Idempotency keys** make retries safe; clients retry with backoff and jitter.
> - Rate limits, validation, async operations (**202 + status resource**), signed **webhooks** delivered at least once.
> - Evolve with **additive changes**, versioning, tolerant readers and deliberate deprecation; design schema-first.

> [!INTERVIEW] In every design interview, sketch the key APIs early: endpoints, request/response fields, pagination, idempotency for writes, and errors. Expect follow-ups like "how would a mobile client safely retry?" and "how do you change this API without breaking clients?"

::quiz {"q":"Why prefer cursor pagination over offset pagination for large, changing lists?","options":["Cursors are shorter","Offsets get slow on deep pages and skip or repeat items when data changes; cursors use an index seek and stay stable","Offsets aren't supported by SQL","Cursors encrypt data"],"answer":1,"explain":"A cursor is a bookmark, not a count from the start."}

::quiz {"q":"A client times out on POST /payments and retries. How do you prevent a double charge?","options":["Ask the user","Require an idempotency key and return the stored result for repeats","Use GET instead","Disable retries"],"answer":1,"explain":"The key identifies one logical operation."}

::quiz {"q":"Which change is safe for existing API clients?","options":["Renaming a field","Adding a new optional field","Changing a field from string to integer","Making an optional parameter required"],"answer":1,"explain":"Additive changes don't break tolerant clients."}
