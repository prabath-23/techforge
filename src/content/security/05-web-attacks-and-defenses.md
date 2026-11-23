---
title: Web Attacks and Defenses in Depth
summary: Going beyond the OWASP basics — how the browser's same-origin policy and CORS really work, the three kinds of XSS and Content Security Policy, CSRF and SameSite cookies, SSRF against cloud metadata, injection beyond SQL, file upload attacks, deserialization, business-logic abuse, and the security headers every site should send.
---

## The browser is a battlefield

> [!STORY] In 2005, a teenager named Samy Kamkar found that MySpace's filter for profile HTML could be fooled. He hid a small script in his profile. Anyone who viewed it silently added Samy as a friend and copied the script into **their own** profile. Within 20 hours, over a million people had "Samy is my hero" on their pages, and MySpace had to shut down to clean up. The Samy worm was the first big demonstration that **one injected script, running in a trusted site, can act as every visitor**.

The Practices track introduced the main attacks. This chapter explains **why** they work — the browser's security model — and the deeper defenses.

## The rule everything depends on: same-origin policy

An **origin** is scheme + host + port: `https://bank.example:443`. The **same-origin policy** says a page's scripts can only read data from **its own origin**. A script on `evil.example` can make your browser **send** a request to `bank.example`, but it can't **read** the response.

> [!ANALOGY] Embassies in the same city. Each embassy's staff can read their own files freely. A visitor from another embassy can drop a letter in your mailbox (send a request), but can't walk in and read your files (read the response). Most web attacks are about getting around this: **XSS** sneaks a spy inside your embassy; **CSRF** abuses the fact that anyone can drop letters in your mailbox, signed with your own stamp (cookies).

### CORS: deliberate exceptions

**CORS** (cross-origin resource sharing) lets a server say "pages from these other origins may read my responses":

```text
Access-Control-Allow-Origin: https://app.example
Access-Control-Allow-Credentials: true
```

> [!WARN] Reflecting back whatever `Origin` the request has, combined with `Allow-Credentials: true`, lets **any** website read your users' private data using their cookies. Allow an explicit list of origins. CORS **relaxes** protection; it never adds any — it's not a defense against CSRF or anything else.

## XSS: getting a script inside

Three flavors:

- **Stored:** the script is saved in your database (a comment, a profile, a product review) and served to every viewer — the Samy worm.
- **Reflected:** the script comes from the URL and is echoed into the page: `search?q=<script>…</script>`. The attacker sends victims a link.
- **DOM-based:** client-side JavaScript takes something from the URL or `postMessage` and writes it into the page with `innerHTML`, never touching the server.

Defenses, in layers:

1. **Context-aware output encoding** — let templates and frameworks (Vue, React, Angular) escape by default; never pass untrusted strings to `v-html`, `innerHTML`, `dangerouslySetInnerHTML`, `eval` or `document.write`.
2. **Sanitize** user HTML (rich-text editors) with a maintained library such as DOMPurify, configured with an allowlist.
3. **Content Security Policy** — the safety net when 1 and 2 fail:

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

Only scripts from your own origin or carrying the per-response random nonce will run; an injected `<script>` has no nonce, so the browser blocks it.

4. **HttpOnly cookies** so a successful XSS can't simply steal the session (though it can still act within the page).

## CSRF: abusing automatic cookies

Browsers attach cookies to requests going to a site, even when the request was started by **another** site. A hidden form on `evil.example` that posts to `bank.example/transfer` arrives with the victim's bank cookie.

- **`SameSite=Lax`** (now the browser default) stops cookies on cross-site POSTs; **`Strict`** stops them on all cross-site requests.
- **Anti-CSRF tokens:** a random value in each form that a third-party site can't read (thanks to the same-origin policy).
- Never perform state changes on **GET** requests.
- APIs using `Authorization: Bearer` headers (not cookies) aren't affected — browsers don't add those automatically.

## SSRF: making your server attack for you

Any feature where **your server fetches a URL the user supplies** — link previews, webhooks, PDF generators, image imports — can be pointed at internal targets: `http://169.254.169.254/` (cloud credentials), `http://localhost:6379/` (Redis), `http://10.0.0.5/admin`.

Defenses that actually work:

- **Allowlist** destinations where possible.
- Resolve the hostname and **block private, loopback and link-local addresses** — and check again after **every redirect**, and pin the resolved IP to stop DNS rebinding (the name resolving to a public IP for the check, then to an internal one for the fetch).
- Run fetchers in an isolated network with no route to internal systems.
- Use **IMDSv2** on AWS, which requires a token that a simple SSRF can't obtain.

## Injection beyond SQL

The pattern — data interpreted as code — appears everywhere:

- **NoSQL:** `{"password": {"$ne": null}}` sent where a string was expected matches any password. Validate types.
- **Command injection:** pass argument lists, never shell strings (Practices track).
- **Template injection:** user input rendered **as** a template (`render_template_string(user_input)`) can execute code on the server.
- **Header and log injection:** newlines in input can forge extra HTTP headers or fake log lines. Strip or encode control characters.
- **LDAP, XPath, GraphQL** — same idea, same fix: parameterize, validate, encode.

## File uploads

A "profile photo" upload can be an attack:

- Uploading `shell.php` to a folder the web server executes.
- An SVG "image" containing JavaScript (stored XSS).
- `../../etc/cron.d/x` as a filename (path traversal).
- A tiny ZIP that expands to 100 GB (a zip bomb).

Defenses: store uploads in **object storage**, not the web root; generate your own filenames; check the real content type; re-encode images; serve user content from a **separate domain** (like `usercontent.example`) so scripts in it can't touch your main site's cookies; scan for malware; limit sizes.

## Insecure deserialization

Formats like Java serialization, Python `pickle` and some YAML loaders can **create arbitrary objects** — and object creation can run code. Deserializing attacker-controlled data with them can mean remote code execution. Use plain data formats (JSON) with schema validation, and never unpickle untrusted input.

## Business-logic abuse

Some of the most expensive bugs aren't technical injections at all:

- Applying the same coupon 50 times in parallel requests (a race — Databases track, chapter 6).
- Setting a negative quantity to get a refund.
- Skipping a payment step by calling the "confirm order" API directly.
- Creating thousands of free trials with throwaway emails.

Defenses come from threat modeling (chapter 1): validate business rules on the server, use atomic operations and idempotency keys, enforce step order with server-side state, and rate-limit.

## Security headers checklist

| Header | Purpose |
|---|---|
| `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` | Always use HTTPS for this site |
| `Content-Security-Policy` | Control which scripts, styles and frames may load |
| `X-Content-Type-Options: nosniff` | Don't guess content types (stops some upload tricks) |
| `Referrer-Policy: strict-origin-when-cross-origin` | Don't leak full URLs to other sites |
| `Permissions-Policy` | Disable camera, microphone, geolocation unless needed |
| `frame-ancestors` (in CSP) | Prevent your pages being framed (clickjacking) |
| Cookies: `Secure; HttpOnly; SameSite=Lax` | Protect session cookies |

> [!RECAP]
> - The **same-origin policy** lets other sites send requests but not read responses; **CORS** deliberately relaxes it — use explicit allowlists.
> - **XSS** (stored, reflected, DOM): framework escaping, sanitization, **CSP with nonces**, HttpOnly cookies.
> - **CSRF**: SameSite cookies, tokens, no state changes on GET.
> - **SSRF**: allowlists, block internal addresses after resolution and redirects, isolate fetchers, IMDSv2.
> - Injection appears in NoSQL, templates, headers and logs; uploads, deserialization and **business logic** need their own defenses; send the standard **security headers**.

> [!INTERVIEW] Be ready to explain the same-origin policy and CORS precisely, the three kinds of XSS and how CSP stops them, why SameSite cookies stop most CSRF, how SSRF reaches cloud credentials, and how you'd secure a file-upload feature.

::quiz {"q":"What does CORS do?","options":["Protects against CSRF","Lets a server allow specific other origins to read its responses — it relaxes the same-origin policy","Encrypts requests","Blocks XSS"],"answer":1,"explain":"It's a controlled exception, not a defense."}

::quiz {"q":"How does a nonce-based Content Security Policy stop injected scripts?","options":["It encrypts scripts","Only scripts carrying this response's random nonce run; injected ones don't have it","It removes all JavaScript","It validates JSON"],"answer":1,"explain":"Attackers can't predict a fresh random nonce."}

::quiz {"q":"Why serve user-uploaded files from a separate domain?","options":["It's cheaper","Scripts hidden in uploads can't access the main site's cookies or pages, thanks to the same-origin policy","For SEO","To compress them"],"answer":1,"explain":"It contains the damage if a malicious file gets through."}
