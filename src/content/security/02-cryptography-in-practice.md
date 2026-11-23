---
title: Cryptography in Practice — What to Use, and How Not to Break It
summary: The handful of cryptographic tools engineers actually use — hashing, MACs, symmetric encryption, public-key encryption and signatures, key exchange — explained with everyday analogies, which algorithms to choose today, how keys are managed with KMS and envelope encryption, and the classic mistakes that break otherwise-strong crypto.
---

::widget Scene {"title": "Envelope encryption with a KMS", "sub": "encrypting a customer file so even a database leak reveals nothing", "nodes": [{"id": "app", "kind": "server", "label": "App", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "kms", "kind": "cube", "label": "KMS (master key never leaves)", "x": 2.33, "y": -6.67, "color": "purple"}, {"id": "dek", "kind": "doc", "label": "Data key (DEK)", "x": 8.22, "y": -0.78, "color": "orange"}, {"id": "file", "kind": "doc", "label": "Customer file", "x": 9.3, "y": 9.3}, {"id": "store", "kind": "disk", "label": "Storage: ciphertext + wrapped DEK", "x": 15.82, "y": -2.18, "color": "teal"}], "links": [["app", "kms"], ["app", "dek"], ["dek", "file", {"dashed": true}], ["app", "store"]], "metrics": [["step", "Step"], ["plain", "Plaintext key exists"]], "steps": [{"short": "Need", "tag": "Problem", "title": "Encrypt millions of files without one key in a config file", "body": "<p>A key stored next to the data protects nothing.</p>", "show": ["app", "file"], "metrics": {"step": ["—"], "plain": ["—"]}}, {"short": "Gen", "tag": "Data key", "title": "Ask the KMS for a new data key", "body": "<p>It returns the key twice: in plaintext, and encrypted (\"wrapped\") under the master key.</p>", "show": ["app", "file", "kms", "dek"], "flow": [["app", "kms", "#a855f7", "GenerateDataKey"], ["kms", "app", "#a855f7", "DEK + wrapped DEK"]], "metrics": {"step": ["generate DEK"], "plain": ["in app memory"]}}, {"short": "Encrypt", "tag": "Encrypt", "title": "Encrypt the file locally with AES-256-GCM", "body": "<p>Fast, any size, and GCM detects tampering. A fresh random nonce every time.</p>", "flow": [["dek", "file", "#f59e0b", "encrypt"]], "metrics": {"step": ["encrypt data"]}}, {"short": "Forget", "tag": "Discard", "title": "Throw away the plaintext DEK", "body": "<p>Store only ciphertext + wrapped DEK together.</p>", "show": ["app", "file", "kms", "dek", "store"], "set": {"dek": {"dim": true, "badge": "wiped"}}, "flow": [["app", "store", "#14b8a6", "ciphertext + wrapped DEK"]], "metrics": {"step": ["store"], "plain": ["nowhere", "good"]}}, {"short": "Leak", "tag": "Breach", "title": "Attacker steals the storage", "body": "<p>They have encrypted data and an encrypted key — useless without the KMS.</p>", "set": {"store": {"badge": "stolen: unreadable"}}}, {"short": "Read", "tag": "Decrypt", "title": "To read: send the wrapped DEK to KMS for unwrapping", "body": "<p>KMS checks IAM policy, logs the request, returns the DEK; the app decrypts locally.</p>", "flow": [["app", "kms", "#a855f7", "Decrypt(wrapped)"]], "set": {"dek": {"dim": false, "badge": "temporary"}}, "metrics": {"step": ["decrypt"], "plain": ["briefly, in memory"]}}, {"short": "Audit", "tag": "Control", "title": "Every decrypt is an auditable, revocable API call", "body": "<p>Revoke the app's permission and all data becomes unreadable instantly.</p>"}, {"short": "Rotate", "tag": "Rotation", "title": "Rotate the master key without re-encrypting files", "body": "<p>Only small wrapped DEKs need re-wrapping. Per-tenant master keys allow \"crypto-shredding\": delete the key, data is gone.</p>", "note": {"kind": "key", "text": "Envelope encryption: a data key encrypts the data; a KMS master key encrypts the data key. Keys never sit beside data in plaintext; access is logged and revocable."}}]}


## Strong locks, key under the mat

> [!STORY] A company encrypts every customer's documents with AES-256 — a cipher no one has ever broken. Then an attacker reads all of them anyway. How? The encryption key was stored in the same database as the documents, in a column named `encryption_key`. Real-world cryptography almost never fails because the math is broken. It fails because of how it's **used**: keys stored next to data, home-made schemes, reused nonces, or the wrong tool for the job.

The rule that prevents most disasters: **don't invent your own cryptography, and use well-known libraries with safe defaults** (libsodium, Google Tink, your platform's standard TLS). This chapter is about understanding the tools well enough to choose and use them correctly.

## The toolbox

::widget Stepper {"type":"hub","title":"The five cryptographic tools engineers use","what":"The center is the question each tool answers; each box is one tool, its everyday analogy, and what to use today.","steps":["Click the center first.","Click each tool and note what it protects: secrecy, integrity, or identity.","Find which tool proves who sent a message without sharing any secret."],"nodes":[["Which tool do I need?","Hide data (confidentiality)? Detect changes (integrity)? Prove who sent it (authenticity)? Agree on a secret over a public network? Each tool answers one of these."],["Hash (SHA-256, BLAKE3)","A fingerprint: any input → a fixed-size value. Change one bit, and the fingerprint changes completely; you can't reverse it. Used for file checksums, content addresses (Git), and as a building block. Not for passwords on its own — too fast."],["MAC (HMAC-SHA256)","A fingerprint that needs a secret key to make or check. Proves the message wasn't changed and came from someone with the key. Used for webhook signatures, signed cookies, API request signing."],["Symmetric encryption (AES-GCM, ChaCha20-Poly1305)","One shared key locks and unlocks. Fast — used for nearly all bulk data. Use an 'authenticated' mode (AEAD) that also detects tampering."],["Public-key encryption and signatures (Ed25519, ECDSA, RSA)","A key pair: the public key can be shared with everyone; the private key stays secret. Sign with the private key, and anyone can verify with the public key — proving who signed. Used for TLS certificates, code signing, JWTs, SSH."],["Key exchange (ECDH, X25519)","Two parties who've never met agree on a shared secret over a public channel, even while being overheard. Then they switch to fast symmetric encryption. The heart of every TLS connection."]]}

### Symmetric vs public-key, in one analogy

> [!ANALOGY] **Symmetric encryption** is a lockbox with one key that you and a friend both have copies of. Fast and simple — but how did you get the key to your friend safely? **Public-key cryptography** is a padlock you hand out freely: anyone can snap it shut on a box addressed to you, but only your private key opens it. And a **signature** is like a wax seal that only you can make but anyone can recognize. In practice, systems use public-key crypto to set up a shared key, then symmetric encryption for the actual data — exactly what TLS does (Networking track).

## What to choose today

| Purpose | Use | Avoid |
|---|---|---|
| Encrypt data | **AES-256-GCM** or **ChaCha20-Poly1305** (authenticated) | AES-ECB, AES-CBC without a MAC, DES, RC4 |
| Hash / fingerprint | **SHA-256**, SHA-3, BLAKE3 | MD5, SHA-1 (broken for collisions) |
| Message authentication | **HMAC-SHA256** | Home-made "hash(key + message)" |
| Signatures | **Ed25519**, ECDSA P-256, RSA-PSS (≥ 3072-bit) | RSA with PKCS#1 v1.5 padding for new designs |
| Key exchange | **X25519**, ECDH P-256 | Static RSA key transport |
| Passwords | **Argon2id**, scrypt, bcrypt | Any plain fast hash |
| Random numbers | The OS's secure generator (`crypto.randomBytes`, `secrets`) | `Math.random()`, `rand()` |
| Transport | **TLS 1.3** (1.2 minimum) | SSL, TLS 1.0/1.1 |

> [!EXAMPLE] **Why ECB mode is broken.** ECB encrypts each 16-byte block independently, so identical input blocks produce identical output blocks. Encrypt a bitmap image of a penguin with ECB, and you can still see the penguin's outline in the "encrypted" image. Authenticated modes like GCM mix in a unique number per message, so patterns disappear and tampering is detected.

> [!NOTE] **Post-quantum cryptography.** A large future quantum computer could break today's public-key algorithms (RSA, elliptic curves), though not AES-256 or SHA-256. Attackers may record encrypted traffic now to decrypt later, so browsers and major services have already started using **hybrid** key exchange combining X25519 with the new standardized **ML-KEM** algorithm. Expect this to become the default.

## Key management: where most systems fail

The math is solid; keys are the weak point. Good practice:

- **Never store keys next to the data they protect**, in source code, or in config files committed to Git.
- Use a **key management service** (AWS KMS, Google Cloud KMS, Azure Key Vault, HashiCorp Vault) or a **hardware security module (HSM)**, where master keys never leave secure hardware.
- **Rotate** keys regularly, and design so rotation doesn't require downtime.
- Control and **audit** who can use each key.

### Envelope encryption

How do you encrypt terabytes with a key that never leaves the KMS?

1. Ask the KMS for a fresh **data key**. It returns the data key in plain form **and** encrypted under your master key.
2. Encrypt your data locally with the plain data key (fast AES).
3. Store the **encrypted data key** alongside the encrypted data, and throw the plain data key away.
4. To decrypt: send the encrypted data key to the KMS (which checks permissions and logs the request), get the plain data key back, decrypt locally.

> [!ANALOGY] Each document is locked in its own box with its own small key. Those small keys are locked inside a bank vault (the KMS) that only opens for authorized people and keeps a record of every visit. Stealing the boxes — even with their locked-up small keys — gets an attacker nothing without access to the vault.

Envelope encryption also makes **rotation** cheap: re-encrypt the small data keys with a new master key, not all the data. And deleting a data key "crypto-shreds" its data — useful for honoring deletion requests.

## Classic mistakes

- **Home-made crypto:** "we XOR with a secret and base64 it". Base64 is encoding, not encryption.
- **Reusing a nonce** with AES-GCM: the same key + nonce twice can reveal plaintext and allow forgeries. Let the library generate nonces.
- **Comparing MACs with `==`:** a normal comparison stops at the first different byte, and the timing leaks how many bytes matched. Use a **constant-time** comparison (`hmac.compare_digest`, `crypto.timingSafeEqual`).
- **Encryption without authentication:** attackers can flip bits in ciphertext to change the decrypted result predictably. Use AEAD modes.
- **Weak randomness** for tokens, IDs or keys: use the OS's cryptographically secure generator.
- **Ignoring certificate validation** (`verify=False`) "just to make it work" — it removes all protection against interception.

> [!RECAP]
> - Crypto fails through **misuse**, not broken math; use well-known libraries with safe defaults.
> - **Hash** = fingerprint; **MAC** = keyed fingerprint; **symmetric** = one shared key (AES-GCM); **public-key** = key pairs for signatures and key exchange.
> - Choose **AES-GCM / ChaCha20-Poly1305, SHA-256, HMAC, Ed25519, X25519, Argon2id, TLS 1.3**; avoid MD5, SHA-1, ECB, `Math.random`.
> - Keep keys in a **KMS/HSM**; use **envelope encryption**; rotate and audit.
> - Avoid nonce reuse, non-constant-time comparisons, unauthenticated encryption and disabled certificate checks.

> [!INTERVIEW] Explain symmetric vs asymmetric crypto and why TLS uses both; hashing vs encryption; what a MAC is for (e.g. verifying webhooks); how you'd store encryption keys; and envelope encryption with KMS.

::quiz {"q":"How should a service verify that a webhook really came from Stripe?","options":["Check the sender's IP only","Verify an HMAC signature of the body using the shared secret, with a constant-time comparison","Decrypt it with AES","Hash it with MD5"],"answer":1,"explain":"A MAC proves both integrity and possession of the shared secret."}

::quiz {"q":"What's the main benefit of envelope encryption?","options":["It's faster than AES","Bulk data is encrypted locally with data keys, while the master key never leaves the KMS — and access is audited","It removes the need for keys","It compresses data"],"answer":1,"explain":"It also makes key rotation and crypto-shredding cheap."}

::quiz {"q":"Which is NOT encryption?","options":["AES-GCM","ChaCha20-Poly1305","Base64","RSA-OAEP"],"answer":2,"explain":"Base64 is reversible encoding with no key at all."}
