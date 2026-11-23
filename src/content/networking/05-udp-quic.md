---
title: UDP and QUIC: When Speed Matters More Than Perfection
summary: Why video calls, online games and DNS deliberately use the "unreliable" UDP instead of TCP, what applications have to build themselves when they do, and how QUIC, the protocol under HTTP/3, rebuilt TCP's best ideas on top of UDP to make the web faster on today's phones and networks.
---

::widget Scene {"title": "UDP vs TCP: a video call drops a packet", "sub": "and how QUIC gets TCP's reliability without its stalls", "nodes": [{"id": "pk", "kind": "cells", "label": "packets in flight", "x": 3.1, "y": 3.1, "values": [1, 2, 3, 4, 5, 6]}, {"id": "rx", "kind": "laptop", "label": "Receiver", "x": 13.3, "y": 5.3}], "metrics": [["proto", "Protocol"], ["what", "What happens"], ["delay", "Delay"]], "steps": [{"short": "Lost", "tag": "Setup", "title": "Packet 3 is lost on the way", "body": "<p>Wi-Fi interference. Packets 4–6 arrive fine.</p>", "show": ["pk", "rx"], "set": {"pk": {"marks": {"2": "red"}, "ptr": {}}}, "metrics": {"proto": ["-"], "what": ["-"], "delay": ["-"]}}, {"short": "TCP", "tag": "TCP", "title": "TCP: 4, 5, 6 wait in a buffer until 3 is resent", "body": "<p>TCP promises an in-order byte stream, so it can't hand 4 to the app before 3. Head-of-line blocking.</p>", "set": {"pk": {"marks": {"2": "red", "3": "orange", "4": "orange", "5": "orange"}, "ptr": {}}}, "metrics": {"proto": ["TCP"], "what": ["everything waits for #3"], "delay": ["+1 round trip", "bad"]}}, {"short": "Freeze", "tag": "TCP", "title": "On a video call that's a visible freeze", "body": "<p>By the time frame 3 arrives, it's too old to be useful.</p>", "set": {"rx": {"badge": "frozen 200 ms"}}}, {"short": "UDP", "tag": "UDP", "title": "UDP: deliver 4, 5, 6 immediately; 3 is simply gone", "body": "<p>No connection, no retransmission, no ordering. 8-byte header. The app decides what to do.</p>", "set": {"pk": {"marks": {"2": "red", "3": "green", "4": "green", "5": "green"}, "ptr": {}}, "rx": {"badge": "a tiny glitch"}}, "metrics": {"proto": ["UDP"], "what": ["skip the lost frame"], "delay": ["none", "good"]}}, {"short": "App", "tag": "UDP", "title": "The app conceals the loss", "body": "<p>Interpolate the missing audio, or ask for a new keyframe. Games, voice, video and DNS use UDP for this reason.</p>"}, {"short": "QUIC", "tag": "QUIC", "title": "QUIC: reliable streams built on UDP", "body": "<p>HTTP/3 runs on QUIC. It retransmits like TCP, but per stream.</p>", "set": {"pk": {"marks": {}, "ptr": {}, "values": ["A1", "B1", "A2", "B2", "A3", "B3"]}}, "metrics": {"proto": ["QUIC"], "what": ["streams A and B"], "delay": ["-"]}}, {"short": "Stream", "tag": "QUIC", "title": "Lose a packet of stream A: only A waits", "body": "<p>Stream B (another image on the page) keeps flowing. No head-of-line blocking across streams.</p>", "set": {"pk": {"marks": {"0": "red", "1": "green", "3": "green", "5": "green", "2": "orange", "4": "orange"}, "ptr": {}, "values": ["A1", "B1", "A2", "B2", "A3", "B3"]}}, "metrics": {"what": ["only stream A waits", "good"]}}, {"short": "Handshake", "tag": "QUIC", "title": "Faster setup: transport and TLS in one round trip", "body": "<p>0-RTT on reconnect. TCP + TLS needs two.</p>", "metrics": {"delay": ["1 RTT (0 on resume)", "good"]}}, {"short": "Migrate", "tag": "QUIC", "title": "Walk from Wi-Fi to 4G: the connection survives", "body": "<p>QUIC identifies connections by an ID, not by IP and port.</p>", "note": {"kind": "key", "text": "TCP = reliable, ordered, one stream (head-of-line blocking). UDP = fast, unreliable, app decides. QUIC = reliable streams over UDP with built-in TLS."}}]}





## Sometimes late is worse than lost

TCP's promise is perfection: every byte, in order, no matter how long it takes. For downloading a file, that's exactly right. But imagine a video call.

A packet carrying 20 milliseconds of your friend's voice gets lost. TCP would pause everything, wait for the retransmission, and then play it, 300 milliseconds late. By then, the conversation has moved on, and everything after it is delayed too. You'd hear stuttering and growing lag. **It would be much better to just skip the missing 20 ms** and keep going; a tiny glitch is barely noticeable.

That's the world of **UDP**.

> [!ANALOGY] TCP is a registered letter: tracked, signed for, re-sent if lost, guaranteed delivered in order, but slow. UDP is shouting across a crowded room: instant and cheap, but some words get lost, and nobody repeats them unless you ask. For a live conversation, shouting is better.

## UDP: almost nothing, on purpose

UDP (User Datagram Protocol) adds almost nothing to IP: **port numbers** (so the right program gets the data), a **length** and a **checksum**. That's an 8-byte header. There is:

- no handshake, you can send data in the very first packet,
- no acknowledgments or retransmission,
- no ordering,
- no congestion control,
- and **message boundaries are preserved**: one send = one datagram = one receive (unlike TCP's stream).

Who uses it, and why?

| Use | Why UDP |
|---|---|
| **Video and voice calls** (Zoom, WhatsApp calls, Google Meet) | A late packet is useless; skip it and keep going |
| **Online games** | Players need the *latest* position, not a perfectly ordered history |
| **DNS lookups** (chapter 6) | One tiny question, one tiny answer, a handshake would triple the time |
| **Live streaming of sports or gaming** | Low delay beats perfection |
| **QUIC / HTTP/3** (below) | Builds its own reliability exactly the way it wants |

## What apps build on top of UDP

Choosing UDP doesn't mean ignoring loss, it means **handling it your own way**.

> [!EXAMPLE] **How a multiplayer game handles lost packets.** The server sends the full state of the game world 30–60 times per second, each snapshot numbered. If snapshot 1,042 is lost, nobody resends it, snapshot 1,043 arrives 16 ms later with newer positions anyway. Your game **interpolates** between snapshots to make motion smooth, and **predicts** where things are going when a packet is late. Important one-off events like "player fired" are repeated in the next few packets, so one loss doesn't drop them. That's why you sometimes see players "rubber-band" (jump back) on a bad connection: the prediction was wrong and got corrected.

Voice and video apps do similar things: a **jitter buffer** holds a few tens of milliseconds of audio to smooth out uneven arrival; **forward error correction** sends a little extra data so lost packets can be reconstructed without asking; and the app constantly adjusts video quality to the available bandwidth. **WebRTC** the technology inside browser video calls, bundles all of this plus encryption and NAT traversal (getting through home routers, chapter 2).

> [!WARN] Because UDP has no handshake, it's easy to **fake the sender's address**. Attackers exploit this for **amplification attacks**: they send small requests to public servers (DNS, NTP, memcached) with the *victim's* address as the sender, and those servers send much larger replies to the victim. In 2018, GitHub was hit with 1.35 terabits per second this way, using memcached servers that turned a 15-byte request into replies up to 51,000 times larger.

## The problem with TCP that nobody could fix

By the 2010s, TCP had problems that hurt the modern web, especially on phones:

1. **Too many round trips to get started.** A TCP handshake (1 round trip) plus a TLS encryption handshake (another round trip, chapter 7) before the first byte of your request. On a mobile network with 100 ms+ latency, that's a noticeable delay on every new connection.
2. **Head-of-line blocking.** A web page loads dozens of files over one connection. With TCP, one lost packet stalls **all** of them until it's resent (chapter 4).
3. **Connections break when your network changes.** A TCP connection is identified by IP addresses and ports. Walk out of your house, your phone switches from Wi-Fi to 4G, your IP address changes, and every connection breaks and has to restart.
4. **TCP is nearly impossible to change.** It's built into every operating system's kernel, and into millions of routers, firewalls and other boxes on the internet that inspect and sometimes modify TCP headers. Rolling out an improvement means waiting a decade for every device to update. Engineers call this **ossification** the protocol has turned to bone.

## QUIC: rebuilding TCP on top of UDP

Google's solution (started in 2012 and standardized in 2021) was clever: build a brand-new transport protocol, **QUIC** that runs **on top of UDP** inside the application rather than in the kernel, and **encrypt nearly everything** so that boxes in the middle can't inspect and "ossify" it.

Why on top of UDP? Because the internet's routers and firewalls only reliably pass two protocols: TCP and UDP. A completely new protocol would be blocked by countless middleboxes. UDP is a blank envelope that gets through.

Today **HTTP/3 runs on QUIC** and a large share of traffic from Google, YouTube, Meta, Cloudflare and others uses it.

### What QUIC fixes

**1. Fewer round trips to start.** QUIC combines the connection handshake and the encryption handshake into one. A new connection needs **one** round trip; reconnecting to a server you've visited recently can send data in the **very first packet** ("0-RTT").

::widget Sequence {"title":"Getting started: TCP + TLS vs QUIC","what":"The top half shows a request over TCP with TLS encryption; the bottom half shows the same request over QUIC. Count the round trips before the request is sent.","steps":["Step through the TCP + TLS part (2 round trips before the request).","Continue into the QUIC part (1 round trip).","Imagine a 150 ms round trip: QUIC saves 150 ms on every new connection."],"actors":["Your phone","Server"],"msgs":[[0,1,"TCP SYN","TCP + TLS: round trip 1 begins, just to open the connection."],[1,0,"TCP SYN-ACK",""],[0,1,"TCP ACK + TLS hello (encryption keys)","Round trip 2 begins: now the encryption setup can start."],[1,0,"TLS: server hello, certificate, done",""],[0,1,"GET /index.html (finally)","After two full round trips, the request can go out."],[0,0,", now the same thing with QUIC,","Start over, this time using QUIC."],[0,1,"QUIC hello: connection + encryption keys together","QUIC combines the two handshakes into one."],[1,0,"QUIC: server hello, certificate, done",""],[0,1,"GET /index.html","After just one round trip. If you've connected before, QUIC can even send the request in the very first packet."]]}

**2. No head-of-line blocking between streams.** QUIC carries many independent **streams** in one connection, one per file being downloaded. Each stream is kept in order separately. A lost packet only delays the stream it belonged to; the other images, scripts and styles keep arriving.

> [!ANALOGY] TCP is a single-lane road: if one car breaks down, every car behind it stops. QUIC is a multi-lane highway: a breakdown blocks only its own lane.

**3. Connections survive network changes.** QUIC identifies a connection by a random **connection ID** instead of IP addresses and ports. When your phone switches from Wi-Fi to 4G, it keeps sending with the same connection ID from its new address, and the server carries on. Your video keeps playing as you walk out the door.

**4. It can keep evolving.** Because QUIC lives in apps and libraries rather than the kernel, a browser update can ship an improvement to billions of users in weeks. And because it's encrypted, middleboxes can't depend on its internals and freeze it in place.

### The costs

- QUIC uses **more CPU** than TCP, because it runs in user space and encrypts every packet, without decades of hardware optimizations. That gap is shrinking.
- Some corporate networks **block UDP** traffic; browsers automatically fall back to TCP when QUIC doesn't work.
- Load balancers have to understand connection IDs to keep each connection on the same server.

> [!TRY] In Chrome, open Developer Tools → Network, right-click the column headers and enable **Protocol**. Load youtube.com or google.com: you'll see many requests marked `h3`, HTTP/3 over QUIC. Most other sites will show `h2` (HTTP/2 over TCP).

## TCP or UDP? A simple guide

- **Need every byte, in order?** (files, web pages, APIs, databases, email) → **TCP** or QUIC, which gives you the same guarantees.
- **Live, real-time data where late is useless?** (calls, games, live video) → **UDP** with your own handling of loss.
- **Tiny request-response, where speed matters?** (DNS) → **UDP**.
- **The modern web on phones?** → **QUIC/HTTP/3** which is reliable like TCP but built on UDP.

> [!RECAP]
> - **UDP** is minimal: ports and a checksum, no handshake, no retransmission, no ordering, perfect when late data is useless.
> - Apps on UDP build their own tricks: snapshots, interpolation, jitter buffers, error correction.
> - UDP's lack of a handshake enables **amplification attacks** with forged sender addresses.
> - TCP suffers from slow startup, **head-of-line blocking** connections that break on network changes, and **ossification**.
> - **QUIC** rebuilds reliable transport on top of UDP: 1-RTT (or 0-RTT) setup, independent **streams** **connection IDs** that survive network changes, and fast evolution. **HTTP/3** runs on it.

> [!INTERVIEW] "TCP vs UDP, when would you use each?" is a classic. Give concrete examples (DNS, video calls and games on UDP; web, databases and file transfer on TCP), and say that choosing UDP means building whatever reliability you need yourself. Bonus: explain how QUIC fixes TCP's head-of-line blocking and survives network switches.

::quiz {"q":"Why do video calls typically use UDP instead of TCP?","options":["UDP is encrypted","A late audio packet is useless; it's better to skip it than to stall everything waiting for a retransmission","UDP has better congestion control","TCP can't carry audio"],"answer":1,"explain":"Waiting for perfection creates lag; skipping a few milliseconds is barely noticeable."}

::quiz {"q":"How does QUIC keep a download going when your phone switches from Wi-Fi to 4G?","options":["It pauses and restarts","It identifies the connection by a connection ID rather than by IP addresses and ports","It uses both networks at once","Through DNS"],"answer":1,"explain":"TCP connections are tied to addresses; QUIC connections aren't."}

::quiz {"q":"Why was QUIC built on top of UDP instead of as a brand-new protocol?","options":["UDP is faster than IP","Routers and firewalls across the internet reliably pass only TCP and UDP, so a new protocol would be blocked","UDP provides encryption","UDP has retransmission"],"answer":1,"explain":"UDP is a 'blank envelope' that middleboxes let through."}
