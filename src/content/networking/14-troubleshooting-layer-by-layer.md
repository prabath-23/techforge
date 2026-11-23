---
title: Troubleshooting a Network, Layer by Layer
summary: A practical method for diagnosing "the network is broken", using the layered model as a checklist, the questions that narrow a problem down fast, four detailed real-world cases (a DNS change, an MTU black hole, intermittent timeouts from conntrack exhaustion, and a slow cross-region link), and how to communicate findings.
---

::widget Scene {"title": "\"The website is down\": troubleshooting layer by layer", "sub": "a methodical walk from cable to HTTP", "nodes": [{"id": "pc", "kind": "laptop", "label": "Your laptop", "x": 3.72, "y": 3.72}, {"id": "gw", "kind": "router", "label": "Router", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "dns", "kind": "doc", "label": "DNS", "x": 1.83, "y": -6.17, "color": "orange"}, {"id": "net", "kind": "cloud", "label": "Internet", "x": 11.72, "y": -4.28}, {"id": "srv", "kind": "server", "label": "shop.example.com", "x": 15.72, "y": -8.28, "color": "purple"}], "links": [["pc", "gw"], ["pc", "dns", {"dashed": true}], ["gw", "net"], ["net", "srv"]], "metrics": [["cmd", "Command"], ["res", "Result"], ["layer", "Layer"]], "steps": [{"short": "Link", "tag": "L1/L2", "title": "Is the link up?", "body": "<p><code>ip link</code> / Wi-Fi icon. State UP, an IP address assigned (<code>ip addr</code>). A 169.254.x.x address means DHCP failed.</p>", "show": ["pc"], "metrics": {"cmd": ["ip addr"], "res": ["192.168.1.23 ✓"], "layer": ["link"]}}, {"short": "GW", "tag": "L3", "title": "Can I reach my router?", "body": "<p><code>ping 192.168.1.1</code> → replies in 2 ms. Local network fine.</p>", "show": ["pc", "gw"], "flow": [["pc", "gw", "#22c55e", "ping"]], "metrics": {"cmd": ["ping gateway"], "res": ["2 ms ✓"], "layer": ["network (local)"]}}, {"short": "Internet", "tag": "L3", "title": "Can I reach the internet by IP?", "body": "<p><code>ping 1.1.1.1</code> → replies. Routing and ISP fine.</p>", "show": ["pc", "gw", "net"], "flow": [[["pc", "gw", "net"], "#22c55e", "ping 1.1.1.1"]], "metrics": {"cmd": ["ping 1.1.1.1"], "res": ["14 ms ✓"], "layer": ["network (internet)"]}}, {"short": "DNS", "tag": "DNS", "title": "Does the name resolve?", "body": "<p><code>dig shop.example.com</code> → 203.0.113.80. If this failed but IP pings worked, \"the internet is down\" is really DNS.</p>", "show": ["pc", "gw", "net", "dns"], "flow": [["pc", "dns", "#f59e0b", "dig"]], "metrics": {"cmd": ["dig"], "res": ["203.0.113.80 ✓"], "layer": ["DNS"]}}, {"short": "Port", "tag": "L4", "title": "Is the port open?", "body": "<p><code>nc -vz shop.example.com 443</code> → \"timed out\". Packets go out, nothing comes back.</p>", "show": ["pc", "gw", "net", "dns", "srv"], "flow": [[["pc", "gw", "net", "srv"], "#ef4444", "SYN → ???"]], "metrics": {"cmd": ["nc -vz :443"], "res": ["timeout", "bad"], "layer": ["transport"]}}, {"short": "Meaning", "tag": "Interpret", "title": "Timeout vs refused", "body": "<p>Refused = host reached, nothing listening. Timeout = something dropped the packet: a firewall, or the host is down.</p>", "metrics": {"res": ["firewall or host down?"]}}, {"short": "Trace", "tag": "Path", "title": "traceroute -T -p 443 shows where it dies", "body": "<p>Last hop that answers is the provider's edge, the server's own firewall is dropping it.</p>", "set": {"net": {"badge": "last reply: hop 9"}}, "metrics": {"cmd": ["traceroute -T"]}}, {"short": "Fix", "tag": "Fix", "title": "Yesterday's change removed the 443 rule from the security group", "body": "<p>Restore it. nc now connects.</p>", "flow": [[["pc", "gw", "net", "srv"], "#22c55e", "connected"]], "set": {"srv": {"badge": "443 allowed"}}, "metrics": {"res": ["open ✓", "good"]}}, {"short": "HTTP", "tag": "L7", "title": "Finally check the application", "body": "<p><code>curl -v https://shop.example.com</code>: TLS ok, HTTP 200. Done.</p>", "metrics": {"cmd": ["curl -v"], "res": ["200 OK", "good"], "layer": ["application"]}, "note": {"kind": "key", "text": "Go up the stack: link → gateway → internet by IP → DNS → port → TLS/HTTP. Each test halves the search space."}}]}

::widget Scene {"title": "ICMP: ping and traceroute", "sub": "the internet's error and diagnostics messages", "nodes": [{"id": "pc", "kind": "laptop", "label": "You", "x": 3.1, "y": 3.1}, {"id": "r1", "kind": "router", "label": "Hop 1", "x": 6.7, "y": -0.5, "color": "blue"}, {"id": "r2", "kind": "router", "label": "Hop 2", "x": 10.3, "y": -4.1, "color": "blue"}, {"id": "s", "kind": "server", "label": "Server", "x": 13.9, "y": -7.7, "color": "green"}], "links": [["pc", "r1"], ["r1", "r2"], ["r2", "s"]], "metrics": [["tool", "Tool"], ["learn", "You learn"]], "steps": [{"short": "Ping", "tag": "Echo", "title": "ping: echo request → echo reply", "body": "<p>Is it reachable, and how long is the round trip? (Many servers block ping, so silence isn't proof it's down.)</p>", "flow": [[["pc", "r1", "r2", "s"], "#3b82f6", "echo request"], [["s", "r2", "r1", "pc"], "#22c55e", "echo reply"]], "metrics": {"tool": ["ping"], "learn": ["reachable, 24 ms"]}}, {"short": "TTL 1", "tag": "Trace", "title": "traceroute sends packets that expire after 1 hop", "body": "<p>Hop 1 drops it and replies with ICMP \"time exceeded\", revealing itself.</p>", "flow": [["pc", "r1", "#f59e0b", "TTL=1"], ["r1", "pc", "#ef4444", "time exceeded"]], "metrics": {"tool": ["traceroute"], "learn": ["hop 1: 3 ms"]}}, {"short": "TTL 2, 3", "tag": "Trace", "title": "TTL 2 reveals hop 2, TTL 3 reaches the server", "body": "<p>Each hop's delay shows where latency or loss begins.</p>", "flow": [[["pc", "r1", "r2"], "#f59e0b", "TTL=2"], ["r2", "pc", "#ef4444", "time exceeded"]], "metrics": {"learn": ["hop 2: 18 ms, server: 24 ms"]}, "note": {"kind": "warn", "text": "Blocking all ICMP breaks path-MTU discovery and causes mysterious hangs on large transfers. Allow \"packet too big\" messages."}}]}

## "It's always DNS"

> [!STORY] There's a well-known engineering haiku: *"It's not DNS. There's no way it's DNS. It was DNS."* Network problems are frustrating because the symptom, "it's slow", "it times out", "it works for me", is far away from the cause, which might be a typo in a DNS record, a firewall rule, a packet-size limit, a full connection table, or a congested link on another continent. Experienced engineers don't guess. They use the **layered model** as a checklist, ask a few questions that cut the problem space in half, and test one layer at a time.

The tools are covered in the Linux track (chapter 6). This chapter is about the **method** with worked cases.

## Step 1: describe the problem precisely

Before running any command, pin down:

- **What exactly fails?** An error message, a timeout, slowness, or wrong data?
- **Who is affected?** One user, one office, one region, one app version, everyone?
- **Since when?** What changed around that time, a deploy, a config change, a certificate renewal, a provider incident?
- **Always or sometimes?** Intermittent problems point to capacity, load balancing across a bad backend, or timeouts, not to plain misconfiguration.
- **From where to where?** Client → load balancer, service → database, office → cloud?

> [!ANALOGY] A doctor's first questions: Where does it hurt? Since when? Does it hurt all the time or only when you move? Have you eaten anything unusual? The answers rule out most possible diagnoses before any test is ordered.

## Step 2: walk the layers

::widget Stepper {"type":"layers","title":"A troubleshooting checklist, bottom to top","what":"The layers of a network connection, each with the question to ask and how to check it. Work from the bottom up; stop at the first layer that fails.","steps":["Press Play to see every layer.","For a 'timeout connecting to the database' report, decide which layers you'd check first.","Notice how 'refused' and 'timeout' point to different layers."],"nodes":[["Application","Does the service itself work? Check its logs, health endpoints and recent deploys. Is the error actually from the network at all?"],["TLS","Is the certificate valid, unexpired, for the right name, with the full chain? openssl s_client, curl -v."],["Transport (TCP/UDP)","Can a connection be opened? Refused = reached the host but nothing listening; timeout = something drops packets. nc -vz, ss on the server."],["Routing and firewalls","Is there a route both ways? Do security groups, network ACLs, host firewalls and network policies allow it, in BOTH directions? traceroute/mtr, flow logs."],["Name resolution","Does the name resolve to the right address from where the client is? dig, getent hosts, check /etc/hosts and the resolver in use."],["Local link and addressing","Is the interface up with the right IP, gateway and DNS server? ip addr, ip route, DHCP leases. Is Wi-Fi or the VPN connected?"]]}

### Cutting the problem in half

- **Compare working vs failing:** works from one server but not another? Same request, different result → diff their DNS, routes, firewall rules and versions.
- **Bypass layers:** use the IP directly instead of the name (`curl --resolve`), hit a backend directly instead of the load balancer, test from inside the same subnet.
- **Look at both ends:** capture packets on the client **and** the server (`tcpdump`). If the SYN leaves the client but never arrives at the server, the problem is in between.

## Case 1: the DNS change that only half worked

> [!EXAMPLE] **Symptom:** after migrating an API to a new load balancer, about 30% of customers still hit the old, now-shut-down servers and get timeouts, two days later.
>
> **Investigation:** `dig api.example.com` from the office shows the new address. `dig @8.8.8.8` too. But a customer's error logs show the old IP. The old record had a **TTL of 86,400 seconds (24 hours)**; some corporate resolvers enforce minimum cache times, and some customers' Java services cached DNS **forever** (older JVM default with a security manager).
>
> **Fix and lesson:** temporarily run the old IP as a redirect/proxy to the new one. Next time, lower the TTL days **before** a migration, keep the old endpoint alive through the transition, and configure clients to respect DNS TTLs.

## Case 2: the MTU black hole

> [!EXAMPLE] **Symptom:** after setting up a new VPN to a partner, small API calls work, but large responses hang forever. SSH connects, then freezes when output is long.
>
> **Investigation:** the handshake succeeds (small packets), but large packets vanish. The VPN adds ~60 bytes of headers, so 1,500-byte packets no longer fit the link's **MTU** (maximum packet size). Normally, routers send back ICMP "fragmentation needed" messages so senders shrink packets (**path MTU discovery**), but a firewall was blocking **all** ICMP. Packets were silently dropped: a "black hole". `ping -M do -s 1472 host` (don't fragment) fails, while `-s 1400` works.
>
> **Fix and lesson:** allow ICMP "fragmentation needed" / "packet too big" messages, or set **MSS clamping** on the VPN gateway so TCP negotiates smaller segments. Blocking all ICMP breaks networks in subtle ways.

## Case 3: intermittent timeouts under load

> [!EXAMPLE] **Symptom:** during peak traffic, about 1% of requests from an API fleet to a payment provider time out on connect. Below peak, there are none.
>
> **Investigation:** the provider's status is green. On an API host, `dmesg` shows `nf_conntrack: table full, dropping packet`. Every outgoing connection uses an entry in the kernel's connection-tracking table (used by the stateful firewall and NAT); a burst of short-lived connections, the client opened a **new TCP and TLS connection per request** filled it. A similar issue appears with **NAT gateway port exhaustion** in clouds and with ephemeral port exhaustion (`TIME_WAIT` build-up).
>
> **Fix and lesson:** reuse connections with **keep-alive and connection pooling** (also saving a TLS handshake per request), raise conntrack limits appropriately, and monitor conntrack usage and NAT gateway port allocation errors. Intermittent, load-dependent problems usually mean a **limit** somewhere is being hit.

## Case 4: slow transfers between regions

> [!EXAMPLE] **Symptom:** nightly backups from Mumbai to a bucket in Frankfurt take 9 hours instead of the expected 1, though the link is rated at 10 Gbps.
>
> **Investigation:** `mtr` shows ~120 ms round-trip time and 0.1% packet loss. A single TCP connection's throughput is limited by **window size ÷ RTT** and loss makes congestion control cut its speed sharply (Networking chapter 5, try the congestion-control figure there). One stream over a long, slightly lossy path simply can't fill a 10 Gbps pipe.
>
> **Fix and lesson:** use **parallel streams** (multipart uploads, `aws s3 cp` with higher concurrency), make sure TCP window scaling and buffers are large enough, consider **BBR** congestion control, and transfer only changed data. High bandwidth doesn't help much when latency and loss dominate.

## Step 3: communicate clearly

When you report a network problem, to another team or a provider, include:

- Exact source and destination (IPs, ports, names), and the time window with time zone.
- What you observed at each layer: "DNS resolves to X, TCP connect times out from subnet A but succeeds from subnet B, packet capture shows SYNs leaving with no SYN-ACK."
- What changed recently, and what you've already ruled out.

A report like that gets fixed in an hour; "the network is slow" gets bounced around for days.

> [!RECAP]
> - Start by **describing the problem precisely**: what, who, since when, how often, from where to where.
> - **Walk the layers** bottom up: link, DNS, routing/firewalls, transport, TLS, application.
> - **Cut the problem in half**: compare working vs failing, bypass layers, capture on both ends.
> - Classic causes: **DNS caching** **MTU black holes** from blocked ICMP, **connection-table / port exhaustion** under load, and **latency × loss** limiting throughput.
> - Report findings with specifics, timestamps and evidence per layer.

> [!INTERVIEW] "Users report the site is slow / timing out, walk me through how you'd debug it" is one of the most common SRE and senior backend questions. Show a structured, layered approach and mention concrete checks and tools.

::quiz {"q":"Small requests succeed through a new VPN but large responses hang. A likely cause?","options":["DNS failure","An MTU problem with blocked ICMP, so oversized packets are silently dropped","Expired certificate","Wrong port"],"answer":1,"explain":"Path MTU discovery needs ICMP 'packet too big' messages."}

::quiz {"q":"Timeouts happen only at peak load, and dmesg says 'nf_conntrack: table full'. Best long-term fix?","options":["Restart servers nightly","Reuse connections (keep-alive, pooling) and size conntrack limits appropriately","Disable the firewall","Use UDP"],"answer":1,"explain":"One new connection per request exhausts tracking tables."}

::quiz {"q":"Why might a single TCP stream between distant regions be slow on a 10 Gbps link?","options":["TCP is capped at 1 Gbps","Throughput is limited by window size ÷ round-trip time, and loss cuts it further","DNS is slow","TLS is disabled"],"answer":1,"explain":"Use parallel streams and tuned buffers."}
