---
title: Authentication — From Passwords to Passkeys
summary: How systems prove who someone is — storing passwords properly, why credential stuffing and phishing work, the strengths and weaknesses of each second factor (SMS, authenticator apps, push, security keys), how passkeys make phishing impossible, sessions and tokens after login, account recovery, and service-to-service authentication.
---

::widget Scene {"title": "Passkeys: logins that can't be phished", "sub": "registration, a sign-in, and a fake site that gets nothing", "nodes": [{"id": "ph", "kind": "phone", "label": "Your phone (authenticator)", "x": 3.72, "y": 3.72}, {"id": "br", "kind": "laptop", "label": "Browser", "x": 8.22, "y": -0.78}, {"id": "site", "kind": "server", "label": "bank.com", "x": 9.0, "y": -9.0, "color": "blue"}, {"id": "fake", "kind": "server", "label": "bank-login.co (phishing)", "x": 16.44, "y": -1.56, "color": "red"}], "links": [["ph", "br"], ["br", "site"], ["br", "fake", {"dashed": true}]], "metrics": [["step", "Step"], ["secret", "Secret sent over the network"]], "steps": [{"short": "Pw", "tag": "Problem", "title": "Passwords get phished, reused and leaked", "body": "<p>Even OTP codes can be typed into a fake site and relayed in real time.</p>", "show": ["br", "site"], "metrics": {"step": ["—"], "secret": ["password (bad)"]}}, {"short": "Reg", "tag": "Register", "title": "Registration: the phone creates a key pair just for bank.com", "body": "<p>The private key stays in secure hardware; the public key goes to the bank.</p>", "show": ["ph", "br", "site"], "flow": [["ph", "br", "#22c55e", "public key"], ["br", "site", "#22c55e", ""]], "set": {"ph": {"badge": "private key for bank.com"}}, "metrics": {"step": ["register"], "secret": ["none"]}}, {"short": "Chal", "tag": "Sign in", "title": "Sign in: bank.com sends a random challenge", "body": "<p>A fresh one each time, so replies can't be replayed.</p>", "flow": [["site", "br", "#3b82f6", "challenge 8f2…"]], "metrics": {"step": ["challenge"]}}, {"short": "Bio", "tag": "Local check", "title": "You unlock with fingerprint or face", "body": "<p>Biometrics never leave the device — they only unlock the key.</p>", "set": {"ph": {"badge": "fingerprint ✓"}}}, {"short": "Sign", "tag": "Sign", "title": "The phone signs the challenge + the site's origin", "body": "<p>The browser tells it the real origin: bank.com.</p>", "flow": [["ph", "br", "#22c55e", "signature"], ["br", "site", "#22c55e", ""]], "metrics": {"step": ["signed"], "secret": ["none"]}}, {"short": "Verify", "tag": "Verify", "title": "The bank verifies with the stored public key", "body": "<p>Logged in. Nothing reusable was sent.</p>", "set": {"site": {"badge": "verified ✓"}}, "metrics": {"step": ["logged in", "good"]}}, {"short": "Phish", "tag": "Phishing", "title": "A phishing site bank-login.co asks you to sign in", "body": "<p>The browser reports origin bank-login.co. There's no key for that origin, so there's nothing to sign.</p>", "show": ["ph", "br", "site", "fake"], "flow": [["fake", "br", "#ef4444", "sign in?"]], "set": {"fake": {"badge": "gets nothing"}}, "metrics": {"secret": ["none — phishing fails", "good"]}}, {"short": "Leak", "tag": "Breach", "title": "If the bank's database leaks: only public keys", "body": "<p>Worthless to attackers.</p>"}, {"short": "Sync", "tag": "Recovery", "title": "Passkeys sync across your devices via your platform account", "body": "<p>Keep a recovery path (a second device or security key) for when a phone is lost.</p>", "note": {"kind": "key", "text": "Passkeys = per-site key pairs; the server stores a public key; login signs a challenge bound to the real origin — no shared secret to steal or phish."}}]}


## 15 billion leaked passwords

> [!STORY] An attacker doesn't need to hack your company to log into your customers' accounts. Billions of username-password pairs from breaches at other websites are freely traded. People reuse passwords, so the attacker simply tries those pairs on **your** login page — slowly, from thousands of different IP addresses. This is **credential stuffing**, and even a 0.5% success rate on a million attempts means 5,000 compromised accounts. Your security was fine; your users' habits weren't. Authentication design has to assume this.

**Authentication** answers "who are you?". **Authorization** (next chapter) answers "what may you do?". Mixing them up causes many of the worst bugs.

## Factors: what you know, have and are

- **Something you know:** a password or PIN.
- **Something you have:** a phone, a security key, a device's secure chip.
- **Something you are:** a fingerprint or face — usually used to **unlock** a device-held key rather than sent to a server.

**Multi-factor authentication (MFA)** combines two or more. But not all second factors are equal.

## Passwords, done properly

If you must store passwords (chapter 2 and Practices track):

- Hash with **Argon2id** (or bcrypt/scrypt) and a unique **salt** per user.
- Allow long passwords and passphrases; check new passwords against **known breached passwords** (e.g. the Have I Been Pwned list); drop rules like "must contain a symbol" and forced periodic changes, which push people toward predictable patterns (current NIST guidance).
- **Rate-limit** and add friction to login attempts per account and per IP; detect credential stuffing patterns (many accounts, few attempts each).
- Give **identical responses** for "wrong password" and "no such user", so attackers can't discover which emails have accounts.

## Second factors, from weakest to strongest

::widget Stepper {"type":"layers","title":"Second factors, from weakest (top) to strongest (bottom)","what":"Common second factors in order of how well they resist real attacks, especially phishing. Each box explains how the factor works and how it gets defeated.","steps":["Press Play from top to bottom.","For each, ask: could a fake login page trick the user into handing it over?","Find the first factor that can't be phished at all."],"nodes":[["SMS codes","A code texted to your phone. Better than nothing, but defeated by SIM swaps (an attacker convinces your carrier to move your number) and by phishing pages that ask you to type the code."],["Email codes / magic links","Only as strong as the email account — which often uses the same reused password."],["Authenticator app codes (TOTP)","A 6-digit code that changes every 30 seconds, from a secret shared once via QR code. Immune to SIM swaps, but a real-time phishing site can still ask for the code and use it instantly."],["Push approval","'Is this you signing in?' on your phone. Convenient, but attackers spam requests until a tired user taps Approve ('MFA fatigue'). Number matching — typing a number shown on the login screen — helps."],["Security keys and passkeys (FIDO2/WebAuthn)","A private key on a hardware key or in your phone/laptop signs a challenge that includes the website's real domain. A fake site gets a signature for the wrong domain, which is useless. Phishing-resistant by design."]]}

> [!EXAMPLE] **Google's security key rollout.** After Google required physical security keys for its 85,000+ employees' work accounts in 2017, it reported no successful account takeovers through phishing among them. The same technology now powers consumer **passkeys**.

## Passkeys: logging in without a password

A **passkey** is a key pair created for one website:

1. **Sign-up:** your device creates a key pair for `bank.example`, keeps the private key in its secure hardware (synced across your devices by your password manager or platform), and sends the **public key** to the website.
2. **Login:** the website sends a random challenge. Your device asks for your fingerprint, face or PIN (which never leaves the device), then signs the challenge **together with the website's domain**.
3. The website verifies the signature with the stored public key.

> [!ANALOGY] A passkey is like a signet ring that only works on letters addressed to the right recipient. A forger can set up a convincing fake bank, but the ring refuses to seal a letter addressed to "bannk.example" — and a seal for the wrong address is worthless at the real bank.

Why it's better: nothing reusable to steal from the server (only public keys), nothing for users to remember or reuse, and **phishing doesn't work** because the domain is part of the signature.

## After login: sessions and tokens

Once someone has proven who they are, the server gives them something to present with every request (Practices track, security chapter):

- **Session cookies** for web apps — `HttpOnly`, `Secure`, `SameSite`, rotated at login (to prevent session fixation), with idle and absolute timeouts.
- **Short-lived access tokens + refresh tokens** for mobile apps and APIs, with refresh-token rotation so a stolen one is detected when reused.
- **Re-authenticate** for sensitive actions — changing email or password, adding a payee, large transfers — even within a valid session ("step-up authentication").
- Let users see and revoke their active sessions and devices.

## Account recovery: the back door

> [!WARN] Recovery is where strong authentication quietly goes to die. If "forgot password" emails a reset link, account security equals email security. If support agents can reset MFA after a few personal questions, attackers will call support. Make recovery as strong as login: recovery codes saved at setup, a second registered passkey, waiting periods and notifications for recovery attempts, and careful identity verification for support-assisted resets.

Reset links must be **single-use**, expire quickly (minutes to an hour), be bound to the account, and invalidate existing sessions when used.

## Single sign-on and federated identity

In companies, users sign in once with an **identity provider** (Okta, Microsoft Entra ID, Google Workspace) and access many apps through **SAML** or **OpenID Connect** (Practices track covers the OIDC flow). Benefits: one place to enforce MFA and passkeys, and one switch to turn off access when someone leaves.

## Machines authenticating machines

Services also need to prove their identity to each other:

- **Mutual TLS (mTLS):** both sides present certificates — common inside service meshes (chapter 6).
- **Workload identity:** the platform gives each workload a short-lived, automatically rotated identity (Kubernetes service account tokens, cloud IAM roles, SPIFFE IDs) — no long-lived secrets to leak.
- **API keys** for external customers: long random values, shown once, stored hashed, scoped to specific permissions, and rotatable.

> [!RECAP]
> - **Credential stuffing** makes reused passwords your problem; rate-limit, detect, and check for breached passwords.
> - Store passwords with **Argon2id + salt**; give identical errors for unknown users and wrong passwords.
> - Second factors vary: **SMS** < email < **TOTP** < push < **security keys/passkeys**, the only phishing-resistant option.
> - **Passkeys** sign a challenge bound to the real domain; the server stores only public keys.
> - Secure sessions, **step-up authentication** for sensitive actions, and **recovery as strong as login**.
> - Services authenticate with **mTLS** and **short-lived workload identities**, not shared secrets.

> [!INTERVIEW] Expect "design login for a bank": password storage, MFA choices and their weaknesses, passkeys, rate limiting and credential-stuffing defenses, session handling, and secure account recovery.

::quiz {"q":"Why are passkeys resistant to phishing?","options":["They're longer than passwords","The signature includes the website's real domain, so a fake site's request is useless","They use SMS","They're stored on the server"],"answer":1,"explain":"The device refuses to produce a valid login for the wrong domain."}

::quiz {"q":"An attacker tries one leaked password per account across 100,000 accounts from many IPs. What's this?","options":["Brute force on one account","Credential stuffing","SQL injection","Session fixation"],"answer":1,"explain":"Detect patterns across accounts, not just per account."}

::quiz {"q":"Why must account recovery be designed as carefully as login?","options":["It's used more often","Attackers target the weakest path in; a weak recovery flow bypasses strong login","It's required by browsers","It isn't important"],"answer":1,"explain":"Security is only as strong as the easiest way in."}
