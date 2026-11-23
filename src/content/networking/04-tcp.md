---
title: TCP: Turning an Unreliable Network into a Reliable Conversation
summary: How TCP takes packets that can be lost, duplicated or arrive out of order, and gives programs a perfect, in-order stream of bytes, the three-way handshake, acknowledgments and retransmission, flow control, the congestion control that stopped the internet from collapsing in 1986, connection shutdown, and the performance traps engineers hit in real life.
---

## The problem TCP solves

Chapter 2 ended with an uncomfortable fact: IP is "best effort". Packets can be **lost** **duplicated** **corrupted** or arrive **out of order**. Yet when you download a file, every single byte arrives correctly and in order. When you load a web page, no paragraph is missing or scrambled.

That's the work of **TCP** (Transmission Control Protocol). It runs on the two computers at the ends of the conversation, not in the network, and turns an unreliable packet service into a reliable **stream of bytes**.

> [!ANALOGY] Imagine sending a 300-page book to a friend by post, one page per envelope, through a postal service that sometimes loses envelopes and delivers them in random order. You'd number every page. Your friend would send you back postcards saying "I've got everything up to page 57". If you didn't hear back about a page after a while, you'd send it again. Your friend would put pages in order and throw away duplicates. That's TCP.

## Ports: which program gets the data?

IP gets a packet to the right **computer**. But a computer runs many programs that use the network, your browser, Spotify, Slack, a background updater. TCP adds **port numbers** to say which program the data is for.

- Servers listen on well-known ports: **443** for HTTPS, **80** for HTTP, **22** for SSH, **5432** for PostgreSQL.
- Your side picks a random temporary port (an **ephemeral port** typically between 32768 and 60999).

A TCP connection is identified by four things together: **your IP, your port, the server's IP, the server's port**. Change any one and it's a different connection. That's how one web server on port 443 can hold a million connections at once, they all differ on the client side.

> [!ANALOGY] The IP address is the building's street address; the port is the apartment number. The postal service gets the letter to the building; the port says which apartment's mailbox it goes into.

## Starting a conversation: the three-way handshake

::widget Scene {"title": "TCP: handshake, numbered bytes and a lost packet", "sub": "client ↔ server over an unreliable network", "nodes": [{"id": "c", "kind": "laptop", "label": "Client :52344", "x": 3.1, "y": 3.1}, {"id": "n", "kind": "cloud", "label": "Network", "x": 8.56, "y": 1.36}, {"id": "s", "kind": "server", "label": "Server :80", "x": 10.3, "y": -4.1, "color": "purple"}], "links": [["c", "n", {"both": true}], ["n", "s", {"both": true}]], "metrics": [["state", "Client state"], ["seq", "Next byte to send"], ["acked", "Bytes acknowledged"]], "legend": [["Handshake", "#22c55e"], ["Data", "#f59e0b"], ["ACK", "#a855f7"], ["Lost", "#ef4444"]], "steps": [{"short": "SYN", "tag": "Handshake", "title": "Client: SYN, \"let's talk; my bytes start at 1000\"", "body": "<p>The client picks a random starting sequence number and sends a <b>SYN</b> segment. Random starting numbers stop old, delayed packets from being mistaken for new ones (and make spoofing harder).</p>", "flow": [[["c", "n", "s"], "#22c55e", "SYN seq=1000"]], "metrics": {"state": ["SYN_SENT"], "seq": ["1000"], "acked": ["0"]}}, {"short": "SYN-ACK", "tag": "Handshake", "title": "Server: SYN-ACK, \"got it; mine start at 5000\"", "body": "<p>The server acknowledges the client's number (<code>ack=1001</code>) and sends its own starting number. Both directions are being set up at once.</p>", "flow": [["s", "c", "#22c55e", "SYN-ACK seq=5000 ack=1001"]]}, {"short": "ACK", "tag": "Handshake", "title": "Client: ACK, connection established", "body": "<p>The client acknowledges the server's number. One round trip has passed; now data can flow.</p>", "note": {"kind": "notice", "text": "This round trip is why new connections are \"slow\", and why connection reuse (keep-alive, pooling) matters so much."}, "flow": [["c", "s", "#22c55e", "ACK 5001"]], "metrics": {"state": ["ESTABLISHED", "good"], "seq": ["1001"]}}, {"short": "Send data", "tag": "Data", "title": "Send three segments without waiting", "body": "<p>TCP numbers every <b>byte</b>. The client sends bytes 1001–2000, 2001–3000 and 3001–4000 back to back, it doesn't wait for each one to be acknowledged (that's the <b>window</b>).</p>", "flow": [["c", "s", "#f59e0b", "1001–2000"], ["c", "s", "#f59e0b", "2001–3000"], ["c", "s", "#f59e0b", "3001–4000"]], "metrics": {"seq": ["4001"]}}, {"short": "A packet is lost", "tag": "Loss", "title": "The middle segment is dropped", "body": "<p>A busy router somewhere drops bytes 2001–3000. The server received 1001–2000 and 3001–4000, but there's a gap.</p><p>It keeps replying <code>ack=2001</code>, \"I still need byte 2001\", even after receiving later data.</p>", "flow": [["c", "n", "#ef4444", "2001–3000 ✗"], ["s", "c", "#a855f7", "ack=2001"], ["s", "c", "#a855f7", "ack=2001 (again)"]], "set": {"n": {"badge": "dropped!"}}, "metrics": {"acked": ["2000", "bad"]}}, {"short": "Resend", "tag": "Recovery", "title": "Duplicate ACKs trigger a fast retransmit", "body": "<p>Three duplicate ACKs tell the client exactly which segment went missing. It resends only 2001–3000, without waiting for a timeout. It also <b>halves its sending rate</b>, assuming the network is congested.</p>", "flow": [["c", "s", "#f59e0b", "resend 2001–3000"]], "set": {"n": {"badge": null}}}, {"short": "All acknowledged", "tag": "Done", "title": "The gap is filled: ack=4001", "body": "<p>The server now has every byte in order and acknowledges everything up to 4000 at once. The application on the server receives a clean, ordered stream, it never knew a packet was lost.</p>", "note": {"kind": "key", "text": "TCP turns an unreliable network into a reliable, ordered byte stream using sequence numbers, acknowledgements, retransmission and congestion control."}, "flow": [["s", "c", "#a855f7", "ack=4001"]], "metrics": {"acked": ["4000", "good"]}}]}




Before any data flows, both sides agree to talk and choose **starting sequence numbers** the page numbering for the bytes each side will send. This takes three messages:

::widget Sequence {"title":"Opening a TCP connection (the three-way handshake)","what":"The client on the left opens a connection to a server on the right. Each arrow is one packet; read why each is needed.","steps":["Step through the three messages.","Notice that BOTH sides pick a random starting number, and each confirms the other's.","Count how long it takes before real data can flow: one full round trip."],"actors":["Your browser","Web server"],"msgs":[[1,1,"listening on port 443","The server program has told the OS: 'accept connections on port 443'. The OS keeps a queue for new connections."],[0,1,"SYN, 'let's talk; my bytes start at number 4,000'","SYN means 'synchronize'. The client proposes its starting sequence number (chosen randomly, so attackers can't easily guess it) and its capabilities, like the largest packet size it can handle."],[1,0,"SYN-ACK, 'OK, got your 4,000; my bytes start at 9,000'","The server acknowledges the client's number and proposes its own. Both directions need their own numbering, because data flows both ways."],[0,1,"ACK, 'got your 9,000'","Now both sides know both starting numbers. The connection is established. The OS hands it to the server program when it calls accept()."],[0,1,"first data: GET /index.html","Real data can now flow. The handshake cost one full round trip, 100 ms if the server is far away, before the first byte of the request."]]}

Why three messages and not two? Each side must **propose** its own starting number **and** hear confirmation that the other side received it. Two messages can't confirm the server's number.

> [!EXAMPLE] **Why far-away websites feel slow even on fast internet.** If the server is 150 ms away, the TCP handshake costs 150 ms, the encryption setup (chapter 7) costs another round trip, and only then can your request go out. That's 300+ ms before the first byte of the page, no matter how much bandwidth you have. This is why websites use servers near their users (CDNs, chapter 9) and why newer protocols cut these round trips (chapter 5).

> [!WARN] **SYN floods.** An attacker can send millions of SYN packets with fake return addresses. The server reserves memory for each half-open connection while waiting for the final ACK that never comes, and runs out of room for real users. The standard defense, **SYN cookies** has the server encode the connection details inside its own starting sequence number and keep no memory until the client proves it's real by completing the handshake.

## Reliability: numbering, acknowledging and resending

TCP numbers **every byte**. Each packet says "these bytes start at number 4,001". The receiver sends back **acknowledgments (ACKs)** saying "I've received everything up to byte 6,000, send me 6,001 next".

The sender keeps a copy of every byte until it's acknowledged. If an acknowledgment doesn't arrive in time, it assumes the packet was lost and **sends it again** (a **retransmission**).

But how long should it wait? It depends on the distance: 5 ms in a data center, 300 ms across the world. TCP **measures** the round-trip time continuously and sets its timeout a bit above the typical value, adjusting as conditions change. If a retransmission is also lost, it waits twice as long before the next try, then four times, and so on (**exponential backoff**), so a struggling network isn't flooded with retries.

Timeouts are slow, so TCP has a faster trick. When packets arrive out of order, say packet 5 is missing but 6, 7 and 8 arrive, the receiver keeps saying "I still need byte X" (the start of packet 5). Three of these **duplicate ACKs** in a row strongly suggest packet 5 was lost, so the sender resends it **immediately** without waiting for the timer. This is **fast retransmit**. Modern TCP also uses **selective acknowledgments (SACK)**: "I have 1–4 and 6–8; I'm only missing 5", so only the missing piece is resent.

## Flow control: don't drown the receiver

Imagine a powerful server sending to a cheap phone that can't process data as fast as it arrives. The phone's buffer would overflow and data would be lost.

So every acknowledgment also carries a **window**: "I have room for 64 KB more". The sender never has more unacknowledged data in flight than that. If the receiving program stops reading (say, it's busy), the buffer fills, the window shrinks to zero, and the sender **pauses**. This is **flow control** backpressure again (OS track, chapter 8), this time across the network.

### Why big windows matter: the bandwidth-delay product

The sender can only have one window's worth of data "in flight" at a time, then must wait for acknowledgments. So the maximum speed is **window ÷ round-trip time**.

> [!EXAMPLE] With a 64 KB window and a 100 ms round trip, the most TCP can send is 64 KB every 100 ms = **5 Mbps** even on a 1 Gbps connection! To fill a 1 Gbps link with a 100 ms round trip, about 12.5 MB must be in flight at once (that's the **bandwidth-delay product**). Modern operating systems automatically grow the window to many megabytes, which is why long-distance transfers can be fast today. When a transfer to a faraway server is mysteriously slow, a small window is a classic suspect.

## Congestion control: the day the internet almost collapsed

Flow control protects the **receiver**. But what about the **network in between**? If everyone sends as fast as their receivers allow, the routers in the middle get overwhelmed. Their queues overflow, packets are dropped, everyone retransmits, which causes even more drops…

> [!STORY] In **October 1986** exactly that happened. The link between Lawrence Berkeley Laboratory and UC Berkeley, 400 meters apart, dropped from 32,000 bits per second to **40 bits per second** a thousand-fold collapse. The network wasn't broken; it was full of retransmissions of retransmissions. Van Jacobson studied the problem and, in 1988, added **congestion control** to TCP. With refinements, his ideas still govern almost every connection on the internet.

The sender keeps a second limit, the **congestion window**: how much it *thinks* the network can handle. It's never told this directly, it has to **probe**:

1. **Slow start.** Begin with a small window (about 10 packets). For every acknowledgment received, grow the window, which roughly **doubles** it every round trip. (Despite the name, this ramps up very quickly.)
2. **Congestion avoidance.** After reaching a threshold, grow cautiously: about **one packet per round trip**.
3. **On packet loss** assume the network is congested and **cut the window in half**. If the loss was severe (a timeout), drop all the way back down and slow-start again.

This pattern, **add slowly, cut sharply** is called **AIMD** (additive increase, multiplicative decrease). It makes many connections sharing a link settle down to roughly equal, fair shares.

Watch the window over time. Each red dot is a packet loss:

::widget CongestionControl {}

Modern variants refine this:

- **CUBIC** (Linux's default) grows the window faster when far from the last loss point and more carefully near it, which works better on fast, long-distance links.
- **BBR** (Google, 2016) doesn't treat loss as the main signal. It continuously measures the path's actual bandwidth and round-trip time, and sends at that rate. On lossy or long-distance links, it can be dramatically faster; YouTube saw meaningful improvements after switching to it.

## Saying goodbye: closing connections and TIME_WAIT

Each direction closes separately. One side sends **FIN** ("I'm done sending"), the other acknowledges, sends its own FIN when it's finished too, and that gets acknowledged.

The side that closed first then waits in a state called **TIME_WAIT** for about a minute before fully forgetting the connection. This guards against a delayed straggler packet from the old connection showing up and being mistaken for part of a new connection on the same ports.

> [!EXAMPLE] **Two real production problems you can diagnose from these states:**
> - **Thousands of connections in TIME_WAIT** on a client making many short requests to the same server: each finished connection holds its port for a minute, and the client can run out of ephemeral ports. The fix is reusing connections (HTTP keep-alive, connection pools), not hacking TIME_WAIT away.
> - **Thousands of connections in CLOSE_WAIT** on a server: the other side said goodbye, but **your application never closed its end**. That's a bug in your code, usually a missing `close()` in an error path, and it slowly leaks resources until the server falls over.

> [!TRY] Run `ss -tan` (Linux) or `netstat -an` (Mac/Windows) to see every TCP connection on your machine and its state: LISTEN, ESTABLISHED, TIME_WAIT, CLOSE_WAIT.

## Two performance traps

### Nagle's algorithm meets delayed ACK

To avoid sending tons of tiny packets, TCP by default holds small writes until either a full packet's worth accumulates or the previous data is acknowledged (**Nagle's algorithm**). Meanwhile, receivers wait up to ~40 ms before acknowledging, hoping to combine the ACK with a reply (**delayed ACK**). Put them together and you can get a pointless **40 ms stall** on every small request: the sender waits for an ACK that the receiver is deliberately delaying.

That's why almost every database driver, RPC framework and online game sets the `TCP_NODELAY` option, which turns Nagle's algorithm off.

### Head-of-line blocking

TCP guarantees order. If packet 5 is lost, packets 6 to 100 sit in the receiver's buffer, **undeliverable** until packet 5 is resent, even if they contain completely unrelated data (say, different images on a web page). This **head-of-line blocking** is the main motivation for QUIC, in the next chapter.

## TCP is a stream, not a series of messages

A common bug when writing network code: one `send()` of 10 KB may arrive as three separate `recv()` calls of different sizes, and two small sends may arrive glued together in one `recv()`. TCP delivers a continuous **stream of bytes** with no message boundaries at all.

Every protocol built on TCP must therefore mark where messages begin and end, with a length prefix ("the next message is 532 bytes"), a delimiter (HTTP headers end with a blank line), or a framing format (HTTP/2, chapter 8).

> [!RECAP]
> - **TCP** turns lossy, out-of-order packets into a reliable, ordered **byte stream** between two programs, identified by IP addresses and **ports**.
> - The **three-way handshake** (SYN, SYN-ACK, ACK) agrees on starting sequence numbers and costs one round trip.
> - **Acknowledgments** **retransmission** (with adaptive timeouts and fast retransmit) and **SACK** provide reliability.
> - **Flow control** (the receive window) protects the receiver; **congestion control** (slow start, AIMD, CUBIC, BBR) protects the network.
> - **TIME_WAIT** pile-ups mean too many short connections; **CLOSE_WAIT** pile-ups mean your code isn't closing sockets.
> - Watch out for **Nagle + delayed ACK** stalls and **head-of-line blocking** and always frame your messages.

> [!INTERVIEW] Top TCP questions: the three-way handshake and why it's three; TCP vs UDP; how reliability works; flow control vs congestion control; slow start and AIMD; what TIME_WAIT is for; what a CLOSE_WAIT buildup means; Nagle's algorithm; head-of-line blocking.

::quiz {"q":"What's the difference between flow control and congestion control?","options":["They're the same","Flow control protects the receiver from being overwhelmed; congestion control protects the network in between","Flow control is only for UDP","Congestion control is done by routers"],"answer":1,"explain":"The sender is limited by both the receive window and the congestion window."}

::quiz {"q":"Your server has thousands of connections stuck in CLOSE_WAIT. What's the likely cause?","options":["Network congestion","The client never sent FIN","Your application isn't calling close() after the other side closed","TIME_WAIT is too long"],"answer":2,"explain":"CLOSE_WAIT means the remote side is done and your program still hasn't closed its end, usually a resource leak in your code."}

::quiz {"q":"A transfer to a server 100 ms away is stuck at 5 Mbps on a 1 Gbps link. What's a likely culprit?","options":["The CPU","A small TCP window: throughput can't exceed window ÷ round-trip time","DNS","The server's disk"],"answer":1,"explain":"64 KB per 100 ms is about 5 Mbps; filling the link needs ~12.5 MB in flight."}
