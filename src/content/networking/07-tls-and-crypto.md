---
title: TLS and Encryption — How the Padlock in Your Browser Works
summary: How two computers that have never met can agree on a secret key while everyone is listening, how your browser knows it's talking to the real bank and not an impostor, what actually happens in the TLS handshake behind every HTTPS connection, and the real-world failures — from expired certificates to Heartbleed.
---

::widget Scene {"title": "The TLS 1.3 handshake", "sub": "key exchange, certificate check, and an encrypted request — in one round trip", "nodes": [{"id": "c", "kind": "laptop", "label": "Browser", "x": 3.72, "y": 3.72}, {"id": "s", "kind": "server", "label": "bank.com", "x": 9.72, "y": -2.28, "color": "blue"}, {"id": "ca", "kind": "doc", "label": "Trusted root CAs", "x": -2.17, "y": -2.17, "color": "green"}, {"id": "k", "kind": "cube", "label": "Shared secret", "x": 12.3, "y": 6.3, "color": "orange"}], "links": [["c", "s", {"both": true}], ["c", "ca", {"dashed": true}]], "metrics": [["msg", "Message"], ["know", "Attacker can see"], ["safe", "Status"]], "steps": [{"short": "Goal", "tag": "Goal", "title": "Three goals: privacy, integrity, authenticity", "body": "<p>Nobody can read it, nobody can change it, and you're really talking to bank.com.</p>", "show": ["c", "s"], "metrics": {"msg": ["—"], "know": ["everything"], "safe": ["plain", "bad"]}}, {"short": "Hello", "tag": "ClientHello", "title": "ClientHello: supported ciphers + a key share", "body": "<p>The browser picks a random secret a and sends A = g^a (Diffie-Hellman). Also the name bank.com (SNI).</p>", "flow": [["c", "s", "#3b82f6", "hello + A"]], "metrics": {"msg": ["ClientHello"], "know": ["A (public)"]}}, {"short": "SHello", "tag": "ServerHello", "title": "ServerHello: chosen cipher + its key share B = g^b", "body": "<p>Both sides can now compute the same secret g^ab. An eavesdropper sees A and B but can't compute it.</p>", "show": ["c", "s", "k"], "flow": [["s", "c", "#a855f7", "B"]], "set": {"k": {"badge": "g^ab (both sides)"}}, "metrics": {"msg": ["ServerHello"], "know": ["A, B — not the secret"]}}, {"short": "Encrypt", "tag": "Encrypted", "title": "Everything after this is encrypted", "body": "<p>Keys are derived from the shared secret. Even the certificate is hidden from observers.</p>", "metrics": {"safe": ["encrypted", "good"]}}, {"short": "Cert", "tag": "Certificate", "title": "Server sends its certificate chain", "body": "<p>\"bank.com's public key is X\", signed by an intermediate CA, signed by a root CA.</p>", "flow": [["s", "c", "#a855f7", "cert chain"]], "metrics": {"msg": ["Certificate"]}}, {"short": "Verify", "tag": "Verify", "title": "Browser verifies the chain up to a root it trusts", "body": "<p>Signatures valid, not expired, not revoked, and the name matches bank.com.</p>", "show": ["c", "s", "k", "ca"], "flow": [["c", "ca", "#22c55e", "root trusted?"]], "set": {"c": {"badge": "chain ✓ name ✓"}}}, {"short": "Proof", "tag": "Proof", "title": "CertificateVerify: server signs the handshake with its private key", "body": "<p>Proves it owns the key in the certificate — and that nobody tampered with the hello messages. Stops man-in-the-middle.</p>", "flow": [["s", "c", "#a855f7", "signature"]], "metrics": {"msg": ["CertificateVerify + Finished"]}}, {"short": "Request", "tag": "Data", "title": "Browser sends Finished + the HTTP request", "body": "<p>One round trip total before the first request.</p>", "flow": [["c", "s", "#22c55e", "GET /account (encrypted)"]], "metrics": {"msg": ["application data"], "know": ["sizes and timing only"]}}, {"short": "Forward", "tag": "Forward secrecy", "title": "Keys are thrown away after the session", "body": "<p>Even if the server's private key leaks next year, recorded traffic can't be decrypted — a and b are gone.</p>", "set": {"k": {"badge": "ephemeral"}}}, {"short": "Resume", "tag": "Resumption", "title": "Next visit: resume with a ticket, even 0-RTT", "body": "<p>0-RTT data can be replayed, so only safe (idempotent) requests use it.</p>", "note": {"kind": "key", "text": "TLS 1.3: Diffie-Hellman for a shared secret, certificates + signatures for identity, symmetric encryption for data, ephemeral keys for forward secrecy."}}]}

## The problem: talking privately in a crowded room

When you log in to your bank, your password travels through your Wi-Fi router, your internet provider, several other networks and the bank's data center. Any of them could, in principle, read or change the data. On café Wi-Fi, the person at the next table might be watching too (chapter 1's ARP spoofing).

**TLS** (Transport Layer Security) solves this. It's the "S" in **HTTPS**, and it gives three guarantees:

1. **Confidentiality** — eavesdroppers see only scrambled data.
2. **Integrity** — if anyone tampers with the data in transit, it's detected.
3. **Authentication** — you're really talking to `yourbank.com`, not an impostor.

Today more than 95% of web page loads in Chrome use HTTPS. To understand how TLS works, we need three tools from cryptography — explained without math.

## Tool 1: Symmetric encryption — one shared key

**Symmetric encryption** uses the same secret key to lock and unlock data. It's extremely fast: modern CPUs have built-in instructions for **AES**, the standard algorithm, and can encrypt gigabytes per second.

> [!ANALOGY] A lockbox with one key. Whoever has a copy of the key can lock things in and unlock them. Fast and simple — but how do you get a copy of the key to your friend in the first place, when every courier might be a spy?

That's the **key distribution problem**, and for most of history it was solved with trusted couriers and codebooks. On the internet, you can't send a courier to every website you visit.

## Tool 2: Public-key cryptography — a padlock anyone can close

In the 1970s, cryptographers discovered something remarkable: **key pairs**. One key is **public** — you can give it to the whole world. The other is **private** — it never leaves its owner. They work as a pair:

- **Encrypting:** anything locked with the public key can only be unlocked with the private key.
- **Signing:** anything signed with the private key can be verified by anyone holding the public key, proving who signed it.

> [!ANALOGY] Imagine handing out **open padlocks** to anyone who asks. Anyone can snap one shut on a box and send it to you, but only you have the key that opens them. That's public-key encryption. Now imagine a **wax seal** only you can make, which anyone can recognize as yours. That's a digital signature.

The catch: public-key operations are about **1,000 times slower** than symmetric encryption. So TLS uses them only at the start, to safely agree on a shared symmetric key — then switches to fast symmetric encryption for all the actual data.

### Agreeing on a secret in public: Diffie-Hellman

The most elegant trick in all of cryptography: two parties can create a shared secret while an eavesdropper watches every message — and the eavesdropper still can't work it out. This is **Diffie-Hellman key exchange** (1976).

> [!ANALOGY] The paint-mixing story. Alice and Bob publicly agree on a starting color — yellow. Each secretly picks a private color: Alice red, Bob blue. Alice mixes yellow + red = orange and sends it openly; Bob mixes yellow + blue = green and sends it openly. Now Alice adds her red to Bob's green, and Bob adds his blue to Alice's orange. **Both end up with the same brown** (yellow + red + blue). An eavesdropper saw yellow, orange and green — but "unmixing" paint to find the secret colors is practically impossible. In real Diffie-Hellman, the "mixing" is math that's easy one way and infeasibly hard to reverse.

TLS uses fresh, throwaway Diffie-Hellman values for **every** connection. This gives **forward secrecy**: even if a server's long-term private key is stolen years later, recorded past conversations still can't be decrypted, because the per-connection secrets were deleted right after use.

## Tool 3: Hashes — fingerprints for data

A **cryptographic hash** (like SHA-256) turns any amount of data into a short, fixed-size fingerprint. Change one letter of a 1 GB file and the fingerprint changes completely; and it's infeasible to find two different inputs with the same fingerprint. TLS uses hashes (inside **message authentication codes**) to detect any tampering with data in transit.

> [!WARN] Passwords must never be stored with a fast hash like plain SHA-256 — attackers can try billions of guesses per second. Websites should use deliberately slow password hashes such as **Argon2** or **bcrypt** (Practices track → security).

## Who are you, really? Certificates

Diffie-Hellman gives you a secret shared with… someone. But what if an attacker sits in the middle and does a separate key exchange with you and with the bank, passing messages between you while reading everything? This is a **man-in-the-middle attack**. To stop it, you need proof that the public key you received really belongs to `yourbank.com`.

That proof is a **certificate**: a small digital document saying "this public key belongs to `yourbank.com`", **signed by a Certificate Authority (CA)** — an organization that verifies who owns domains (DigiCert, Let's Encrypt, Google Trust Services, and others).

> [!ANALOGY] A certificate is like a passport. Anyone can claim to be someone; the passport is trusted because it was issued and stamped by a government that checked the person's identity. Your browser and operating system come with a built-in list of about 150 trusted "governments" — the root certificate authorities.

When your browser connects to a site, it checks:

1. The certificate is for **the exact name** you typed.
2. It hasn't **expired**.
3. It's **signed by a CA your browser trusts** — usually through a chain: the root CA signed an intermediate CA, which signed the website's certificate.
4. The server can **prove it holds the private key** for the certificate, by signing part of the handshake.

> [!EXAMPLE] **Let's Encrypt changed the web.** Before 2015, certificates cost money and took manual work, so many websites skipped HTTPS. Let's Encrypt, a non-profit, started issuing free certificates automatically through software. Today it has issued certificates for hundreds of millions of websites, and HTTPS went from roughly 40% of web traffic to over 95%.

> [!TRY] Click the padlock in your browser's address bar on any HTTPS site and open the certificate details. You'll see who it was issued to, which authority issued it, the chain up to a trusted root, and the expiry date — often only 90 days away, because short-lived certificates limit the damage if a key is ever stolen.

## The TLS handshake, step by step





Now put the pieces together. Here's the TLS 1.3 handshake that happens at the start of every HTTPS connection (right after the TCP handshake, chapter 4):

::widget Sequence {"title":"The TLS 1.3 handshake behind every HTTPS connection","what":"Your browser and a website set up encryption. Watch how they agree on a key (Diffie-Hellman), how the browser checks the certificate, and when encrypted data starts flowing.","steps":["Step through each message.","Find the moment the browser verifies it's really talking to the bank.","Notice that the whole setup takes one round trip, after which everything is encrypted."],"actors":["Your browser","Bank's server"],"msgs":[[0,1,"Hello: name 'yourbank.com', supported ciphers, my key-exchange value","The browser says which site it wants (so a server hosting many sites picks the right certificate), which encryption methods it supports, and its half of a fresh Diffie-Hellman exchange — its 'orange paint'."],[1,1,"Pick settings and compute the shared secret","The server chooses the strongest settings both support, creates its own half of the exchange, and combines the two halves into a shared secret only the two of them know."],[1,0,"Hello: my key-exchange value","The server's 'green paint'. From this point on, everything the server sends is already encrypted."],[1,0,"(encrypted) certificate + signature + finished","The server sends its certificate and signs a fingerprint of the whole conversation so far with its private key — proving it really owns the certificate, and that no one tampered with the earlier messages."],[0,0,"Verify the certificate and the signature","The browser checks: right name, not expired, signed by a trusted authority, and the signature is valid. If any check fails, you see a full-page security warning."],[0,1,"(encrypted) finished + GET /account","The browser computes the same shared secret, confirms the handshake, and sends the first request — all within one round trip."],[1,0,"(encrypted) your account page","All further data uses fast symmetric encryption (AES or ChaCha20) with keys derived from the shared secret."]]}

TLS 1.3 (2018) cut the handshake from two round trips to one, and removed old, weak options that had caused real attacks. When you reconnect to a site you visited recently, it can even send data in the first message (**0-RTT**), at the cost of some replay risk, so it's used only for safe requests.

> [!NOTE] One detail leaks: the website name in the first "hello" (called **SNI**) is sent unencrypted, so your internet provider can see *which* site you're visiting even though it can't see *what* you're doing there. **Encrypted Client Hello (ECH)** is a newer extension that hides it, and browsers are starting to support it.

## Where TLS shows up beyond the browser

- **APIs and mobile apps** use the same HTTPS.
- **Inside companies**, services increasingly use **mutual TLS (mTLS)**, where **both** sides present certificates, so each service proves its identity to every other service. A **service mesh** (Cloud track) can do this automatically for every connection.
- **Email**, **databases** and **VPNs** all use TLS or similar handshakes.

## When it goes wrong

> [!STORY] **Heartbleed (2014).** OpenSSL, the TLS library used by a huge fraction of the internet's servers, had a tiny bug in a "heartbeat" feature: a client could say "echo back these 64,000 bytes" while sending only one, and the server would reply with 64 KB of whatever happened to be in its memory next. That memory could contain passwords, session cookies and even the server's private key. Roughly 17% of secure web servers were vulnerable. Millions of certificates had to be replaced and passwords reset. A single missing length check.

> [!EXAMPLE] **Expired certificates take down big companies surprisingly often.** Microsoft Teams went down in 2020 because an authentication certificate expired. Countless smaller outages happen the same way: nobody renewed a certificate, and on the expiry date every client starts refusing to connect. The fix is boring and essential: automate renewal (as Let's Encrypt does) and alert well before any certificate expires.

Other common problems: a server that forgets to send its intermediate certificate (works in some browsers, fails in apps), and devices with a wrong clock (a laptop that thinks it's 2015 will reject every modern certificate).

> [!DEEP] **Quantum computers** large enough to break today's public-key algorithms don't exist yet, but attackers could record encrypted traffic now and decrypt it later ("harvest now, decrypt later"). So browsers and companies like Cloudflare and Google have already started combining classic key exchange with new **post-quantum** algorithms (ML-KEM) in TLS.

> [!RECAP]
> - TLS gives **confidentiality, integrity and authentication** — the padlock in HTTPS.
> - **Symmetric encryption** is fast but needs a shared key; **public-key cryptography** is slow but solves key sharing and enables **signatures**.
> - **Diffie-Hellman** lets two parties create a shared secret in public; fresh keys per connection give **forward secrecy**.
> - **Certificates**, signed by trusted **certificate authorities**, prove a public key belongs to a domain.
> - The **TLS 1.3 handshake** takes one round trip, then everything is encrypted with fast symmetric ciphers.
> - Real failures: **Heartbleed**, **expired certificates**, missing intermediates, wrong clocks.

> [!INTERVIEW] "How does HTTPS work?" Walk through: TCP connection; ClientHello with a key-exchange value; ServerHello; the certificate and how it's verified against trusted authorities; the server proving it holds the private key; a shared secret from Diffie-Hellman; then fast symmetric encryption. Explain why public-key crypto is only used at the start (speed) and what forward secrecy means.

::quiz {"q":"Why does TLS use public-key cryptography only during the handshake?","options":["It's insecure for bulk data","It's roughly 1,000 times slower than symmetric encryption, so it's used only to authenticate and agree on a fast symmetric key","Browsers don't support it later","Certificates expire"],"answer":1,"explain":"Bulk data uses fast symmetric ciphers like AES."}

::quiz {"q":"What stops an attacker in the middle from impersonating your bank during the handshake?","options":["The TCP handshake","The bank's certificate, signed by a trusted authority, plus the bank's signature proving it holds the matching private key","DNS","The SNI field"],"answer":1,"explain":"Without a valid certificate and matching private key, the browser shows a security warning."}

::quiz {"q":"What does forward secrecy protect?","options":["Future connections","Past recorded conversations, even if the server's long-term private key is stolen later","Passwords stored on the server","DNS lookups"],"answer":1,"explain":"Each connection used throwaway keys that were deleted afterwards."}
