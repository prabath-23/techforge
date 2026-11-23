---
title: HTTP: The Language of the Web, and How APIs Talk
summary: What a browser and a server actually say to each other, what methods and status codes mean (and why "idempotent" matters when you're charging someone's card), how caching makes the web fast, why HTTP went through versions 1.1, 2 and 3, and how REST, gRPC, GraphQL and WebSockets compare for building APIs.
---

::widget Scene {"title": "What happens when you open http://example.com", "sub": "one page load, hop by hop", "nodes": [{"id": "pc", "kind": "laptop", "label": "Laptop 192.168.1.10", "x": 4.65, "y": 4.65}, {"id": "rt", "kind": "router", "label": "Home router", "x": 8.05, "y": 1.25, "color": "blue"}, {"id": "dns", "kind": "server", "label": "DNS 8.8.8.8", "x": 6.4, "y": -6.4, "color": "blue"}, {"id": "net", "kind": "cloud", "label": "Internet", "x": 13.93, "y": 0.33}, {"id": "web", "kind": "server", "label": "Web server 93.184.215.14", "x": 13.72, "y": -6.28, "color": "purple"}], "links": [["pc", "rt", {"both": true}], ["rt", "dns", {"both": true, "dashed": true}], ["rt", "net", {"both": true}], ["net", "web", {"both": true}]], "metrics": [["ip", "Server IP"], ["conn", "Connection"], ["status", "HTTP status"], ["time", "Time so far"]], "legend": [["DNS", "#3b82f6"], ["TCP", "#22c55e"], ["Request", "#f59e0b"], ["Response", "#a855f7"]], "steps": [{"short": "You hit Enter", "tag": "Start", "title": "You type a URL and press Enter", "body": "<p>The browser needs to send a <b>GET</b> request for <code>/</code> to <code>example.com</code>. But packets travel to <b>IP addresses</b>, not names.</p><p>So before anything else, it must find the server's address.</p>", "show": ["pc", "rt"], "focus": ["pc"], "metrics": {"ip": ["?"], "conn": ["none"], "status": ["-"], "time": ["0 ms"]}}, {"short": "DNS lookup", "tag": "DNS", "title": "Ask DNS: what is example.com's address?", "body": "<p>The laptop sends a tiny UDP query to the DNS resolver configured by your router, here Google's <code>8.8.8.8</code>.</p><p>If the resolver has the answer cached, it replies at once; otherwise it asks the root, <code>.com</code> and example.com's own name servers (see the DNS chapter).</p>", "show": ["pc", "rt", "dns"], "flow": [[["pc", "rt", "dns"], "#3b82f6", "A? example.com"]], "hot": [["pc", "rt"], ["rt", "dns"]], "metrics": {"time": ["12 ms"]}}, {"short": "Got the IP", "tag": "DNS", "title": "The answer comes back", "body": "<p>The resolver replies: <code>example.com → 93.184.215.14</code>, valid for 3,600 seconds (the TTL). The laptop caches it so the next visit skips this step.</p>", "flow": [[["dns", "rt", "pc"], "#3b82f6", "A 93.184.215.14"]], "set": {"dns": {"badge": "cached 1h"}}, "metrics": {"ip": ["93.184.215.14", "good"], "time": ["24 ms"]}}, {"short": "TCP handshake", "tag": "TCP", "title": "Open a TCP connection: SYN, SYN-ACK, ACK", "body": "<p>HTTP runs on TCP. The laptop and server agree to talk with a three-way handshake on port 80: <b>SYN</b> → <b>SYN-ACK</b> → <b>ACK</b>.</p><p>That costs one full round trip before any page data moves.</p>", "show": ["pc", "rt", "dns", "net", "web"], "flow": [[["pc", "rt", "net", "web"], "#22c55e", "SYN"], [["web", "net", "rt", "pc"], "#22c55e", "SYN-ACK"]], "hot": [["rt", "net"], ["net", "web"]], "metrics": {"conn": ["open", "good"], "time": ["70 ms"]}}, {"short": "GET request", "tag": "HTTP", "title": "Send the request", "body": "<p>Over the open connection, the browser sends plain text:</p><p><code>GET / HTTP/1.1<br>Host: example.com<br>Accept: text/html</code></p><p>Every router along the way just forwards packets towards <code>93.184.215.14</code>; only the server reads the HTTP.</p>", "flow": [[["pc", "rt", "net", "web"], "#f59e0b", "GET /"]], "focus": ["web"], "metrics": {"time": ["95 ms"]}}, {"short": "Response", "tag": "HTTP", "title": "The server answers 200 OK", "body": "<p>The server finds the page and replies with a status line, headers and the HTML body:</p><p><code>HTTP/1.1 200 OK<br>Content-Type: text/html<br>Content-Length: 1256</code></p>", "flow": [[["web", "net", "rt", "pc"], "#a855f7", "200 OK + HTML"]], "set": {"web": {"badge": "200 OK"}}, "metrics": {"status": ["200 OK", "good"], "time": ["120 ms"]}}, {"short": "Render", "tag": "Browser", "title": "The browser builds the page, and asks for more", "body": "<p>The browser parses the HTML, finds stylesheets, scripts and images, and requests each one, reusing the same connection (keep-alive) or several in parallel.</p><p>Total for a simple page: about a tenth of a second, most of it spent <b>waiting on round trips</b>, not computing.</p>", "note": {"kind": "key", "text": "Every step here has an interview question behind it: DNS caching, the TCP handshake, HTTP methods and status codes, keep-alive. HTTPS adds a TLS handshake between steps 4 and 5."}, "set": {"pc": {"badge": "page shown"}}, "flow": [[["pc", "rt", "net", "web"], "#f59e0b", "GET /style.css"], [["web", "net", "rt", "pc"], "#a855f7", "CSS, JS, images"]]}]}

::widget Scene {"title": "HTTPS: HTTP inside a TLS tunnel", "sub": "the padlock in your browser", "nodes": [{"id": "b", "kind": "laptop", "label": "Browser", "x": 3.1, "y": 3.1}, {"id": "eve", "kind": "user", "label": "Network snoop", "x": 11.13, "y": 3.13}, {"id": "s", "kind": "server", "label": "shop.example :443", "x": 11.1, "y": -4.9, "color": "green"}], "links": [["b", "s", {"both": true}]], "metrics": [["sees", "Snoop sees"]], "steps": [{"short": "HTTP", "tag": "Plain", "title": "Plain HTTP: every byte is readable", "body": "<p>Passwords, cookies, card numbers, anyone between you and the server can read or change them.</p>", "flow": [["b", "s", "#ef4444", "POST /login pass=…"]], "focus": ["eve"], "metrics": {"sees": ["everything", "bad"]}}, {"short": "TLS first", "tag": "Handshake", "title": "HTTPS starts with a TLS handshake on port 443", "body": "<p>Browser and server agree on keys and the browser checks the certificate (see the TLS lesson).</p>", "flow": [["b", "s", "#3b82f6", "ClientHello"], ["s", "b", "#3b82f6", "cert + key share"]]}, {"short": "Encrypted", "tag": "Secure", "title": "Then the same HTTP flows, encrypted", "body": "<p>The snoop sees only the server name and how much data moves.</p>", "flow": [["b", "s", "#22c55e", "🔒 POST /login"], ["s", "b", "#22c55e", "🔒 200 OK"]], "set": {"eve": {"dim": true}}, "metrics": {"sees": ["server name + sizes", "good"]}, "note": {"kind": "key", "text": "HTTPS = HTTP + TLS. It gives secrecy, integrity (no tampering) and server identity. HSTS tells browsers never to use plain HTTP for a site again."}}]}

## A conversation in plain text





Every time you load a page, scroll a feed or tap "Buy", your device and a server exchange **HTTP** messages. HTTP (HyperText Transfer Protocol) is a simple **request–response** conversation: the client asks, the server answers.

> [!ANALOGY] HTTP is like ordering at a restaurant counter. You make a request in a standard format ("one coffee, large, oat milk"); the server replies with a result ("here you go", or "sorry, we're out of oat milk"). Each order stands alone: the cashier doesn't remember your last visit unless you show a loyalty card (a cookie).

Here's what a real request looks like, it's just text:

```http
POST /api/orders HTTP/1.1
Host: shop.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOi...
Idempotency-Key: 7f3c1b9e-41aa-4c51-9b7e-2f0c

{"product": "A-1001", "quantity": 2}
```

And the response:

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/orders/98123

{"id": 98123, "status": "pending"}
```

A request has a **method** (what to do), a **path** (to what), **headers** (extra information: who you are, what format you're sending, what you accept) and an optional **body**. A response has a **status code** headers and a body.

> [!TRY] Open Developer Tools in your browser (F12), go to the **Network** tab and reload any page. Click a request to see its method, status, headers and response. You'll see a single page load makes dozens to hundreds of HTTP requests, for HTML, styles, scripts, images, fonts and data.

## Methods: what do you want to do?

| Method | Meaning | Safe? (no side effects) | Idempotent? (repeating = same result) |
|---|---|---|---|
| **GET** | Read something | Yes | Yes |
| **POST** | Create something / perform an action | No | **No** |
| **PUT** | Replace something entirely | No | Yes |
| **PATCH** | Change part of something | No | Usually not |
| **DELETE** | Remove something | No | Yes |

### Why "idempotent" matters so much

Networks fail at the worst moments. Imagine your app sends `POST /payments` to charge ₹2,000, and then the connection drops before the reply arrives. **Did the payment happen or not?** You can't tell. If you retry and it *had* gone through, you've charged the customer twice.

- For **idempotent** requests (GET, PUT, DELETE), retrying is safe: deleting something twice leaves it deleted.
- For **POST** retrying is dangerous.

> [!EXAMPLE] **How Stripe and other payment companies prevent double charges.** The client generates a unique **Idempotency-Key** (a random ID) for each payment attempt and sends it with the request. The server remembers the key and the result. If the same key arrives again, a retry after a timeout, the server returns the **original result** instead of charging again. Notice it in the request example above. This simple idea is behind safe retries in payment systems everywhere.

## Status codes: what happened?

- **2xx, success.** `200 OK`, `201 Created`, `204 No Content`.
- **3xx, go somewhere else.** `301 Moved Permanently` (browsers remember this one!), `302/307 Found/Temporary Redirect`, `304 Not Modified` (your cached copy is still good).
- **4xx, the client did something wrong.**
  - `400 Bad Request`, malformed input.
  - **`401 Unauthorized`** actually means *unauthenticated*: "I don't know who you are; log in".
  - **`403 Forbidden`** "I know who you are, and you're not allowed".
  - `404 Not Found`, `409 Conflict`, `422 Unprocessable`.
  - **`429 Too Many Requests`** you've hit a rate limit; slow down.
- **5xx, the server failed.**
  - `500 Internal Server Error`, a bug or crash.
  - **`502 Bad Gateway`** a proxy got a broken response from the server behind it.
  - **`503 Service Unavailable`** overloaded or in maintenance; try later.
  - **`504 Gateway Timeout`** a proxy waited too long for the server behind it.

> [!EXAMPLE] **Reading errors like an engineer.** A sudden spike of **502**s often means your app servers are crashing or restarting (the load balancer can't get a valid reply). **504**s usually mean something behind the app, often a slow database, is taking too long. **429**s mean a rate limiter is protecting you (or blocking you). The code alone tells you where to start looking.

## Remembering you: cookies

HTTP itself has no memory: each request is independent. Websites remember you with **cookies**. On login, the server replies with `Set-Cookie: session=abc123`, and the browser automatically sends `Cookie: session=abc123` with every later request to that site.

Cookie settings matter for security: **HttpOnly** (JavaScript can't read it, so malicious scripts can't steal your session), **Secure** (only sent over HTTPS), and **SameSite** (not sent when *other* websites trigger requests to this one, which blocks a whole class of attacks, Practices track → security).

## Caching: the fastest request is the one you don't make

HTTP has caching built in. A response can say how long it may be reused:

- `Cache-Control: max-age=31536000, immutable`, "keep this for a year; it will never change". Used for files whose name includes a hash of their content, like `app.3f9a1c.js`. When the code changes, the file name changes, so the cache never serves stale code.
- `Cache-Control: no-cache`, "you may keep it, but check with me before using it".
- `Cache-Control: no-store`, "never store this" (bank statements, personal data).

When a cached copy might be outdated, the browser can ask "has this changed since version `"v42"`?" using an **ETag**. If not, the server replies `304 Not Modified` with no body, a tiny response instead of re-downloading the whole file.

Caches exist in your browser, in **CDNs** around the world (chapter 9) and in proxies in front of servers. Good cache headers can cut a website's load and latency dramatically.

> [!TRY] Reload a page in the Network tab twice. On the second load, many requests will show "(memory cache)" or "(disk cache)", or a `304` status, and take 0–2 ms. That's HTTP caching at work.

## Why HTTP has had three major versions

The *meaning* of HTTP (methods, headers, status codes) has barely changed since 1997. What changed is **how messages travel** driven by web pages growing from a handful of files to hundreds:

::widget Stepper {"type":"flow","cols":4,"title":"Why each HTTP version was created","what":"Each box is one version of HTTP and the problem it solved. Read them in order: each one fixes the biggest pain left by the previous version.","steps":["Press Play.","For each version, ask: what made loading a page slow before it?","Notice the last step moves from TCP to QUIC (chapter 5)."],"nodes":[["HTTP/1.0 (1996)","A brand-new TCP connection for every file. A page with 50 images paid for 50 handshakes."],["HTTP/1.1 (1997)","Connections are kept open and reused. But each connection handles one request at a time, so browsers opened 6 connections per site, and developers bundled files together to cope."],["HTTP/2 (2015)","Many requests share ONE connection at the same time, split into small labeled frames that interleave. Headers are compressed. But on TCP, one lost packet still stalls every request (head-of-line blocking)."],["HTTP/3 (2022)","The same ideas as HTTP/2, running on QUIC over UDP. Each request is its own stream, so a lost packet only delays its own request. Faster connection setup, and connections survive network changes."]]}

## Building APIs: four styles

When your app talks to your backend, or one service talks to another, you choose an API style.

### REST

The most common style for public APIs. Data is organized as **resources** with URLs, and you use HTTP methods on them:

```text
GET    /users/42/orders        → list this user's orders
POST   /users/42/orders        → create a new order
GET    /orders/98123           → read one order
PATCH  /orders/98123           → change part of it
DELETE /orders/98123           → cancel it
```

Good REST APIs use **nouns** for URLs (not `/getOrders`), use status codes correctly, return clear error messages, support **pagination** for long lists (preferably with a "cursor" pointing at where the last page ended, rather than page numbers, which skip or repeat items when data changes), and **version** the API (`/v1/…`) so old apps keep working.

### gRPC

A framework from Google for **services talking to each other**. You define the API in a schema file, and code for every language is generated automatically:

```protobuf
service OrderService {
  rpc GetOrder (GetOrderRequest) returns (Order);
  rpc WatchOrders (WatchRequest) returns (stream OrderEvent);   // streams updates
}
message GetOrderRequest { int64 id = 1; }
message Order { int64 id = 1; string status = 2; }
```

Messages are compact binary (Protocol Buffers), it runs on HTTP/2, supports streaming in both directions, and passes deadlines along a chain of calls. It's popular inside companies like Google, Netflix and Uber. The downsides: it's not human-readable, and browsers need an extra layer to use it.

### GraphQL

Created at Facebook. Instead of many fixed endpoints, there's one endpoint where the client describes **exactly** the data it wants:

```graphql
query { user(id: 42) { name  orders(last: 3) { id total } } }
```

Great when many different clients (web, iPhone, Android, smartwatch) need different slices of data, no more fetching too much or making five requests. Costs: caching is harder, and careless servers can end up making hundreds of database queries for one request (the "N+1 problem").

### Real-time: polling, Server-Sent Events, WebSockets

Normal HTTP can't let the server *push* data when something happens. Options:

- **Polling** ask "anything new?" every few seconds. Simple and wasteful.
- **Server-Sent Events (SSE)** the server keeps one response open and streams events down it. Perfect for live feeds and notifications, and it's how **ChatGPT and Claude stream answers to you word by word**.
- **WebSockets** upgrade an HTTP connection into a two-way channel where either side can send at any time. Used for chat apps, multiplayer games, live collaboration and trading screens.

> [!RECAP]
> - **HTTP** is a request–response conversation: a method, a path, headers and a body; responses carry a **status code**.
> - **Idempotent** methods are safe to retry; for POST, use an **idempotency key** to avoid double charges.
> - **401** = not logged in, **403** = not allowed; **502/503/504** point to different server-side problems.
> - **Cookies** give HTTP memory; **Cache-Control** and **ETags** make the web fast.
> - HTTP/1.1 → **HTTP/2** (many requests on one connection) → **HTTP/3** (on QUIC, no head-of-line blocking).
> - APIs: **REST** (public APIs), **gRPC** (service-to-service), **GraphQL** (flexible client queries), **SSE/WebSockets** (real-time).

> [!INTERVIEW] Commonly asked: which methods are idempotent and why it matters; 401 vs 403; 502 vs 503 vs 504; how HTTP caching works; HTTP/1.1 vs 2 vs 3; REST vs gRPC; WebSockets vs SSE vs polling for a given feature (for example, a chat app vs a live score feed).

::quiz {"q":"A payment request times out and the app retries. How can the server avoid charging twice?","options":["Use GET instead of POST","Require an Idempotency-Key and return the stored result for repeated keys","Return 503","Use HTTP/2"],"answer":1,"explain":"The server remembers each key's result and replays it for retries."}

::quiz {"q":"A logged-in user tries to open an admin page they don't have access to. Which status code is correct?","options":["401 Unauthorized","403 Forbidden","404 Not Found","500"],"answer":1,"explain":"401 means 'who are you?'; 403 means 'I know who you are, and no'."}

::quiz {"q":"Which technology does a chatbot typically use to stream its answer to your browser word by word?","options":["Polling every 5 seconds","Server-Sent Events over a long-lived HTTP response","FTP","DNS"],"answer":1,"explain":"SSE is ideal for one-way server-to-client streaming."}
