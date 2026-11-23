---
title: Browser Security — Same-Origin Policy, CORS, Cookies and CSP
summary: Why a page from one site can't read another site's data, what CORS really relaxes (and what it doesn't protect), preflight requests step by step, credentials and cookies with SameSite, CSRF, Content-Security-Policy against XSS, and the configuration mistakes that create real vulnerabilities.
---

::widget Scene {"title": "A cross-origin request with CORS preflight", "sub": "app.shop.com calls api.shop.com with a JSON body and a cookie", "nodes": [{"id": "page", "kind": "laptop", "label": "Page on app.shop.com", "x": 3.72, "y": 3.72}, {"id": "br", "kind": "cube", "label": "Browser (enforces SOP)", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "api", "kind": "server", "label": "api.shop.com", "x": 13.22, "y": -5.78, "color": "blue"}, {"id": "evil", "kind": "laptop", "label": "evil.example", "x": 9.92, "y": 9.92, "color": "red"}], "links": [["page", "br"], ["br", "api", {"both": true}], ["evil", "br", {"dashed": true}]], "metrics": [["req", "Request"], ["decision", "Browser decision"]], "steps": [{"short": "Origin", "tag": "Origins", "title": "An origin = scheme + host + port", "body": "<p>https://app.shop.com and https://api.shop.com are different origins. The same-origin policy stops a page reading responses from other origins by default.</p>", "show": ["page", "br", "api"], "metrics": {"req": ["—"], "decision": ["—"]}}, {"short": "Why", "tag": "Why SOP", "title": "Without it, any site could read your bank", "body": "<p>Your browser sends your cookies with requests. A malicious page could fetch bank.com/statement and read it as you.</p>"}, {"short": "Simple?", "tag": "Classify", "title": "fetch POST with Content-Type: application/json and credentials", "body": "<p>Not a \"simple request\" (JSON content type), so the browser sends a preflight first.</p>", "flow": [["page", "br", "#3b82f6", "fetch(api, {credentials: \"include\"})"]], "metrics": {"req": ["POST JSON"]}}, {"short": "Preflight", "tag": "Preflight", "title": "OPTIONS /orders with Origin, Access-Control-Request-Method, -Headers", "body": "<p>\"May app.shop.com send a POST with content-type?\" No cookies, no body.</p>", "flow": [["br", "api", "#a855f7", "OPTIONS (preflight)"]], "metrics": {"req": ["OPTIONS"], "decision": ["asking permission"]}}, {"short": "Allow", "tag": "Response", "title": "API replies: Allow-Origin: https://app.shop.com, Allow-Methods: POST, Allow-Headers: content-type, Allow-Credentials: true", "body": "<p>Must echo the exact origin — \"*\" is not allowed together with credentials. Max-Age lets the browser cache this answer.</p>", "flow": [["api", "br", "#22c55e", "204 + CORS headers"]], "metrics": {"decision": ["allowed", "good"]}}, {"short": "Real", "tag": "Request", "title": "Now the real POST goes, with cookies", "body": "<p>The response also needs Access-Control-Allow-Origin, or JavaScript can't read it.</p>", "flow": [["br", "api", "#3b82f6", "POST + cookie"], ["api", "br", "#22c55e", "201"]], "metrics": {"req": ["POST"], "decision": ["response readable"]}}, {"short": "Evil", "tag": "Blocked", "title": "evil.example tries the same call", "body": "<p>The API doesn't list that origin. The browser blocks the page from reading the response.</p>", "show": ["page", "br", "api", "evil"], "flow": [["evil", "br", "#ef4444", "fetch api.shop.com"]], "set": {"br": {"badge": "blocked: origin not allowed"}}, "metrics": {"decision": ["blocked", "good"]}}, {"short": "Gotcha", "tag": "Not protection", "title": "But CORS doesn't stop requests from being SENT", "body": "<p>Simple requests (a form POST) still reach the server with cookies. Protecting state changes is the job of SameSite cookies and CSRF tokens. And curl ignores CORS entirely — it's not server security.</p>", "set": {"br": {"badge": null}}}, {"short": "Rule", "tag": "Summary", "title": "CORS relaxes the browser's read restriction, nothing more", "body": "<p>Allow-list exact origins, never reflect any Origin with credentials, and authenticate and authorise every request on the server.</p>", "note": {"kind": "key", "text": "SOP blocks cross-origin reads; CORS headers grant specific origins permission; preflight checks non-simple requests. Server-side auth is still required."}}]}

## The API that trusted every website

> [!STORY] A startup's API "fixes" a CORS error the quick way: it reads the request's `Origin` header and copies it into `Access-Control-Allow-Origin`, with `Access-Control-Allow-Credentials: true`. The error disappears. So does the protection: now *any* website a logged-in customer visits can call the API with their cookies and read their orders, addresses and saved cards. A security researcher reports it with a ten-line proof of concept. This chapter explains what CORS actually is, so you never "fix" it that way.

## The same-origin policy

An **origin** is the triple *scheme + host + port*: `https://app.shop.com:443`. Change any part and it's a different origin — `http://`, `api.shop.com` and port `8080` are all different.

Browsers attach cookies to requests automatically. Without restrictions, a page on `evil.example` could `fetch('https://bank.com/statement')`, the browser would include your bank cookie, and the page could read your statement. The **same-origin policy (SOP)** prevents that: scripts can *send* many cross-origin requests, but can't *read* the responses unless the other origin agrees.

## CORS: the other origin says yes

**Cross-Origin Resource Sharing** is how a server opts in. It answers with headers that tell the browser which origins may read its responses:

```http
Access-Control-Allow-Origin: https://app.shop.com
Access-Control-Allow-Credentials: true
Vary: Origin
```

### Simple requests vs preflight

- **Simple requests** — `GET`, `HEAD` or `POST` with only basic headers and a content type of form data or plain text — are sent directly. CORS decides only whether JavaScript may read the response.
- Anything else — `PUT`/`DELETE`, `Content-Type: application/json`, custom headers like `Authorization` — triggers a **preflight**: an `OPTIONS` request asking permission first. Only if the response allows the method, headers and origin does the real request go.

`Access-Control-Max-Age` lets the browser cache the preflight answer and skip it for a while.

## The rules that matter

- With credentials (cookies or HTTP auth), `Access-Control-Allow-Origin: *` is **not allowed** — you must name the exact origin.
- **Never reflect** the incoming `Origin` blindly. Check it against an allow-list of your own front ends.
- Add `Vary: Origin` so caches don't serve one origin's CORS headers to another.
- A "CORS error" in the console is the *browser* refusing to show you the response. The server usually processed the request anyway.

> [!WARN] CORS is not access control. Tools like curl and servers ignore it completely. Every API must still authenticate and authorise each request.

## Cookies, SameSite and CSRF

CORS controls *reading*. It doesn't stop a malicious page from *sending* a request that changes something — a hidden form that POSTs to `bank.com/transfer` with your cookie attached. That's **Cross-Site Request Forgery (CSRF)**.

Defences:

- **SameSite cookies.** `SameSite=Lax` (the default in modern browsers) doesn't send the cookie on cross-site POSTs; `Strict` doesn't send it on any cross-site request. Use `SameSite=None; Secure` only when you genuinely need cross-site cookies.
- **CSRF tokens** — a secret value in the form or header that an attacking site can't read.
- Require a custom header or JSON content type for state-changing endpoints (which forces a preflight the attacker can't pass).

Always set session cookies with **`HttpOnly`** (JavaScript can't read them, limiting XSS damage) and **`Secure`** (HTTPS only).

## Content-Security-Policy against XSS

Cross-site scripting (Security track, chapter 5) runs an attacker's script *inside your origin*, where SOP offers no protection. **Content-Security-Policy** limits what the page may load and execute:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m'; object-src 'none'; frame-ancestors 'none'
```

- Scripts only from your origin or with the per-response nonce; inline injected scripts don't run.
- `frame-ancestors 'none'` stops other sites framing your page (clickjacking).
- Start with `Content-Security-Policy-Report-Only` to find breakage before enforcing.

## Other headers worth setting

- `Strict-Transport-Security` — always use HTTPS for this site.
- `X-Content-Type-Options: nosniff` — don't guess content types.
- `Referrer-Policy: strict-origin-when-cross-origin` — limit what URLs leak to other sites.
- `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` — isolate the page (needed for some powerful features).

> [!RECAP]
> - Origin = scheme + host + port. SOP blocks cross-origin **reads**.
> - CORS lets a server allow specific origins; non-simple requests get an `OPTIONS` **preflight**.
> - With credentials, name exact origins — never `*`, never reflect blindly.
> - CORS doesn't stop requests being sent: use **SameSite** cookies and CSRF tokens for state changes.
> - CSP limits script sources to contain XSS; set HttpOnly/Secure cookies and security headers.

> [!INTERVIEW] "Explain CORS and preflight." "Why does Postman work but the browser shows a CORS error?" (Postman isn't a browser.) "How do you prevent CSRF?" "What does SameSite=Lax do?" "What's CSP for?"

::quiz {"q": "Which pair is the SAME origin?", "options": ["http://a.com and https://a.com", "https://a.com and https://a.com:443", "https://a.com and https://api.a.com", "https://a.com:8080 and https://a.com"], "answer": 1, "explain": "443 is the default HTTPS port, so these match."}

::quiz {"q": "What does CORS protect against?", "options": ["All attacks on your API", "Other websites reading your responses in a user's browser", "SQL injection", "Requests from curl"], "answer": 1, "explain": "It relaxes or enforces browser read restrictions only."}

::quiz {"q": "Why is reflecting any Origin with Allow-Credentials: true dangerous?", "options": ["It slows the API", "Any website can read responses using the visitor's cookies", "It breaks preflight caching", "Browsers reject it"], "answer": 1, "explain": "Allow-list exact origins instead."}
