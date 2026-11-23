---
title: Securing APIs and Microservices
summary: Protecting APIs that power mobile apps and partners — the OWASP API Top 10 (object-level authorization, excessive data exposure, mass assignment, missing rate limits), validating tokens correctly, zero-trust networking between services with mTLS and service meshes, secrets for services, and gateways, quotas and abuse detection.
---

## The API behind the app

> [!STORY] A popular fitness app's screens only show your own workouts. But a researcher opens the app's network traffic and finds the API call behind the screen: `GET /api/v2/users/18823/activities`. Changing the number returns anyone's runs — including GPS routes starting and ending at their homes. The mobile app was never the security boundary; **the API was**, and it trusted whatever ID the app sent. Several real fitness and social apps have leaked location data exactly this way.

Mobile apps, single-page web apps and partners all talk to **APIs**, and attackers talk to them directly — no UI rules apply. The **OWASP API Security Top 10** exists because APIs fail in their own particular ways.

## The most common API failures

::widget Stepper {"type":"hub","title":"The most common ways APIs get broken","what":"The center is the root mistake; each box is a frequent API vulnerability from the OWASP API Top 10, with an example and the fix.","steps":["Click the center first.","Click each box and decide whether your own APIs could have this problem.","Find the one that leaks data even when every authorization check passes."],"nodes":[["Trusting the client","APIs are called directly with crafted requests. Anything the UI hides, limits or validates must be enforced again on the server."],["Broken object-level authorization","GET /users/18823/activities returns anyone's data. Check, for every object, that the caller may access it (chapter 4). The number one API risk."],["Broken authentication","Tokens accepted without checking signature, expiry or audience; weak password reset; no brute-force protection on login APIs."],["Excessive data exposure","The API returns the whole user record — including email, phone and internal flags — and relies on the app to display only the name. Return only the fields the client needs, using explicit response models."],["Mass assignment","PATCH /users/me with {\"name\":\"A\",\"role\":\"admin\"} — and the framework copies every field into the database. Accept only an allowlist of writable fields."],["No resource limits","No rate limits, no maximum page size, unbounded GraphQL query depth: attackers scrape everything or exhaust your servers. Limit rates, sizes, depth and cost."],["Broken function-level authorization","A normal user calls /admin/users/export because only the UI hid it. Check the caller's role for every endpoint."]]}

### Mass assignment, concretely

```python
# Vulnerable: copies whatever the client sent
@app.patch("/users/me")
def update_me(body: dict, user = Depends(current_user)):
    for k, v in body.items():
        setattr(user, k, v)            # including is_admin, balance, email_verified...

# Fixed: an explicit input model with only the fields users may change
class UpdateMe(BaseModel):
    display_name: str | None = Field(max_length=80)
    bio: str | None = Field(max_length=500)

@app.patch("/users/me")
def update_me(body: UpdateMe, user = Depends(current_user)):
    user.display_name = body.display_name or user.display_name
    user.bio = body.bio or user.bio
```

The same thinking applies to responses: define **output models** so new database columns are never leaked by accident.

## Validating tokens correctly

Most APIs receive a **JWT access token**. Accepting one safely means checking all of:

- **Signature**, with the expected algorithm only (never accept `alg: none`, and never let the token choose between symmetric and asymmetric algorithms).
- **Issuer** (`iss`) — from your identity provider.
- **Audience** (`aud`) — issued **for this API**, not for some other service.
- **Expiry** (`exp`) and not-before (`nbf`), allowing small clock skew.
- **Scopes/permissions** for this endpoint.

Use a maintained library and fetch the provider's public keys from its JWKS endpoint (with caching). Keep access tokens short-lived (5–15 minutes).

> [!WARN] A token valid for "the reporting service" being accepted by "the payments service" because nobody checked the audience is a real and common bug. Audience checks are what stop one service's token being replayed against another.

## Between services: zero trust

The old model: a hard perimeter firewall, and everything inside trusted everything else. Once an attacker got one foothold, they could reach everything.

> [!ANALOGY] The old model is a castle with a moat: get over the wall once, and you can wander every room. **Zero trust** is an office building where every door needs your badge, every time, and the badge says exactly which doors you may open — even if you're already inside.

**Zero trust** principles: authenticate and authorize **every** request, even inside the network; give each workload its own identity; encrypt all traffic; grant least privilege.

::widget Architecture {"title":"Zero-trust service-to-service communication","what":"Services inside one cluster talking to each other. Every call is encrypted and authenticated with mutual TLS, and checked against a policy saying which service may call which.","steps":["Click each service to see its identity.","Notice that the orders service may call payments, but the reporting service may not.","Find where certificates come from and how often they rotate."],"nodes":[{"id":"gw","label":"API gateway","kind":"gateway","col":0,"row":1,"desc":"Validates end-user tokens, applies rate limits, and forwards requests with the user's identity."},{"id":"orders","label":"Orders service","kind":"service","col":1,"row":0,"desc":"Identity: spiffe://shop/orders. Allowed to call payments and inventory."},{"id":"reports","label":"Reporting service","kind":"service","col":1,"row":2,"desc":"Identity: spiffe://shop/reports. Read-only access to the warehouse; NOT allowed to call payments."},{"id":"pay","label":"Payments service","kind":"service","col":2,"row":0,"desc":"Accepts calls only from the orders service's identity, over mutual TLS, and still checks the end user's permissions."},{"id":"ca","label":"Identity / cert issuer","kind":"service","col":2,"row":2,"desc":"Issues each workload a short-lived certificate (hours), rotated automatically — no long-lived secrets to steal."},{"id":"db","label":"Payments DB","kind":"db","col":3,"row":0,"desc":"Only the payments service's identity has credentials for it."}],"edges":[["gw","orders","mTLS"],["gw","reports","mTLS"],["orders","pay","mTLS: allowed"],["pay","db","TLS"],["ca","orders","cert",true],["ca","pay","cert",true]]}

- **Mutual TLS (mTLS):** both client and server present certificates, so each knows exactly which service is on the other end, and all traffic is encrypted.
- **Service meshes** (Istio, Linkerd, Cilium) do mTLS, certificate rotation and service-to-service policy **automatically** through sidecar or node proxies, without changing application code.
- **Network policies** (Kubernetes) restrict which pods can even open connections to which.
- **Propagate the end user's identity** (a signed token) so downstream services can still check "may this **user** see this order?", not just "may the orders service call me?".

## Secrets for services

- Load secrets at runtime from a **secrets manager**; never bake them into images or commit them.
- Prefer **workload identity** (cloud IAM roles, Kubernetes service accounts) to static credentials altogether.
- Use **dynamic, short-lived database credentials** (e.g. Vault issuing a unique user per service instance that expires in hours).
- Scan repositories and images for leaked secrets in CI.

## The gateway's job, and abuse

An **API gateway** centralizes: TLS termination, token validation, **rate limits and quotas** per user, API key and IP (Token bucket — System Design track), request size limits, schema validation, and logging.

Beyond rate limits, detect **abuse patterns**: one account enumerating sequential IDs, scraping at a steady rate just under the limit, credential stuffing across accounts, or sudden traffic from new countries. Tools range from simple counters to bot-detection services and ML-based anomaly detection.

## Keep an inventory

You can't protect APIs you don't know about. "Shadow" endpoints — an old `/v1/` left running, a debug endpoint, a forgotten partner integration — are frequent breach points. Maintain an **inventory** (OpenAPI specs, gateway catalogs), retire old versions deliberately, and include every API in security testing.

> [!RECAP]
> - The API, not the app, is the security boundary; attackers call it directly.
> - Top API risks: **object-level authorization**, broken authentication, **excessive data exposure**, **mass assignment**, missing **resource limits**, function-level authorization.
> - Use explicit **input and output models**; validate JWT **signature, issuer, audience, expiry and scopes**.
> - **Zero trust**: per-workload identity, **mTLS** (often via a service mesh), network policies, and propagated user identity.
> - Short-lived, dynamic **secrets**; a **gateway** for limits and validation; abuse detection; an **API inventory**.

> [!INTERVIEW] "How would you secure this microservice architecture?" — cover authentication at the gateway, object-level authorization in services, token audience checks, mTLS and service identity, secrets management, rate limiting and monitoring.

::quiz {"q":"An API returns full user records and the app shows only the name. What's the vulnerability?","options":["Mass assignment","Excessive data exposure — attackers read the hidden fields directly","CSRF","SSRF"],"answer":1,"explain":"Return only the fields the client actually needs."}

::quiz {"q":"Why must an API check the token's audience (aud) claim?","options":["For logging","So a token issued for another service can't be replayed against this one","To check expiry","It's optional"],"answer":1,"explain":"Audience binds a token to its intended recipient."}

::quiz {"q":"What does mutual TLS add between services?","options":["Compression","Both sides prove their identity with certificates, and the traffic is encrypted","Rate limiting","Caching"],"answer":1,"explain":"It's the foundation of zero-trust service communication."}
