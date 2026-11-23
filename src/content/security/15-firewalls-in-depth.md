---
title: Firewalls in Depth: Stateful Filtering, iptables/nftables, NGFW, WAF and Cloud Firewalls
summary: Everything about firewalls engineers are asked: stateless packet filters vs stateful inspection with connection tracking, how a packet flows through Linux netfilter chains, writing iptables and nftables rules, NAT, host firewalls on Windows and macOS, next-generation firewalls with application and user identity, TLS inspection and IPS, web application firewalls, cloud security groups vs network ACLs, microsegmentation, high availability, and rule-base hygiene.
---

::widget Scene {"title": "A packet through a stateful Linux firewall", "sub": "an inbound HTTPS request and its reply, chain by chain", "nodes": [{"id": "in", "kind": "cloud", "label": "Internet client 203.0.113.9", "x": 3.72, "y": 3.72}, {"id": "pre", "kind": "cube", "label": "PREROUTING (raw, conntrack, DNAT)", "x": 7.72, "y": -0.28, "color": "purple"}, {"id": "ct", "kind": "doc", "label": "Conntrack table", "x": 1.83, "y": -6.17, "color": "orange"}, {"id": "inp", "kind": "cube", "label": "INPUT (filter rules)", "x": 9.12, "y": -7.88, "color": "blue"}, {"id": "app", "kind": "server", "label": "nginx :443", "x": 13.62, "y": -12.38, "color": "green"}, {"id": "fwd", "kind": "cube", "label": "FORWARD (to containers/LAN)", "x": 15.63, "y": -1.37, "color": "teal"}, {"id": "out", "kind": "cube", "label": "OUTPUT → POSTROUTING (SNAT)", "x": 20.13, "y": -5.87, "color": "pink"}], "links": [["in", "pre"], ["pre", "ct", {"dashed": true}], ["pre", "inp"], ["inp", "app"], ["pre", "fwd"], ["app", "out"], ["out", "in", {"dashed": true}]], "metrics": [["pkt", "Packet"], ["state", "Conntrack state"], ["verdict", "Verdict"]], "steps": [{"short": "Arrive", "tag": "Arrive", "title": "A SYN for port 443 arrives on eth0", "body": "<p>Netfilter hooks in the kernel see every packet. nftables (or iptables) rules attach to these hooks.</p>", "show": ["in", "pre"], "flow": [["in", "pre", "#3b82f6", "SYN → :443"]], "metrics": {"pkt": ["TCP SYN 203.0.113.9 → :443"], "state": ["-"], "verdict": ["-"]}}, {"short": "CT", "tag": "Conntrack", "title": "Connection tracking looks it up: unknown flow → state NEW", "body": "<p>Conntrack remembers every flow (5-tuple, TCP state, timeouts). This is what makes the firewall stateful.</p>", "show": ["in", "pre", "ct"], "flow": [["pre", "ct", "#f59e0b", "lookup"]], "set": {"ct": {"badge": "NEW"}}, "metrics": {"state": ["NEW"]}}, {"short": "Route", "tag": "Routing", "title": "Routing decision: destined for this host → INPUT chain", "body": "<p>For a container or another LAN host it would go to FORWARD instead (after any DNAT in PREROUTING).</p>", "show": ["in", "pre", "ct", "inp", "fwd"]}, {"short": "Rules", "tag": "Filter", "title": "INPUT rules are checked top to bottom; first match wins", "body": "<p>1) accept established,related  2) accept tcp dport 443 ct state new  3) accept ssh from office  4) policy drop.</p>", "flow": [["pre", "inp", "#3b82f6", "rule 2 matches"]], "set": {"inp": {"badge": "rule 2: accept 443"}}, "metrics": {"verdict": ["ACCEPT", "good"]}}, {"short": "Deliver", "tag": "Deliver", "title": "Delivered to nginx; conntrack records the flow", "body": "<p>Its entry moves to ESTABLISHED once the handshake completes.</p>", "show": ["in", "pre", "ct", "inp", "fwd", "app"], "flow": [["inp", "app", "#22c55e", "SYN"]], "set": {"ct": {"badge": "ESTABLISHED"}}, "metrics": {"state": ["ESTABLISHED"]}}, {"short": "Reply", "tag": "Reply", "title": "nginx replies: OUTPUT → POSTROUTING", "body": "<p>Outbound replies match \"established\" in conntrack, no separate rule needed for return traffic.</p>", "show": ["in", "pre", "ct", "inp", "fwd", "app", "out"], "flow": [["app", "out", "#ec4899", "SYN-ACK"], ["out", "in", "#ec4899", ""]], "metrics": {"pkt": ["SYN-ACK → client"]}}, {"short": "Fast", "tag": "Fast path", "title": "Later packets hit rule 1 (established) immediately", "body": "<p>That's why \"accept established\" goes first: most packets match it, cheaply.</p>", "set": {"inp": {"badge": "rule 1: established"}}}, {"short": "Probe", "tag": "Blocked", "title": "A scan to port 5432 (Postgres) arrives", "body": "<p>No rule allows it → default policy DROP. Drop (silence) vs reject (send RST) is a choice: drop slows scanners; reject helps debugging inside networks.</p>", "flow": [["in", "pre", "#ef4444", "SYN → :5432"]], "set": {"inp": {"badge": "policy: drop"}}, "metrics": {"pkt": ["SYN → :5432"], "state": ["NEW"], "verdict": ["DROP", "bad"]}}, {"short": "Limits", "tag": "Limits", "title": "Stateful has limits: conntrack table can fill under a SYN flood", "body": "<p>Use SYN cookies, rate limits, raise nf_conntrack_max, or skip tracking (notrack) for very high-volume stateless services.</p>", "note": {"kind": "key", "text": "Netfilter hooks + conntrack: allow established first, then specific new flows, then default drop. Replies are allowed by state, not by extra rules."}}]}

## The rule that opened everything

> [!STORY] During an outage at 2 a.m., an engineer adds a firewall rule "allow any → any" on the data-centre firewall to rule out the firewall as the cause. The outage turns out to be DNS. The rule stays, for fourteen months, until a penetration test finds the internal database reachable from the guest Wi-Fi. Firewalls are conceptually simple: allow some traffic, block the rest. Running them well, precise rules, layered placement, and ruthless hygiene, is where the engineering is.

## What a firewall decides

A firewall applies rules to traffic based on some combination of:

- **Layer 3/4:** source and destination IP, protocol, ports, interface, direction.
- **Connection state:** is this packet part of an established conversation?
- **Layer 7:** application (identified by content, not port), URL, user identity, file type, threat signatures.

The verdict: **allow** **drop** (silently discard), **reject** (discard and tell the sender), sometimes **log** or **rate-limit**.

## Stateless vs stateful

- **Stateless packet filters** judge each packet alone. To allow web browsing you must also allow inbound packets with source port 443, which attackers can forge. Still used where speed matters and state isn't possible (router ACLs, cloud network ACLs).
- **Stateful firewalls** track connections in a **state table**. Outbound requests create entries; replies are matched against them and allowed automatically; unsolicited inbound packets have no entry and are dropped. For TCP they follow the handshake and teardown; for UDP and ICMP they use timeouts.

## Linux: netfilter, iptables and nftables

The Linux kernel's **netfilter** framework provides hooks where packets can be inspected: **PREROUTING → (routing) → INPUT** for local delivery, **FORWARD** for routed traffic, **OUTPUT → POSTROUTING** for outgoing. **Conntrack** provides state (NEW, ESTABLISHED, RELATED, INVALID). Tables group purposes: `filter` (allow/deny), `nat`, `mangle`, `raw`.

A host firewall in **nftables** (the modern replacement for iptables):

```
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept
    ct state invalid drop
    iif "lo" accept
    tcp dport 443 accept
    ip saddr 10.20.0.0/16 tcp dport 22 accept        # SSH only from the office VPN range
    icmp type echo-request limit rate 5/second accept
    log prefix "drop-in: " limit rate 10/minute
  }
}
```

The same in iptables:

```bash
iptables -P INPUT DROP
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -s 10.20.0.0/16 -p tcp --dport 22 -j ACCEPT
```

Front-ends like **ufw** and **firewalld** generate these rules. Docker and Kubernetes insert their own chains for NAT and service routing, a common source of surprises (Docker-published ports can bypass ufw rules).

> [!WARN] Changing firewall rules on a remote server can lock you out. Schedule an automatic rollback (`at now + 5 minutes` to restore the old ruleset) before applying, or use out-of-band console access.

## NAT

Firewalls often also translate addresses:

- **SNAT / masquerade** many private hosts share one public IP for outbound traffic (Networking chapter 2).
- **DNAT / port forwarding** inbound traffic to a public IP:port is redirected to an internal server.

NAT relies on the same connection tracking as stateful filtering.

## Host firewalls on other systems

- **Windows Defender Firewall** profiles (domain/private/public), rules per program, port and remote address, managed centrally by Group Policy or Intune; the Windows Filtering Platform underneath also serves EDR and VPN products.
- **macOS** the application firewall (per-app inbound) plus `pf` for packet filtering.

Host firewalls are the last line: they still protect a laptop on hotel Wi-Fi.

## Next-generation firewalls (NGFW)

Enterprise network firewalls (Palo Alto, Fortinet, Check Point, Cisco and others) add:

- **Application identification** recognise apps by traffic content regardless of port (block BitTorrent on port 443; allow Teams but not personal file sharing).
- **User identity** rules by user and group via directory integration, not just IP.
- **TLS inspection** decrypt, inspect and re-encrypt traffic with a corporate CA trusted by managed devices. Powerful and controversial: privacy, performance, certificate-pinning breakage; usually exempt categories like banking and health.
- **IPS** signatures (chapter 13), **URL filtering** by category, **malware sandboxing** of files, DNS security.
- **VPN** termination (site-to-site and remote access).

Increasingly these functions move to the cloud as **SASE/SSE** (secure web gateway, cloud firewall, zero-trust network access) so remote users are protected without backhauling traffic.

## Web application firewalls (WAF)

A **WAF** sits in front of web applications (on a CDN, load balancer or reverse proxy) and inspects HTTP requests: SQL injection and XSS patterns (e.g. OWASP Core Rule Set), protocol anomalies, bot detection, rate limiting, virtual patching of known CVEs while the real fix ships. A WAF reduces risk; it doesn't replace secure code, attackers find encodings rules miss.

## Cloud firewalls

| | Security groups (AWS) / NSGs (Azure) | Network ACLs |
|---|---|---|
| Attached to | instances / network interfaces | subnets |
| State | **stateful** | **stateless** (rules for both directions) |
| Rules | allow only | allow and deny, ordered by number |
| Typical use | main per-workload control | coarse subnet guardrails, blocking specific ranges |

Security groups can reference **other security groups** ("allow 5432 from the app tier's group"), rules that stay correct as instances come and go (Cloud chapter 5). Cloud providers also offer managed network firewalls with IPS and domain filtering for egress control.

## Placement: layers and segmentation

- **Perimeter** firewall between the internet and your network.
- **Internal segmentation** between zones (users, servers, payment systems, OT/industrial networks), so a compromised laptop can't reach the database directly.
- **Microsegmentation** per-workload policies (Kubernetes NetworkPolicies, host firewalls managed centrally, service-mesh authorisation), the network side of **zero trust**.
- **Egress filtering** restrict outbound traffic from servers to only what they need. It stops malware calling home and data exfiltration, and it's the most commonly neglected direction.

## High availability and performance

Network firewalls run in **active-passive** or **active-active** pairs, synchronising their session tables so failover doesn't drop connections. Size for throughput *with* inspection features enabled (TLS inspection and IPS can cut throughput dramatically) and for connections per second and concurrent sessions.

## Rule-base hygiene

- **Default deny** then explicit allows.
- Most specific rules first; put high-volume "established" rules at the top for performance.
- Every rule has an **owner, ticket, business reason and review/expiry date**.
- No "any any", and alert when someone adds one.
- Regular reviews: remove rules with zero hits, merge duplicates, find shadowed rules (never reached because an earlier rule matches first).
- **Log** denies and important allows to the SIEM (chapter 11); watch for spikes.
- Manage rules as code (Terraform, Ansible) with review and automated testing where possible.

> [!RECAP]
> - Firewalls allow/drop/reject by L3–L4 fields, connection state and, in NGFWs, application, user and content.
> - **Stateful** = connection tracking; replies are allowed by state. Cloud **NACLs are stateless** security groups stateful.
> - Linux: netfilter hooks, conntrack, **nftables**/iptables; accept established first, default drop; beware Docker chains and lockouts.
> - NGFW adds app-ID, user-ID, TLS inspection, IPS, URL filtering; **WAFs** protect HTTP apps.
> - Layer perimeter, internal segmentation, microsegmentation and **egress filtering**.
> - Hygiene: owners, reasons, expiry, reviews, no any-any, rules as code, logs to SIEM.

> [!INTERVIEW] "Stateful vs stateless firewall?", "Security group vs NACL?", "Walk a packet through iptables chains", "Drop vs reject?", "Why filter egress?", "What does an NGFW do that a basic firewall can't?", "WAF vs network firewall?", "How would you clean up a 5,000-rule firewall?"

::quiz {"q": "Why don't stateful firewalls need rules for reply traffic?", "options": ["Replies are never filtered", "Connection tracking matches replies to the established connection and allows them", "Replies use UDP", "The OS bypasses the firewall"], "answer": 1, "explain": "The state table remembers the outbound request."}

::quiz {"q": "In AWS, which is stateless?", "options": ["Security groups", "Network ACLs", "Both", "Neither"], "answer": 1, "explain": "NACLs need rules for both directions, including ephemeral ports."}

::quiz {"q": "Why put \"accept established,related\" first in an INPUT chain?", "options": ["It is required syntax", "Most packets belong to existing connections, so matching them first is fast and keeps replies working", "It blocks scans", "It enables NAT"], "answer": 1, "explain": "First match wins."}

::quiz {"q": "Which control most directly stops a compromised server from sending data to an attacker's host?", "options": ["Inbound port filtering", "Egress filtering allowing only required destinations", "A bigger CPU", "Disabling ICMP"], "answer": 1, "explain": "Outbound restrictions are often neglected."}
