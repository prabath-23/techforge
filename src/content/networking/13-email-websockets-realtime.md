---
title: Email, WebSockets and Real-Time Media
summary: Three protocols that power everyday communication — how an email travels between servers (SMTP, MX records) and why SPF, DKIM and DMARC decide whether it lands in the inbox; how WebSockets and server-sent events push live updates to browsers; and how WebRTC carries video calls peer to peer through NATs with STUN and TURN.
---

## Three conversations, three designs

> [!STORY] In one morning, you receive a password-reset email, watch a live cricket score update on a web page without refreshing, and join a video call with colleagues in three countries. Each uses a completely different way of moving data. Email is **store-and-forward** — like the postal service, it can take minutes and still work. The live score needs the server to **push** small updates instantly. The video call needs a continuous stream where a late packet is worse than a lost one. Understanding why each was designed differently helps you choose the right tool when building your own features.

## Email: store and forward

### How a message travels

::widget Sequence {"title":"An email from asha@acme.example to ravi@shop.example","what":"The servers and protocols involved in delivering one email. Each arrow is a step; read from top to bottom.","steps":["Step through each message.","Find where DNS is used to discover the recipient's mail server.","Notice where the receiving server checks whether the sender is genuine."],"actors":["Asha's mail app","acme.example mail server","DNS","shop.example mail server","Ravi's mail app"],"msgs":[[0,1,"submit via SMTP (port 587, logged in)","Asha's app hands the message to her own provider's server, authenticating with her account."],[1,2,"MX record for shop.example?","Which server accepts mail for shop.example? DNS answers with its mail exchanger (MX) records."],[1,3,"SMTP delivery (port 25, over TLS)","acme's server connects to shop's server and transfers the message: MAIL FROM, RCPT TO, DATA."],[3,2,"check SPF, DKIM, DMARC","Is this server allowed to send for acme.example? Is the DKIM signature valid? What does acme's DMARC policy say to do if not?"],[3,3,"spam filtering and store in mailbox","Reputation, content analysis and authentication results decide inbox vs spam."],[4,3,"fetch via IMAP or a web/API client","Ravi's app downloads or syncs the message."]]}

**SMTP** (from 1982) moves messages between servers; **IMAP** (or webmail APIs) lets clients read mailboxes. If the receiving server is down, the sending server **queues and retries** for days — robustness was the original design goal.

### Proving who sent it: SPF, DKIM and DMARC

SMTP never verified senders: anyone can write any "From:" address. That's why phishing works. Three DNS-published standards fix it:

- **SPF:** a DNS record listing which servers may send mail for a domain — `v=spf1 include:_spf.google.com -all`.
- **DKIM:** the sending server **signs** the message (body and key headers) with a private key; the public key is published in DNS. Receivers verify the signature, which also proves the message wasn't altered.
- **DMARC:** the domain owner's policy tying it together — "the visible From: domain must pass SPF or DKIM and match; if not, **reject** (or quarantine) it, and send me reports".

> [!WARN] Since 2024, Gmail and Yahoo require bulk senders to have SPF, DKIM and DMARC configured, plus one-click unsubscribe. If your app sends email (password resets, receipts), set these up for your sending domain, or your messages will land in spam — or be rejected.

> [!NOTE] Most apps shouldn't run their own mail servers: deliverability depends on IP reputation built over time. Use a sending service (Amazon SES, SendGrid, Postmark), send transactional and marketing mail from separate subdomains, and handle bounces and complaints.

## Pushing updates to browsers

HTTP is request-response: the browser asks, the server answers. How does a server tell the browser "the score just changed"?

| Technique | How | Good for |
|---|---|---|
| **Polling** | Browser asks every few seconds | Simple; wasteful and slow to react |
| **Long polling** | Browser asks; server holds the request open until there's news | Works everywhere; one request per update |
| **Server-sent events (SSE)** | One long HTTP response streaming events, server → browser only | Live feeds, notifications, **streaming LLM responses**; auto-reconnects |
| **WebSockets** | Upgrade an HTTP connection into a persistent **two-way** channel | Chat, collaborative editing, multiplayer games, trading screens |

### How a WebSocket starts

```http
GET /live HTTP/1.1
Host: scores.example
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

After the `101` response, the TCP connection carries WebSocket **frames** — small messages in either direction — instead of HTTP.

```js
const ws = new WebSocket('wss://scores.example/live')
ws.onmessage = (e) => render(JSON.parse(e.data))
ws.onclose = () => setTimeout(connect, backoffWithJitter())   // always reconnect
```

> [!ANALOGY] HTTP is sending letters and waiting for replies. Long polling is posting a letter that says "reply when you have news". A WebSocket is a phone call left open: either side can speak at any moment.

### Running WebSockets at scale

- Each open connection holds memory and a socket on a server for hours — design servers with event loops (chapter 10).
- Load balancers must support long-lived connections and upgrades, with suitable idle timeouts; send **heartbeats** (ping/pong) so idle connections aren't silently dropped by NATs and proxies.
- Users connected to **different servers** still need each other's messages: fan out through a **pub/sub** layer (Redis, Kafka, NATS) — see the chat-system case study (System Design track).
- Clients must **reconnect** with backoff and resume from the last event they saw.
- Authenticate during the handshake and check the `Origin` header — browsers send cookies with WebSocket handshakes, so cross-site WebSocket hijacking is a real risk.

## Real-time media: WebRTC

Video and voice calls have different priorities: **low latency beats completeness**. A packet that arrives 500 ms late is useless — the conversation has moved on. So real-time media runs over **UDP** with **RTP**, accepting some loss and hiding it with jitter buffers, error correction and smart codecs (Opus for audio, VP8/VP9/AV1/H.264 for video).

**WebRTC** brings this to browsers and apps, and tries to connect participants **directly** (peer to peer) for the lowest latency. The hard part: most devices are behind NATs (Networking chapter 2) and can't simply accept incoming connections.

::widget Stepper {"type":"flow","cols":3,"title":"How a WebRTC call gets connected","what":"The steps two browsers take to set up a direct video call when both are behind home or office routers.","steps":["Press Play and follow the setup.","Find what the STUN server tells each browser.","Notice when traffic has to be relayed instead of going directly."],"nodes":[["Signaling","The two apps exchange session descriptions (SDP: which codecs, which media) through your own server — usually over a WebSocket. WebRTC doesn't define this part."],["STUN: what's my public address?","Each browser asks a STUN server 'what IP and port do you see me coming from?', learning its public address as mapped by its NAT."],["Gathering candidates (ICE)","Each side collects possible addresses: local, public (from STUN) and relay (from TURN), and sends them to the other through signaling."],["Hole punching","Both sides send packets to each other's candidates at the same time. Many NATs then allow the replies through, creating a direct path."],["TURN relay if needed","Strict corporate firewalls or symmetric NATs can block direct paths. Then media flows through a TURN relay server — always works, but costs bandwidth and adds latency."],["Encrypted media","Media is always encrypted (DTLS-SRTP). Codecs adapt bitrate to network conditions continuously."]]}

### Group calls

Peer-to-peer works for two or three people. With ten participants, each would need to upload nine video streams. Group calls (Zoom, Google Meet, Teams) use an **SFU** (selective forwarding unit): each participant uploads **once** to a server, which forwards streams to everyone else. With **simulcast**, each sender uploads a few quality levels, and the SFU sends each receiver the one that suits their bandwidth and screen layout.

> [!RECAP]
> - **Email** is store-and-forward: **SMTP** between servers found via **MX** records; **SPF**, **DKIM** and **DMARC** prove the sender and decide deliverability.
> - Browser push: **polling**, **long polling**, **SSE** (one-way streaming, great for LLM output) and **WebSockets** (two-way, persistent). At scale, use heartbeats, pub/sub fan-out and reconnection.
> - **Real-time media** favors latency over completeness: UDP + RTP, jitter buffers, adaptive codecs.
> - **WebRTC** connects peers through NATs with signaling, **STUN**, **ICE** and **TURN** relays; group calls use **SFUs** with simulcast.

> [!INTERVIEW] Common questions: WebSockets vs SSE vs long polling and when to use each; how to scale WebSocket servers (pub/sub, sticky connections); why video calls use UDP; what STUN and TURN do; and why emails from a new app land in spam (SPF/DKIM/DMARC).

::quiz {"q":"Which is the best fit for streaming an LLM's answer token by token to a browser?","options":["Polling every second","Server-sent events (or a WebSocket)","Email","FTP"],"answer":1,"explain":"SSE is simple one-way streaming over HTTP."}

::quiz {"q":"What does a TURN server do in WebRTC?","options":["Tells a browser its public IP","Relays media when a direct peer-to-peer path can't be established","Encrypts email","Hosts the web page"],"answer":1,"explain":"STUN discovers addresses; TURN relays as a fallback."}

::quiz {"q":"What does DKIM provide?","options":["Encryption of the email body","A cryptographic signature proving which domain sent the message and that it wasn't altered","Spam filtering","Faster delivery"],"answer":1,"explain":"Receivers verify it with a public key published in DNS."}
