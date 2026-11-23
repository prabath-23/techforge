---
title: Browser Security Features: Safe Browsing, Certificates, Permissions, Passwords and Updates
summary: The protections a browser adds beyond the sandbox: Safe Browsing hash-prefix lookups and download protection, certificate verification with Certificate Transparency and HSTS, the permission model, password manager and autofill security, HTTPS-First mode, and why fast auto-updates are the most important security feature of all.
---

::widget Scene {"title": "Safe Browsing: checking a URL without revealing it", "sub": "hash prefixes, a local list, and a confirmation round trip", "nodes": [{"id": "u", "kind": "laptop", "label": "User clicks a link", "x": 3.72, "y": 3.72}, {"id": "br", "kind": "cube", "label": "Browser", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "loc", "kind": "disk", "label": "Local prefix list", "x": 2.33, "y": -6.67, "color": "orange"}, {"id": "gsb", "kind": "cloud", "label": "Safe Browsing server", "x": 13.22, "y": -5.78, "color": "blue"}, {"id": "warn", "kind": "doc", "label": "Red interstitial", "x": 13.8, "y": 4.8, "color": "red"}], "links": [["u", "br"], ["br", "loc"], ["br", "gsb", {"both": true}], ["br", "warn", {"dashed": true}]], "metrics": [["step", "Step"], ["privacy", "What Google learns"]], "steps": [{"short": "Click", "tag": "Start", "title": "You click http://free-gift.example/claim", "body": "<p>Is it phishing or malware? The browser must decide in milliseconds, without sending your browsing history to anyone.</p>", "show": ["u", "br"], "metrics": {"step": ["navigate"], "privacy": ["-"]}}, {"short": "Canon", "tag": "Canonicalise", "title": "Canonicalise the URL and build variants", "body": "<p>Host suffixes and path prefixes: free-gift.example/claim, free-gift.example/ …</p>"}, {"short": "Hash", "tag": "Hash", "title": "Hash each variant with SHA-256 and take a 4-byte prefix", "body": "<p>Only prefixes are compared locally.</p>", "show": ["u", "br", "loc"], "flow": [["br", "loc", "#f59e0b", "prefix 9a3f…?"]], "metrics": {"step": ["local prefix lookup"], "privacy": ["nothing"]}}, {"short": "Miss", "tag": "No match", "title": "No prefix match (the usual case): navigate immediately", "body": "<p>Zero network calls for most URLs.</p>", "metrics": {"step": ["safe → go"]}}, {"short": "Match", "tag": "Match", "title": "A prefix matches the local list", "body": "<p>Could be a collision, many URLs share 4-byte prefixes.</p>", "set": {"loc": {"badge": "prefix hit"}}}, {"short": "Ask", "tag": "Confirm", "title": "Ask the server for full hashes with that prefix", "body": "<p>The server only learns the prefix, shared by many URLs. (Newer real-time mode uses an OHTTP privacy proxy.)</p>", "show": ["u", "br", "loc", "gsb"], "flow": [["br", "gsb", "#3b82f6", "full hashes for 9a3f?"]], "metrics": {"step": ["full-hash request"], "privacy": ["a 4-byte prefix only", "good"]}}, {"short": "Block", "tag": "Block", "title": "Full hash matches \"social engineering\": show the warning", "body": "<p>The navigation throttle cancels it and shows a red interstitial.</p>", "show": ["u", "br", "loc", "gsb", "warn"], "flow": [["gsb", "br", "#ef4444", "match: phishing"]], "metrics": {"step": ["blocked", "good"]}}, {"short": "Downloads", "tag": "Downloads", "title": "Downloads get extra checks", "body": "<p>File hash and signer reputation; risky types (.exe from a new domain) are flagged, and Enhanced Protection can upload suspicious files for deep scanning.</p>"}, {"short": "Enterprise", "tag": "Enterprise", "title": "Enterprises can enforce Safe Browsing and block overrides", "body": "<p>Policies like SafeBrowsingProtectionLevel and DisableSafeBrowsingProceedAnyway.</p>", "note": {"kind": "key", "text": "Local hash-prefix list → rare server confirmation with only a prefix → interstitial. Fast, mostly offline, privacy-preserving."}}]}

## The browser is the front door

For most people, the browser is where phishing emails lead, where malware is downloaded, and where passwords are typed. Beyond the sandbox and site isolation (chapter 1), browsers layer several protections, and enterprise browsers add more on top (chapter 7).

## Safe Browsing

Google Safe Browsing (and similar services from Microsoft SmartScreen and others) protects against phishing, malware and unwanted software:

- **Standard protection** keeps a local list of **hash prefixes** of known-bad URLs, updated frequently. Most lookups are purely local; a prefix match triggers a request for full hashes with only the 4-byte prefix revealed.
- **Real-time checks** look up URLs as you browse through a privacy proxy, catching short-lived phishing sites.
- **Enhanced protection** adds deeper scanning of downloads, extension risk signals, and warnings about password reuse on phishing pages.
- **Download protection** checks file hashes, publisher signatures and reputation; dangerous files show warnings or are blocked.

## Certificates and HTTPS

To trust `https://bank.com`, the browser verifies:

1. A chain from the site certificate to a **trusted root** (Chrome now ships its own Chrome Root Store; enterprise roots can be added by policy).
2. Validity dates, name match (Subject Alternative Name), and key usage.
3. **Certificate Transparency** the certificate must appear in public CT logs (proved by signed timestamps). Misissued certificates become publicly visible.
4. **Revocation** Chrome relies mainly on CRLSets pushed by the browser rather than live OCSP checks.
5. **HSTS** sites on the preload list (or that sent the header before) can only be loaded over HTTPS; certificate errors can't be clicked through.

**HTTPS-First mode** tries HTTPS for every navigation and warns before falling back to HTTP. Mixed content (HTTP resources on HTTPS pages) is upgraded or blocked.

## The permission model

Powerful features, camera, microphone, location, notifications, clipboard, USB/Bluetooth, screen sharing, require **user permission per origin** granted through browser-controlled prompts the page can't spoof. Protections include:

- Permissions only for **secure contexts** (HTTPS).
- **Quiet UI** and auto-blocking for sites that spam notification prompts.
- One-time or "while visiting" grants, and auto-revocation for unused sites.
- **Permissions-Policy** headers let sites disable features in their own iframes.
- Enterprise policies can force-allow or block permissions for specific origins.

## Passwords and autofill

- The **password manager** fills credentials only on the exact origin they were saved for, phishing sites on look-alike domains get nothing, which makes it a strong anti-phishing tool.
- Stored secrets are encrypted with OS facilities (DPAPI on Windows, Keychain on macOS, the system keyring on Linux); app-bound encryption makes it harder for other programs running as the user to steal them.
- **Password checkup** warns about leaked, reused and weak passwords using privacy-preserving lookups.
- **Passkeys** (Security track, chapter 3) replace passwords where supported.

## Updates are the biggest security feature

Browsers ship security fixes every week or two, and attackers race to exploit patched bugs before users update ("n-day" attacks). Chromium-based browsers use background updaters (Omaha / Chrome's updater, or a vendor's own), **component updates** for data like CRLSets, Safe Browsing lists and certificate data without a full release, and a "relaunch to update" prompt with enterprise policies to force relaunch deadlines.

> [!WARN] A Chromium fork that falls behind upstream by even a few weeks ships known, public vulnerabilities. Rebasing quickly (chapter 6) is a security requirement, not a nice-to-have.

> [!RECAP]
> - **Safe Browsing**: local hash-prefix lists, prefix-only server checks, download reputation.
> - **Certificates**: chain to a trusted root, name and dates, **Certificate Transparency** CRLSets, **HSTS**; HTTPS-First mode.
> - **Permissions**: per-origin, secure contexts only, browser-owned prompts.
> - **Passwords**: origin-bound filling, OS-backed encryption, leak checks, passkeys.
> - **Fast updates** close the window between a public fix and exploitation.

> [!INTERVIEW] "How does Safe Browsing check URLs privately?", "What is Certificate Transparency?", "How does HSTS work?", "Why is a password manager an anti-phishing tool?", "Why must a Chromium fork track upstream closely?"

::quiz {"q": "How does standard Safe Browsing avoid sending every URL to a server?", "options": ["It doesn't check URLs", "It compares hash prefixes against a local list and only asks the server about prefix matches", "It encrypts the URL", "It checks only HTTPS sites"], "answer": 1, "explain": "Most lookups never leave the device."}

::quiz {"q": "What does Certificate Transparency achieve?", "options": ["Encrypts certificates", "Makes every issued certificate publicly logged, so misissuance is detectable", "Speeds up TLS", "Removes the need for CAs"], "answer": 1, "explain": "Browsers require proof of logging."}

::quiz {"q": "Why does the password manager help against phishing?", "options": ["It blocks emails", "It fills credentials only on the exact origin they were saved for", "It changes passwords daily", "It hides the URL"], "answer": 1, "explain": "A look-alike domain gets nothing filled in."}
