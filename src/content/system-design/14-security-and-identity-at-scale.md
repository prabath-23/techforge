---
title: Security and Identity at Scale
summary: Designing authentication and authorization for systems with millions of users and hundreds of services — a central identity provider, token-based sessions and their revocation problem, permission checks that stay fast (Zanzibar-style), multi-tenant isolation, secrets and keys across a fleet, encryption everywhere, audit logging, abuse prevention, and how these show up in system design interviews.
---

## One login, a thousand services

> [!STORY] When you sign in to Google once, you can use Gmail, YouTube, Drive, Maps and Calendar without signing in again — across devices. Behind that are hundreds of services, each needing to know **who you are** and **what you may do**, millions of times per second, without asking a central database every time and without letting a stolen token work forever. When an employee leaves, their access everywhere must stop within minutes. When you share a document, the change must apply instantly across the world. Identity and permissions at scale is a distributed systems problem in its own right.

The Security track covers the individual techniques. This chapter is about **architecture**: how the pieces fit together in a large system design.

## The big picture

::widget Architecture {"title":"Identity and access in a large system","what":"How users sign in once and how every request is authenticated and authorized across many services. Follow a request from the client through the gateway to the services and the permission system.","steps":["Follow the sign-in path to the identity provider.","Then follow an ordinary request: what does the gateway check, and what does each service still check itself?","Click the authorization service to see how 'can this user see this document?' is answered quickly."],"nodes":[{"id":"user","label":"User (web / mobile)","kind":"client","col":0,"row":1,"desc":"Signs in once; holds a session cookie (web) or short-lived access token plus refresh token (mobile)."},{"id":"idp","label":"Identity provider","kind":"service","col":1,"row":0,"desc":"Handles login, MFA and passkeys, social login and enterprise SSO (OIDC/SAML). Issues signed tokens. Holds the user directory."},{"id":"gw","label":"API gateway","kind":"gateway","col":1,"row":1,"desc":"Validates the token's signature, expiry and audience locally (using cached public keys), applies rate limits, and forwards the verified identity to services."},{"id":"svcA","label":"Docs service","kind":"service","col":2,"row":1,"desc":"Still checks object-level permission for every document it returns — never trusts that the gateway did it."},{"id":"svcB","label":"Billing service","kind":"service","col":2,"row":2,"desc":"Checks the user's role in the organization (admin only) before showing invoices."},{"id":"authz","label":"Authorization service","kind":"service","col":3,"row":1,"desc":"Answers 'can user U do action A on resource R?' from relationship tuples (Zanzibar-style), with caching. One consistent source of truth for sharing and roles."},{"id":"keys","label":"KMS / secrets manager","kind":"storage","col":3,"row":0,"desc":"Signing keys, encryption keys and service credentials, rotated automatically; services fetch short-lived credentials at runtime."},{"id":"audit","label":"Audit log","kind":"queue","col":3,"row":2,"desc":"Append-only record of logins, permission changes and sensitive actions, shipped to a separate account for security and compliance."}],"edges":[["user","idp","sign in"],["user","gw","token"],["gw","svcA","identity"],["gw","svcB","identity"],["svcA","authz","check"],["svcB","authz","check"],["idp","keys","signing key",true],["svcA","audit","events",true]]}

## Authentication: a central identity provider

Don't let every service handle passwords. A single **identity provider (IdP)** — built in-house or using Auth0/Okta/Cognito/Keycloak, plus enterprise SSO for business customers — handles:

- Sign-up, login, MFA and passkeys, password resets, account recovery (Security track, chapter 3).
- Issuing tokens via **OpenID Connect**; supporting "Sign in with Google/Apple" and SAML for enterprise customers.
- Device and session management, risk signals (new device, impossible travel), and bot/abuse protection on login.

## Sessions and tokens: the revocation problem

Services need to verify identity **without** calling the IdP on every request. The usual answer is a **signed token** (JWT): any service can check its signature with the IdP's public key.

But a signed token stays valid until it expires — even if the user logs out, changes their password, or is fired. The standard compromise:

- **Short-lived access tokens** (5–15 minutes), verified locally — fast.
- **Long-lived refresh tokens** stored server-side, exchanged at the IdP for new access tokens — this is the point where revocation is enforced.
- For urgent revocation (a compromised account), push a **revocation list** or "tokens issued before time T for user U are invalid" to gateways, cached briefly.

> [!ANALOGY] A day pass at a theme park. Rides check the stamp quickly without phoning the office — but the pass only lasts a day. To keep going tomorrow, you return to the ticket office (refresh), where they can refuse you if you misbehaved. Short passes limit how long a stolen one is useful.

For browser apps, many teams prefer **server-side sessions** (an opaque cookie, looked up in a fast store like Redis) at the edge, converted by the gateway into an internal signed token for services — easy revocation outside, cheap verification inside.

## Authorization: fast, consistent permission checks

As products grow, permissions become complex: organizations, teams, roles, shared documents, folders inheriting access, public links (Security track, chapter 4). Scattering `if` statements across services leads to inconsistencies and holes.

A central **authorization service** — often modeled on Google's **Zanzibar** (open-source: SpiceDB, OpenFGA) — stores relationships ("Asha is editor of folder F; doc D is in folder F") and answers `check(user, action, resource)`:

- **Fast:** heavy caching, denormalized indexes for common checks, often single-digit milliseconds.
- **Consistent:** Zanzibar issues consistency tokens ("zookies") so a check made after a permission change sees that change — preventing the "new enemy problem" (removing someone's access, then adding sensitive content they can still see because of a stale cache).
- **List queries:** "which documents can Asha see?" is harder than a single check; search systems filter with precomputed access lists or post-filter.

Coarse checks (is the token valid? does it have the `docs.read` scope?) happen at the gateway; **object-level** checks happen in each service, every time.

## Multi-tenancy

For B2B products, the worst failure is one customer seeing another's data. At scale:

- Every request carries a **tenant ID derived from the authenticated identity**, never from user input.
- Data is isolated by tenant: a tenant column enforced by row-level security, a schema per tenant, or a database per large tenant ("silo" vs "pool" models) — trading cost against isolation.
- Noisy-neighbor protection: per-tenant rate limits and quotas.
- Per-tenant encryption keys for large customers (sometimes customer-managed keys).

## Secrets, keys and encryption across a fleet

- **No long-lived secrets in code or config.** Services get **workload identities** and short-lived credentials (Security track, chapter 6).
- **Keys in a KMS/HSM**; **envelope encryption** for data at rest; automated **rotation** (including token-signing keys, with overlap so old tokens still verify during rotation — publish multiple keys in a JWKS).
- **TLS everywhere**, including inside the data center; **mTLS** between services.
- **Field-level encryption or tokenization** for the most sensitive data (card numbers, government IDs), so most systems only ever see tokens.

## Audit, detection and abuse

- **Audit logs** of sign-ins, permission changes, admin actions and data exports, stored append-only in a separate account, searchable for investigations and required for compliance (SOC 2, ISO 27001, PCI DSS).
- **Detection:** alerts on impossible travel, mass downloads, privilege escalation, token reuse.
- **Abuse prevention** at scale: rate limits, bot detection, credential-stuffing defenses, fraud scoring on sign-ups and payments.
- **Least-privilege for employees:** just-in-time, approved, time-limited access to production and customer data, with every access logged.

## In a system design interview

You don't need to design the whole identity platform every time, but strong candidates mention, unprompted:

1. **Authentication** at the edge (an IdP, tokens or sessions) and how services learn the user's identity.
2. **Authorization** for every object access, with the data model for permissions if sharing is part of the problem (Google Docs, Dropbox, Slack).
3. **Tenant isolation** for B2B systems.
4. **Rate limiting** and abuse prevention for public endpoints.
5. **Encryption** in transit and at rest, and **secrets management**.
6. **Audit logging** for sensitive actions.

> [!RECAP]
> - Use a central **identity provider** (OIDC, SSO, MFA, passkeys); services verify **signed tokens** locally.
> - Balance speed and revocation with **short-lived access tokens + refresh tokens**, server-side sessions at the edge, and revocation lists for emergencies.
> - Centralize permission logic in a **Zanzibar-style authorization service**: fast, cached and consistent; check every object in services.
> - Enforce **tenant isolation** from the authenticated identity; protect against noisy neighbors.
> - Manage **keys and secrets** centrally with rotation; encrypt everywhere; tokenize the most sensitive data.
> - Keep **audit logs**, detect abuse, and apply least privilege to employees too.

> [!INTERVIEW] Expect follow-ups like "how do you log a user out everywhere immediately?", "how does a service know the user's identity?", "how would you model sharing in Google Drive?" and "how do you keep tenants isolated?".

::quiz {"q":"Why keep JWT access tokens short-lived?","options":["They're expensive to sign","A signed token can't easily be revoked before it expires, so short lifetimes limit the damage of theft or logout","Browsers reject long tokens","For compression"],"answer":1,"explain":"Refresh tokens, checked centrally, provide the revocation point."}

::quiz {"q":"What does Zanzibar's consistency token prevent?","options":["Slow logins","The 'new enemy' problem — a stale permission cache letting a removed user see newly added content","Password reuse","DDoS attacks"],"answer":1,"explain":"Checks after a permission change are guaranteed to see it."}

::quiz {"q":"Where should a request's tenant ID come from in a multi-tenant SaaS?","options":["A URL parameter","The authenticated identity/token","A cookie set by JavaScript","The request body"],"answer":1,"explain":"Never trust the client to say which tenant it belongs to."}
