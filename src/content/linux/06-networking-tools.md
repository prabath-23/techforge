---
title: Networking Tools: curl, dig, ss, ip, nc and tcpdump
summary: The command-line tools for answering "why can't A talk to B?", checking addresses and routes with ip, resolving names with dig, testing ports with nc, inspecting HTTP and TLS with curl and openssl, seeing open connections with ss, and capturing real packets with tcpdump, organized layer by layer.
---

::widget Scene {"title": "Refused vs timed out: what the error tells you", "sub": "diagnosing \"can't connect to the API\" with ss, curl, nc and tcpdump", "nodes": [{"id": "cl", "kind": "laptop", "label": "Client", "x": 3.72, "y": 3.72}, {"id": "fw", "kind": "router", "label": "Firewall", "x": 8.22, "y": -0.78, "color": "orange"}, {"id": "srv", "kind": "server", "label": "Server :8080", "x": 12.72, "y": -5.28, "color": "blue"}], "links": [["cl", "fw"], ["fw", "srv"]], "metrics": [["tool", "Tool"], ["saw", "Saw"], ["means", "Means"]], "steps": [{"short": "Err", "tag": "Symptom", "title": "curl http://server:8080 fails", "body": "<p>The exact error is the biggest clue.</p>", "show": ["cl", "fw", "srv"], "metrics": {"tool": ["curl"], "saw": ["?"], "means": ["?"]}}, {"short": "Refused", "tag": "Refused", "title": "\"Connection refused\", instantly", "body": "<p>The host answered with a TCP RST: reachable, but nothing listening on that port.</p>", "flow": [[["cl", "fw", "srv"], "#3b82f6", "SYN"], [["srv", "fw", "cl"], "#ef4444", "RST"]], "metrics": {"saw": ["refused (fast)"], "means": ["no listener"]}}, {"short": "SS", "tag": "Check", "title": "On the server: ss -tlnp", "body": "<p>Shows the app listening on 127.0.0.1:8080, localhost only, not reachable from outside.</p>", "set": {"srv": {"badge": "listening 127.0.0.1 only"}}, "metrics": {"tool": ["ss -tlnp"], "saw": ["bound to localhost"], "means": ["bind 0.0.0.0"]}}, {"short": "Fix1", "tag": "Fix", "title": "Bind to 0.0.0.0 and restart", "body": "<p>Now it listens on all interfaces.</p>", "set": {"srv": {"badge": "0.0.0.0:8080"}}}, {"short": "Timeout", "tag": "Timed out", "title": "Now: \"Connection timed out\" after 30 s", "body": "<p>No answer at all: packets are being silently dropped, a firewall, security group or routing problem.</p>", "flow": [["cl", "fw", "#3b82f6", "SYN…"], ["fw", "cl", "#ef4444", "(nothing)"]], "set": {"fw": {"badge": "drop"}}, "metrics": {"tool": ["curl"], "saw": ["timeout (slow)"], "means": ["dropped in between"]}}, {"short": "Dump", "tag": "Check", "title": "sudo tcpdump -n port 8080 on the server", "body": "<p>No SYN arrives → it's dropped before the server. If SYNs arrived with no reply, it'd be the host firewall.</p>", "metrics": {"tool": ["tcpdump"], "saw": ["no packets arrive"], "means": ["network firewall"]}}, {"short": "Fix2", "tag": "Fix", "title": "Open 8080 from the client's range in the security group", "body": "<p>nc -vz server 8080 → succeeded.</p>", "flow": [[["cl", "fw", "srv"], "#22c55e", "connected"]], "set": {"fw": {"badge": "allow 8080"}}, "metrics": {"tool": ["nc -vz"], "saw": ["open"], "means": ["fixed", "good"]}}, {"short": "Others", "tag": "More", "title": "Other answers", "body": "<p>\"Could not resolve host\" = DNS (dig). \"No route to host\" = routing or ICMP reject. TLS errors = certificates (openssl s_client).</p>", "note": {"kind": "key", "text": "Refused = reached, nothing listening. Timeout = dropped on the way. Use ss to see listeners, tcpdump to see packets, nc/curl to test."}}]}


## "The API is down", or is it?

> [!STORY] A service can't reach the payments API. Someone says "the API is down" and opens a ticket with the provider. Twenty minutes later, the provider replies: their API is fine. A quick check would have shown the truth in one minute: the name resolved correctly, the server was reachable, but a new firewall rule on **our** side was blocking outgoing port 443. Networking problems feel mysterious until you check each layer in order, with the right tool for each.

The approach: start at the bottom of the stack and work up (Networking track). Is my machine's network set up? Can I resolve the name? Can I reach the host? Is the port open? Does TLS work? Does HTTP return what I expect?

::widget Stepper {"type":"layers","title":"Which tool checks which layer","what":"The layers of a network connection from your app's view (top) down to the wire (bottom), with the command that checks each. Debug from the bottom up.","steps":["Press Play from top to bottom to see the layers.","Then imagine debugging 'can't reach the payments API' from the bottom layer upward.","Find the tool that shows exactly what's on the wire when all else fails."],"nodes":[["HTTP: right answer?","curl -v https://api.example.com/health, status code, headers, body, redirects, timing."],["TLS: secure connection OK?","openssl s_client -connect api.example.com:443 -servername api.example.com, certificate chain, expiry, protocol."],["TCP: is the port open?","nc -vz api.example.com 443, does a TCP connection succeed, get refused, or time out (firewall)?"],["Route: can packets get there?","ping (if ICMP is allowed), traceroute / mtr, where along the path do packets stop?"],["DNS: does the name resolve?","dig api.example.com, which IP addresses, from which server, with what TTL?"],["Local: is my machine set up?","ip addr, ip route, do I have an address, a default gateway, the right interface up? cat /etc/resolv.conf for DNS servers."],["The wire: what's really happening?","tcpdump, capture actual packets: are SYNs going out? are replies coming back? is something resetting connections?"]]}

## Your machine: ip

```bash
ip -br addr            # interfaces and their IP addresses, briefly
ip route               # routing table; "default via 10.0.0.1" is your gateway
ip route get 8.8.8.8   # which interface and gateway would be used to reach this address?
cat /etc/resolv.conf   # which DNS servers am I using?
```

(`ifconfig` and `route` are older tools that still appear in tutorials.)

## Names: dig

```bash
dig api.example.com +short          # just the addresses
dig api.example.com                 # full answer: records, TTLs, which server answered
dig @8.8.8.8 api.example.com        # ask a specific DNS server, compare with your default
dig +trace example.com              # follow the delegation from the root servers down
dig -x 203.0.113.9                  # reverse lookup: IP → name
dig example.com MX                  # mail servers; also TXT, CNAME, NS, AAAA
```

> [!EXAMPLE] **"It works on my laptop but not on the server."** `dig` on the laptop returns the new IP; on the server, the old one. The server is using an internal DNS server that cached the old record for its TTL, or `/etc/hosts` contains a stale entry (`getent hosts api.example.com` checks what the system actually uses, including `/etc/hosts`).

## Reachability: ping, traceroute, mtr

```bash
ping -c 4 10.0.2.15            # is it alive? what's the round-trip time and loss?
traceroute api.example.com     # each router hop along the path
mtr api.example.com            # traceroute + ping combined, live, great for spotting loss
```

Many cloud networks and firewalls block ping (ICMP), so "no ping reply" doesn't prove a host is down. A TCP port test is more reliable.

## Ports: nc and ss

```bash
nc -vz db.internal 5432       # can I open a TCP connection to this port?
#   "succeeded"          → something is listening and reachable
#   "Connection refused" → host reachable, but nothing listening (or actively rejected)
#   hangs, then timeout  → packets are being dropped, usually a firewall or security group
```

> [!NOTE] **Refused vs timed out** is one of the most useful clues in networking. A refusal means you reached the machine and it said no. A timeout means your packets disappeared, a firewall, a wrong route, or a security group silently dropping them.

On the server, check what's listening and what's connected with **ss** (the modern `netstat`):

```bash
ss -tlnp                      # TCP sockets Listening, Numeric ports, with Process names
ss -tn state established '( dport = :5432 )'   # open connections to PostgreSQL
ss -s                         # summary: how many connections in each state
```

> [!WARN] A classic mistake: the app listens on `127.0.0.1:8080` (only reachable from the same machine) instead of `0.0.0.0:8080` (all interfaces). `ss -tlnp` shows it immediately. In containers, this is the number one reason a published port "doesn't work".

Thousands of connections in `TIME_WAIT` or `CLOSE_WAIT` (Networking track, TCP chapter) point to connection-handling problems: `CLOSE_WAIT` piling up usually means **your app** isn't closing sockets.

## HTTP and TLS: curl and openssl

```bash
curl -v https://api.example.com/health        # show the request, response headers and TLS handshake
curl -sS -o /dev/null -w '%{http_code} dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} total=%{time_total}\n' https://api.example.com/
curl -X POST -H 'Content-Type: application/json' -d '{"q":"test"}' https://api.example.com/search
curl --resolve api.example.com:443:203.0.113.9 https://api.example.com/   # test a specific server, bypassing DNS
curl -I https://example.com                    # headers only

openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null | openssl x509 -noout -dates -subject -issuer
```

The timing breakdown tells you **where** the time goes: slow DNS, slow connection (distance or loss), slow TLS, or a slow server (the gap between TLS and total).

## The ground truth: tcpdump

When nothing else explains it, look at the actual packets:

```bash
sudo tcpdump -i any -nn host 203.0.113.9 and port 443
sudo tcpdump -i eth0 -nn 'tcp[tcpflags] & tcp-syn != 0'      # only connection attempts
sudo tcpdump -i any -w capture.pcap port 5432                 # save to open later in Wireshark
```

> [!EXAMPLE] **The story, solved with tcpdump.** On the service's server, `tcpdump host <payments IP>` shows SYN packets leaving repeatedly with no SYN-ACK ever coming back. Combined with `nc` timing out, that means the packets are dropped somewhere outbound. The security group's recent change is the culprit, found in minutes, without blaming the provider.

> [!RECAP]
> - Debug **layer by layer** bottom up: local config (`ip`), DNS (`dig`), route (`ping`, `mtr`), port (`nc`, `ss`), TLS (`openssl`), HTTP (`curl -v`).
> - **Refused** = reached the host, nothing listening; **timeout** = packets dropped (firewall).
> - `ss -tlnp` reveals what's listening and on which address (`127.0.0.1` vs `0.0.0.0`).
> - `curl -w` timing breaks a slow request into DNS, connect, TLS and server time.
> - **tcpdump** shows the truth on the wire.

> [!INTERVIEW] "A service can't reach another service, how do you debug it?" is very common for backend, SRE and DevOps roles. Walk through the layers with these tools, and explain what refused vs timed out tells you.

::quiz {"q":"nc -vz host 5432 hangs and times out. Most likely cause?","options":["Nothing is listening on 5432","A firewall or security group is silently dropping the packets","DNS failed","The certificate expired"],"answer":1,"explain":"Nothing listening would give an immediate 'connection refused'."}

::quiz {"q":"Your container's app is up but unreachable through its published port. ss shows 127.0.0.1:8080. Why?","options":["The port is wrong","It only listens on the loopback interface; bind to 0.0.0.0","Docker is broken","TLS is required"],"answer":1,"explain":"Loopback is only reachable from inside the same network namespace."}

::quiz {"q":"Which tool shows how long DNS, connect, TLS and the server each took?","options":["dig","ping","curl with -w timing variables","ss"],"answer":2,"explain":"time_namelookup, time_connect, time_appconnect, time_total."}
