---
title: Email, WebSockets and Real-Time Media
summary: Three protocols that power everyday communication, how an email travels between servers (SMTP, MX records) and why SPF, DKIM and DMARC decide whether it lands in the inbox; how WebSockets and server-sent events push live updates to browsers; and how WebRTC carries video calls peer to peer through NATs with STUN and TURN.
---

::widget Scene {"title": "Email: SMTP sends, IMAP and POP3 receive", "sub": "one email from Gmail to a company inbox, with spam checks", "nodes": [{"id": "a", "kind": "laptop", "label": "Asha (Gmail)", "x": 3.72, "y": 3.72}, {"id": "gs", "kind": "server", "label": "Gmail SMTP", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "dns", "kind": "doc", "label": "DNS: MX, SPF, DKIM", "x": 1.83, "y": -6.17, "color": "orange"}, {"id": "cs", "kind": "server", "label": "acme.com mail server", "x": 12.22, "y": -4.78, "color": "purple"}, {"id": "box", "kind": "db", "label": "Ben's mailbox", "x": 16.22, "y": -8.78, "color": "purple"}, {"id": "bb", "kind": "phone", "label": "Ben (IMAP)", "x": 19.72, "y": -12.28}], "links": [["a", "gs"], ["gs", "dns", {"dashed": true}], ["gs", "cs"], ["cs", "box"], ["bb", "box", {"both": true}]], "metrics": [["proto", "Protocol"], ["check", "Check"]], "steps": [{"short": "Submit", "tag": "Submit", "title": "Asha clicks Send: her client submits to Gmail over SMTP (port 587)", "body": "<p>Authenticated with her account, over TLS.</p>", "show": ["a", "gs"], "flow": [["a", "gs", "#3b82f6", "to ben@acme.com"]], "metrics": {"proto": ["SMTP submission"], "check": ["login"]}}, {"short": "MX", "tag": "Lookup", "title": "Gmail looks up acme.com's MX record", "body": "<p>\"Mail for acme.com goes to mx1.acme.com, priority 10.\"</p>", "show": ["a", "gs", "dns"], "flow": [["gs", "dns", "#f59e0b", "MX acme.com?"]], "metrics": {"check": ["MX lookup"]}}, {"short": "Relay", "tag": "Relay", "title": "Server-to-server SMTP on port 25", "body": "<p>HELO, MAIL FROM, RCPT TO, DATA. STARTTLS encrypts the hop if both support it.</p>", "show": ["a", "gs", "dns", "cs"], "flow": [["gs", "cs", "#3b82f6", "SMTP"]], "metrics": {"proto": ["SMTP relay"]}}, {"short": "SPF", "tag": "Anti-spoof", "title": "acme checks SPF: may this IP send for gmail.com?", "body": "<p>It looks up gmail.com's SPF record listing allowed servers.</p>", "flow": [["cs", "dns", "#f59e0b", "SPF"]], "set": {"cs": {"badge": "SPF pass"}}, "metrics": {"check": ["SPF"]}}, {"short": "DKIM", "tag": "Anti-spoof", "title": "DKIM: verify the message's signature", "body": "<p>Gmail signed headers and body; the public key is in DNS. Proves it wasn't altered and really came from gmail.com.</p>", "set": {"cs": {"badge": "SPF ✓ DKIM ✓"}}, "metrics": {"check": ["DKIM"]}}, {"short": "DMARC", "tag": "Policy", "title": "DMARC: what to do if checks fail", "body": "<p>The sender's policy says reject, quarantine or monitor. This is what stops \"From: ceo@yourbank.com\" phishing.</p>", "set": {"cs": {"badge": "DMARC pass"}}, "metrics": {"check": ["DMARC"]}}, {"short": "Store", "tag": "Deliver", "title": "Spam filters run, then the message is stored", "body": "<p>Delivered to Ben's mailbox.</p>", "show": ["a", "gs", "dns", "cs", "box"], "flow": [["cs", "box", "#a855f7", "store"]]}, {"short": "IMAP", "tag": "Read", "title": "Ben's phone syncs with IMAP", "body": "<p>Mail stays on the server; read/flag state syncs across all devices. (POP3 downloads and usually deletes, single device.)</p>", "show": ["a", "gs", "dns", "cs", "box", "bb"], "flow": [["box", "bb", "#22c55e", "new message"]], "metrics": {"proto": ["IMAP"]}}, {"short": "Push", "tag": "Push", "title": "IMAP IDLE keeps a connection open for instant notification", "body": "<p>Like WebSockets for mail.</p>", "note": {"kind": "key", "text": "SMTP moves mail (submit on 587, relay on 25, MX records find the destination). SPF, DKIM and DMARC authenticate senders. IMAP syncs; POP3 downloads."}}]}

::widget Scene {"title": "Email: SMTP sends, IMAP and POP3 read", "sub": "asha@acme.example → ravi@shop.example", "nodes": [{"id": "a", "kind": "laptop", "label": "Asha's mail app", "x": 3.1, "y": 3.1}, {"id": "ms", "kind": "server", "label": "acme mail server", "x": 7.1, "y": -0.9, "color": "blue"}, {"id": "dns", "kind": "server", "label": "DNS (MX)", "x": 1.52, "y": -6.48, "color": "teal"}, {"id": "mr", "kind": "server", "label": "shop mail server", "x": 11.6, "y": -5.4, "color": "purple"}, {"id": "r", "kind": "phone", "label": "Ravi's phone", "x": 15.6, "y": -9.4}], "links": [["a", "ms"], ["ms", "dns", {"dashed": true}], ["ms", "mr"], ["mr", "r", {"both": true}]], "metrics": [["proto", "Protocol"], ["auth", "Sender checks"]], "steps": [{"short": "Submit", "tag": "SMTP", "title": "Asha's app submits the mail (SMTP, port 587)", "body": "<p>She logs in to her own provider and hands over the message.</p>", "flow": [["a", "ms", "#f59e0b", "SMTP submit"]], "metrics": {"proto": ["SMTP :587"], "auth": ["-"]}}, {"short": "Find MX", "tag": "DNS", "title": "Look up shop.example's MX record", "body": "<p>\"Which server accepts mail for shop.example?\"</p>", "flow": [["ms", "dns", "#14b8a6", "MX?"]]}, {"short": "Relay", "tag": "SMTP", "title": "Server-to-server delivery; the receiver checks SPF, DKIM, DMARC", "body": "<p>The receiving server verifies acme is allowed to send for acme.example and that the signature is valid, otherwise it's spam or rejected.</p>", "flow": [["ms", "mr", "#f59e0b", "SMTP :25"]], "metrics": {"proto": ["SMTP :25"], "auth": ["SPF ✓ DKIM ✓ DMARC ✓", "good"]}}, {"short": "Read", "tag": "IMAP/POP3", "title": "Ravi reads it with IMAP (or POP3)", "body": "<p>IMAP keeps mail on the server and syncs every device. POP3 downloads and usually deletes, fine for one device, awkward for many.</p>", "flow": [["mr", "r", "#22c55e", "IMAP sync"]], "metrics": {"proto": ["IMAP :993"]}, "note": {"kind": "key", "text": "SMTP moves mail between servers (store-and-forward, retrying for days). IMAP/POP3 are only for reading your mailbox."}}]}

::widget Scene {"title": "WebSockets: a phone line that stays open", "sub": "live cricket scores without refreshing", "nodes": [{"id": "b", "kind": "laptop", "label": "Browser", "x": 3.1, "y": 3.1}, {"id": "s", "kind": "server", "label": "Score server", "x": 10.1, "y": -3.9, "color": "green"}], "links": [["b", "s", {"both": true}]], "metrics": [["conn", "Connection"], ["req", "Requests per update"]], "steps": [{"short": "Polling", "tag": "Problem", "title": "Polling every 2 seconds wastes requests", "body": "<p>Most replies say \"nothing new\", and updates still arrive late.</p>", "flow": [["b", "s", "#ef4444", "anything new?"], ["s", "b", "#ef4444", "no"]], "metrics": {"conn": ["new each time"], "req": ["many", "bad"]}}, {"short": "Upgrade", "tag": "Handshake", "title": "One HTTP request asks to upgrade", "body": "<p><code>Upgrade: websocket</code> → <code>101 Switching Protocols</code>. The TCP connection stays open.</p>", "flow": [["b", "s", "#3b82f6", "GET + Upgrade"], ["s", "b", "#3b82f6", "101"]], "metrics": {"conn": ["persistent", "good"]}}, {"short": "Push", "tag": "Live", "title": "The server pushes each update instantly", "body": "<p>Either side can send messages any time, chat, games, collaborative editing, trading screens.</p>", "flow": [["s", "b", "#22c55e", "SIX! 145/3"], ["b", "s", "#f59e0b", "react 🔥"]], "metrics": {"req": ["0 per update", "good"]}, "note": {"kind": "key", "text": "For one-way streams (notifications, LLM answers), Server-Sent Events are simpler. Scale WebSockets with pub/sub between servers and heartbeats."}}]}

::widget Scene {"title": "WebRTC video calls through NAT: STUN and TURN", "sub": "two laptops behind home routers", "nodes": [{"id": "a", "kind": "laptop", "label": "Asha", "x": 4.65, "y": 4.65}, {"id": "stun", "kind": "server", "label": "STUN", "x": 4.5, "y": -4.5, "color": "teal"}, {"id": "turn", "kind": "server", "label": "TURN relay", "x": 13.8, "y": 4.8, "color": "orange"}, {"id": "b", "kind": "laptop", "label": "Ben", "x": 13.65, "y": -4.35}], "links": [["a", "stun", {"dashed": true}], ["b", "stun", {"dashed": true}], ["a", "b", {"both": true}], ["a", "turn", {"dashed": true}], ["turn", "b", {"dashed": true}]], "metrics": [["path", "Media path"]], "steps": [{"short": "STUN", "tag": "Discover", "title": "Each asks STUN: \"what's my public address?\"", "body": "<p>Behind NAT, a laptop only knows its private address. STUN reports the public IP and port it appears as.</p>", "flow": [["a", "stun", "#14b8a6", "who am I?"], ["b", "stun", "#14b8a6", "who am I?"]], "metrics": {"path": ["-"]}}, {"short": "Direct", "tag": "P2P", "title": "They exchange addresses and punch through: direct media", "body": "<p>Both send packets to each other at once; most NATs then allow the replies. Lowest latency.</p>", "flow": [["a", "b", "#22c55e", "video"], ["b", "a", "#22c55e", "video"]], "metrics": {"path": ["direct", "good"]}}, {"short": "TURN", "tag": "Fallback", "title": "Strict corporate firewalls: relay through TURN", "body": "<p>When a direct path is impossible, media flows through a TURN server, always works, costs bandwidth.</p>", "flow": [[["a", "turn", "b"], "#f59e0b", "relayed video"]], "metrics": {"path": ["relayed"]}, "note": {"kind": "key", "text": "Group calls use an SFU server: each person uploads once and the server forwards streams to everyone else."}}]}

::widget Scene {"title": "SIP, RTSP and RTMP: phone calls, cameras and live streams", "sub": "three protocols that set up media", "nodes": [{"id": "phn", "kind": "phone", "label": "VoIP phone", "x": 0.0, "y": 0.0}, {"id": "pbx", "kind": "server", "label": "SIP server", "x": 4.5, "y": -4.5, "color": "blue"}, {"id": "cam", "kind": "cube", "label": "IP camera", "x": 6.2, "y": 6.2, "color": "teal"}, {"id": "nvr", "kind": "server", "label": "Recorder", "x": 10.7, "y": 1.7, "color": "teal"}, {"id": "obs", "kind": "laptop", "label": "Streamer (OBS)", "x": 9.0, "y": -9.0}, {"id": "yt", "kind": "server", "label": "Live platform", "x": 13.5, "y": -13.5, "color": "red"}], "links": [["phn", "pbx", {"both": true}], ["nvr", "cam", {"both": true}], ["obs", "yt"]], "metrics": [["p", "Protocol"], ["job", "Job"]], "steps": [{"short": "SIP", "tag": "Calls", "title": "SIP sets up internet phone calls", "body": "<p>INVITE → 180 Ringing → 200 OK → ACK. SIP only negotiates; the voice itself flows as RTP over UDP.</p>", "focus": ["phn", "pbx"], "flow": [["phn", "pbx", "#3b82f6", "INVITE"], ["pbx", "phn", "#22c55e", "200 OK"]], "metrics": {"p": ["SIP + RTP"], "job": ["call signalling"]}}, {"short": "RTSP", "tag": "Cameras", "title": "RTSP controls camera streams", "body": "<p>A recorder sends DESCRIBE, SETUP, PLAY, like a remote control, and the video arrives as RTP.</p>", "focus": ["cam", "nvr"], "flow": [["nvr", "cam", "#14b8a6", "PLAY"], ["cam", "nvr", "#14b8a6", "RTP video"]], "metrics": {"p": ["RTSP"], "job": ["control a camera stream"]}}, {"short": "RTMP", "tag": "Streaming", "title": "RTMP uploads a live stream to a platform", "body": "<p>OBS pushes video over a TCP connection to YouTube/Twitch, which re-packages it as HLS segments for viewers.</p>", "focus": ["obs", "yt"], "flow": [["obs", "yt", "#ef4444", "RTMP push"]], "metrics": {"p": ["RTMP"], "job": ["ingest a live stream"]}, "note": {"kind": "key", "text": "Pattern: a signalling/control protocol (SIP, RTSP) sets things up; a media transport (RTP over UDP) carries the audio and video."}}]}

## Three conversations, three designs

> [!STORY] In one morning, you receive a password-reset email, watch a live cricket score update on a web page without refreshing, and join a video call with colleagues in three countries. Each uses a completely different way of moving data. Email is **store-and-forward** like the postal service, it can take minutes and still work. The live score needs the server to **push** small updates instantly. The video call needs a continuous stream where a late packet is worse than a lost one. Understanding why each was designed differently helps you choose the right tool when building your own features.

## Email: store and forward

### How a message travels

::widget Sequence {"title":"An email from asha@acme.example to ravi@shop.example","what":"The servers and protocols involved in delivering one email. Each arrow is a step; read from top to bottom.","steps":["Step through each message.","Find where DNS is used to discover the recipient's mail server.","Notice where the receiving server checks whether the sender is genuine."],"actors":["Asha's mail app","acme.example mail server","DNS","shop.example mail server","Ravi's mail app"],"msgs":[[0,1,"submit via SMTP (port 587, logged in)","Asha's app hands the message to her own provider's server, authenticating with her account."],[1,2,"MX record for shop.example?","Which server accepts mail for shop.example? DNS answers with its mail exchanger (MX) records."],[1,3,"SMTP delivery (port 25, over TLS)","acme's server connects to shop's server and transfers the message: MAIL FROM, RCPT TO, DATA."],[3,2,"check SPF, DKIM, DMARC","Is this server allowed to send for acme.example? Is the DKIM signature valid? What does acme's DMARC policy say to do if not?"],[3,3,"spam filtering and store in mailbox","Reputation, content analysis and authentication results decide inbox vs spam."],[4,3,"fetch via IMAP or a web/API client","Ravi's app downloads or syncs the message."]]}

**SMTP** (from 1982) moves messages between servers; **IMAP** (or webmail APIs) lets clients read mailboxes. If the receiving server is down, the sending server **queues and retries** for days, robustness was the original design goal.

### Proving who sent it: SPF, DKIM and DMARC

SMTP never verified senders: anyone can write any "From:" address. That's why phishing works. Three DNS-published standards fix it:

- **SPF:** a DNS record listing which servers may send mail for a domain, `v=spf1 include:_spf.google.com -all`.
- **DKIM:** the sending server **signs** the message (body and key headers) with a private key; the public key is published in DNS. Receivers verify the signature, which also proves the message wasn't altered.
- **DMARC:** the domain owner's policy tying it together, "the visible From: domain must pass SPF or DKIM and match; if not, **reject** (or quarantine) it, and send me reports".

> [!WARN] Since 2024, Gmail and Yahoo require bulk senders to have SPF, DKIM and DMARC configured, plus one-click unsubscribe. If your app sends email (password resets, receipts), set these up for your sending domain, or your messages will land in spam, or be rejected.

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

After the `101` response, the TCP connection carries WebSocket **frames** small messages in either direction, instead of HTTP.

```js
const ws = new WebSocket('wss://scores.example/live')
ws.onmessage = (e) => render(JSON.parse(e.data))
ws.onclose = () => setTimeout(connect, backoffWithJitter())   // always reconnect
```

> [!ANALOGY] HTTP is sending letters and waiting for replies. Long polling is posting a letter that says "reply when you have news". A WebSocket is a phone call left open: either side can speak at any moment.

### Running WebSockets at scale

- Each open connection holds memory and a socket on a server for hours, design servers with event loops (chapter 10).
- Load balancers must support long-lived connections and upgrades, with suitable idle timeouts; send **heartbeats** (ping/pong) so idle connections aren't silently dropped by NATs and proxies.
- Users connected to **different servers** still need each other's messages: fan out through a **pub/sub** layer (Redis, Kafka, NATS), see the chat-system case study (System Design track).
- Clients must **reconnect** with backoff and resume from the last event they saw.
- Authenticate during the handshake and check the `Origin` header, browsers send cookies with WebSocket handshakes, so cross-site WebSocket hijacking is a real risk.

## Real-time media: WebRTC

Video and voice calls have different priorities: **low latency beats completeness**. A packet that arrives 500 ms late is useless, the conversation has moved on. So real-time media runs over **UDP** with **RTP** accepting some loss and hiding it with jitter buffers, error correction and smart codecs (Opus for audio, VP8/VP9/AV1/H.264 for video).

**WebRTC** brings this to browsers and apps, and tries to connect participants **directly** (peer to peer) for the lowest latency. The hard part: most devices are behind NATs (Networking chapter 2) and can't simply accept incoming connections.

::widget Stepper {"type":"flow","cols":3,"title":"How a WebRTC call gets connected","what":"The steps two browsers take to set up a direct video call when both are behind home or office routers.","steps":["Press Play and follow the setup.","Find what the STUN server tells each browser.","Notice when traffic has to be relayed instead of going directly."],"nodes":[["Signaling","The two apps exchange session descriptions (SDP: which codecs, which media) through your own server, usually over a WebSocket. WebRTC doesn't define this part."],["STUN: what's my public address?","Each browser asks a STUN server 'what IP and port do you see me coming from?', learning its public address as mapped by its NAT."],["Gathering candidates (ICE)","Each side collects possible addresses: local, public (from STUN) and relay (from TURN), and sends them to the other through signaling."],["Hole punching","Both sides send packets to each other's candidates at the same time. Many NATs then allow the replies through, creating a direct path."],["TURN relay if needed","Strict corporate firewalls or symmetric NATs can block direct paths. Then media flows through a TURN relay server, always works, but costs bandwidth and adds latency."],["Encrypted media","Media is always encrypted (DTLS-SRTP). Codecs adapt bitrate to network conditions continuously."]]}

### Group calls

Peer-to-peer works for two or three people. With ten participants, each would need to upload nine video streams. Group calls (Zoom, Google Meet, Teams) use an **SFU** (selective forwarding unit): each participant uploads **once** to a server, which forwards streams to everyone else. With **simulcast** each sender uploads a few quality levels, and the SFU sends each receiver the one that suits their bandwidth and screen layout.

> [!RECAP]
> - **Email** is store-and-forward: **SMTP** between servers found via **MX** records; **SPF** **DKIM** and **DMARC** prove the sender and decide deliverability.
> - Browser push: **polling** **long polling** **SSE** (one-way streaming, great for LLM output) and **WebSockets** (two-way, persistent). At scale, use heartbeats, pub/sub fan-out and reconnection.
> - **Real-time media** favors latency over completeness: UDP + RTP, jitter buffers, adaptive codecs.
> - **WebRTC** connects peers through NATs with signaling, **STUN** **ICE** and **TURN** relays; group calls use **SFUs** with simulcast.

> [!INTERVIEW] Common questions: WebSockets vs SSE vs long polling and when to use each; how to scale WebSocket servers (pub/sub, sticky connections); why video calls use UDP; what STUN and TURN do; and why emails from a new app land in spam (SPF/DKIM/DMARC).

::quiz {"q":"Which is the best fit for streaming an LLM's answer token by token to a browser?","options":["Polling every second","Server-sent events (or a WebSocket)","Email","FTP"],"answer":1,"explain":"SSE is simple one-way streaming over HTTP."}

::quiz {"q":"What does a TURN server do in WebRTC?","options":["Tells a browser its public IP","Relays media when a direct peer-to-peer path can't be established","Encrypts email","Hosts the web page"],"answer":1,"explain":"STUN discovers addresses; TURN relays as a fallback."}

::quiz {"q":"What does DKIM provide?","options":["Encryption of the email body","A cryptographic signature proving which domain sent the message and that it wasn't altered","Spam filtering","Faster delivery"],"answer":1,"explain":"Receivers verify it with a public key published in DNS."}
