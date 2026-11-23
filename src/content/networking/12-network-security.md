---
title: Network Security — Firewalls, VPNs and DDoS
summary: Protecting networks and the services on them — stateless vs stateful firewalls and how rules are written, segmentation and zero trust, VPNs (IPsec, WireGuard) and modern alternatives, attacks on the network itself (spoofing, ARP poisoning, BGP hijacks), and how DDoS attacks work and are absorbed at internet scale.
---

::widget Scene {"title": "Defence in depth for a small company network", "sub": "firewall, segmentation, VPN, and an attack that stalls at each layer", "nodes": [{"id": "atk", "kind": "user", "label": "Attacker", "x": 3.72, "y": 3.72, "color": "red"}, {"id": "fw", "kind": "router", "label": "Firewall", "x": 7.72, "y": -0.28, "color": "orange"}, {"id": "dmz", "kind": "server", "label": "Public web server (DMZ)", "x": 8.0, "y": -8.0, "color": "blue"}, {"id": "lan", "kind": "laptop", "label": "Staff laptops", "x": 15.44, "y": -0.56}, {"id": "db", "kind": "db", "label": "Database (internal)", "x": 15.72, "y": -8.28, "color": "purple"}, {"id": "vpn", "kind": "cube", "label": "VPN gateway", "x": 13.3, "y": 5.3, "color": "green"}, {"id": "home", "kind": "laptop", "label": "Remote employee", "x": 9.3, "y": 9.3}], "links": [["atk", "fw"], ["fw", "dmz"], ["fw", "lan"], ["dmz", "db"], ["home", "vpn"], ["vpn", "lan"]], "metrics": [["rule", "Rule"], ["result", "Attack result"]], "steps": [{"short": "Default", "tag": "Firewall", "title": "Default deny: block everything, then allow what's needed", "body": "<p>Allow 443 to the web server. Nothing else from the internet.</p>", "show": ["atk", "fw", "dmz", "lan", "db"], "metrics": {"rule": ["allow 443 → web only"], "result": ["—"]}}, {"short": "Scan", "tag": "Attack", "title": "The attacker scans all ports", "body": "<p>Only 443 answers. RDP, SSH and the database are invisible.</p>", "flow": [["atk", "fw", "#ef4444", "scan 1–65535"]], "set": {"fw": {"badge": "dropped 65,534"}}, "metrics": {"result": ["only 443 open", "good"]}}, {"short": "Stateful", "tag": "Firewall", "title": "Stateful: replies to staff's outbound requests are allowed back", "body": "<p>The firewall tracks connections, so you don't need rules for return traffic.</p>"}, {"short": "Exploit", "tag": "Attack", "title": "The web app has a bug; the attacker gets in", "body": "<p>Firewalls don't stop attacks over allowed ports.</p>", "flow": [["atk", "fw", "#ef4444", ""], ["fw", "dmz", "#ef4444", "exploit"]], "set": {"dmz": {"badge": "compromised"}}, "metrics": {"result": ["web server owned", "bad"]}}, {"short": "DMZ", "tag": "Segmentation", "title": "But the web server sits in a DMZ segment", "body": "<p>It may only talk to the database on port 5432 — not to staff laptops.</p>", "flow": [["dmz", "lan", "#ef4444", "blocked"]], "metrics": {"rule": ["DMZ → DB:5432 only"], "result": ["can't reach laptops", "good"]}}, {"short": "DB", "tag": "Least privilege", "title": "DB account can only run the app's queries", "body": "<p>No admin rights, encrypted at rest, alerts on unusual queries. Damage is limited and noticed.</p>", "flow": [["dmz", "db", "#f59e0b", "SELECT …"]], "set": {"db": {"badge": "alert: odd query"}}}, {"short": "Detect", "tag": "Detection", "title": "Intrusion detection flags outbound traffic to a strange host", "body": "<p>The team isolates the server. Logs show exactly what was touched.</p>", "set": {"fw": {"badge": "IDS alert"}}}, {"short": "VPN", "tag": "Remote access", "title": "Remote staff connect through a VPN", "body": "<p>An encrypted tunnel (WireGuard/IPsec) with MFA makes their laptop part of the staff segment.</p>", "show": ["atk", "fw", "dmz", "lan", "db", "vpn", "home"], "flow": [[["home", "vpn", "lan"], "#22c55e", "encrypted tunnel"]], "set": {"dmz": {"badge": null}, "db": {"badge": null}, "fw": {"badge": null}}}, {"short": "ZT", "tag": "Zero trust", "title": "Better still: zero trust", "body": "<p>Don't trust a device just because it's inside. Check user, device health and permission on every request to every app.</p>", "note": {"kind": "key", "text": "Layers: default-deny firewall, segmentation, least privilege, detection, encrypted remote access — so one failure doesn't become total compromise."}}]}

::widget Scene {"title": "Firewalls: default deny, allow what you need", "sub": "a stateful firewall in front of a server", "nodes": [{"id": "in", "kind": "cloud", "label": "Internet", "x": 3.1, "y": 3.1}, {"id": "fw", "kind": "router", "label": "Firewall", "x": 7.1, "y": -0.9, "color": "red"}, {"id": "s", "kind": "server", "label": "Web server", "x": 11.1, "y": -4.9, "color": "green"}], "links": [["in", "fw"], ["fw", "s"]], "metrics": [["rules", "Rules"], ["res", "Result"]], "steps": [{"short": "Default deny", "tag": "Policy", "title": "Start by dropping everything", "body": "<p>Then allow only what's needed: TCP 443 (HTTPS) from anywhere, SSH only from the office.</p>", "metrics": {"rules": ["deny all; allow 443; allow 22 from office"], "res": ["—"]}}, {"short": "Allowed", "tag": "Pass", "title": "A request to port 443 passes", "body": "<p>The firewall also remembers this connection, so the replies flow back automatically (that's \"stateful\").</p>", "flow": [[["in", "fw", "s"], "#22c55e", ":443"]], "metrics": {"res": ["allowed", "good"]}}, {"short": "Dropped", "tag": "Block", "title": "A scan of port 3306 (database) is dropped", "body": "<p>Silently dropped — the scanner learns nothing.</p>", "flow": [["in", "fw", "#ef4444", ":3306 ✗"]], "metrics": {"res": ["dropped", "good"]}, "note": {"kind": "key", "text": "Also filter outgoing traffic: it stops a compromised server from downloading tools or leaking data."}}]}

::widget Scene {"title": "VPNs: a private tunnel over the public internet", "sub": "WireGuard and IPsec", "nodes": [{"id": "pc", "kind": "laptop", "label": "Remote laptop", "x": 3.1, "y": 3.1}, {"id": "net", "kind": "cloud", "label": "Café Wi-Fi + internet", "x": 7.6, "y": -1.4}, {"id": "vpn", "kind": "router", "label": "VPN gateway", "x": 12.1, "y": -5.9, "color": "purple"}, {"id": "wiki", "kind": "server", "label": "Internal wiki 10.0.3.20", "x": 16.1, "y": -9.9, "color": "green"}], "links": [["pc", "net"], ["net", "vpn"], ["vpn", "wiki"]], "metrics": [["seen", "Café sees"], ["proto", "Protocol"]], "steps": [{"short": "Wrap", "tag": "Encrypt", "title": "The laptop encrypts the whole packet and wraps it", "body": "<p>Original: laptop → 10.0.3.20 (a private address). It's encrypted and put inside a new packet addressed to the VPN gateway.</p>", "flow": [[["pc", "net", "vpn"], "#a855f7", "🔒 tunnel"]], "metrics": {"seen": ["encrypted UDP to the gateway", "good"], "proto": ["WireGuard"]}}, {"short": "Unwrap", "tag": "Deliver", "title": "The gateway decrypts and forwards it inside the network", "body": "<p>The wiki sees a normal internal request. Replies go back through the tunnel.</p>", "flow": [["vpn", "wiki", "#22c55e", "GET /"]]}, {"short": "Kinds", "tag": "Options", "title": "WireGuard: tiny and fast. IPsec: the classic site-to-site standard", "body": "<p>WireGuard is ~4,000 lines with modern crypto. IPsec (IKEv2 + ESP) links offices and clouds. Zero-trust access proxies are replacing \"one VPN unlocks everything\".</p>", "note": {"kind": "key", "text": "A VPN hides your traffic from the local network — but the VPN provider or gateway can see it instead."}}]}

::widget Scene {"title": "DDoS amplification: small question, huge answer", "sub": "how attackers multiply their bandwidth", "nodes": [{"id": "atk", "kind": "user", "label": "Attacker", "x": 3.1, "y": 3.1}, {"id": "dns", "kind": "server", "label": "Open servers ×1000", "x": 7.6, "y": -1.4, "color": "orange"}, {"id": "v", "kind": "server", "label": "Victim", "x": 12.1, "y": -5.9, "color": "red"}, {"id": "cdn", "kind": "cloud", "label": "Anycast scrubbing", "x": 7.14, "y": -10.86}], "links": [["atk", "dns"], ["dns", "v"]], "metrics": [["in", "Attacker sends"], ["out", "Victim receives"]], "steps": [{"short": "Spoof", "tag": "Spoof", "title": "Tiny requests with the victim's address forged as sender", "body": "<p>60-byte queries to thousands of open DNS/NTP/memcached servers, all claiming to come from the victim.</p>", "show": ["atk", "dns", "v"], "flow": [["atk", "dns", "#ef4444", "60 B, from=victim"]], "metrics": {"in": ["1 Gbps"], "out": ["—"]}}, {"short": "Amplify", "tag": "Flood", "title": "Every server sends a large reply to the victim", "body": "<p>Replies can be 50× (or far more) the request size. The victim's link drowns.</p>", "show": ["atk", "dns", "v"], "flow": [["dns", "v", "#ef4444", "3,000 B each"], ["dns", "v", "#ef4444", ""], ["dns", "v", "#ef4444", ""]], "set": {"v": {"badge": "overwhelmed"}}, "metrics": {"out": ["50 Gbps", "bad"]}}, {"short": "Absorb", "tag": "Defend", "title": "Spread the flood across a huge anycast network", "body": "<p>DDoS protection (Cloudflare, AWS Shield) advertises the victim's address from hundreds of locations and filters junk near its source.</p>", "set": {"v": {"badge": null}}, "flow": [["dns", "cdn", "#ef4444", "absorbed"]], "metrics": {"out": ["clean traffic only", "good"]}, "note": {"kind": "key", "text": "Also: rate limits, SYN cookies, caching, and ISPs dropping packets with forged source addresses (BCP 38)."}}]}

## 2.3 terabits per second

> [!STORY] In February 2020, AWS reported absorbing a DDoS attack peaking at **2.3 terabits per second** — more traffic than many countries' entire internet connections. Since then, records have kept falling: Cloudflare has reported attacks of tens of terabits per second and billions of packets per second, often from botnets of hijacked cameras, routers and servers. No single company's firewall can survive that alone. Defending networks takes layers: filters at every boundary, careful segmentation inside, encryption across untrusted links, and enormous shared infrastructure at the edge.

## Firewalls

A **firewall** decides, packet by packet or connection by connection, what's allowed through.

### Stateless vs stateful

- **Stateless** filters (simple router ACLs, cloud network ACLs) judge each packet alone by addresses, ports and protocol. They must explicitly allow return traffic — e.g. replies to ephemeral ports.
- **Stateful** firewalls (Linux nftables/iptables with connection tracking, cloud **security groups**) remember connections: allow an outgoing connection, and its replies are automatically allowed back.

```bash
# nftables: a minimal stateful server firewall
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;     # default: drop everything
    ct state established,related accept                 # replies to our own connections
    iif lo accept                                       # local loopback
    tcp dport { 22, 443 } accept                        # SSH and HTTPS only
    icmp type echo-request limit rate 5/second accept   # some ping, rate-limited
  }
}
```

> [!ANALOGY] A stateless firewall is a guard who checks every person's ticket at the door, with no memory — even someone returning from the bathroom must show a ticket again. A stateful firewall is a guard who remembers "you came in with the group from table 5" and lets you back in.

### Beyond ports: application-level filtering

- **Next-generation firewalls** identify applications, inspect TLS (with the organization's own certificates) and block threats.
- **Web application firewalls (WAFs)** sit in front of websites and filter HTTP requests — blocking SQL-injection patterns, bad bots, abusive rates (Security track).
- **Egress filtering** — controlling what goes **out** — stops compromised machines from downloading tools or sending stolen data, and is often forgotten.

## Segmentation and zero trust

A flat network where every machine can reach every other means one compromised laptop can reach the payroll database.

- **Segmentation:** split networks into zones (users, servers, databases, management) with firewalls between them; cloud **VPCs and subnets** do this (Cloud track, chapter 5).
- **Micro-segmentation:** rules down to individual workloads — Kubernetes network policies, security groups that reference each other.
- **Zero trust** goes further: being "inside" the network grants nothing; every request is authenticated and authorized based on user identity, device health and context (Security track, chapter 6). Google's **BeyondCorp** moved its employees off the traditional VPN model this way.

## VPNs: private links over a public network

A **VPN** creates an encrypted **tunnel**: packets are wrapped inside other encrypted packets, so anyone in between sees only the tunnel.

::widget Stepper {"type":"flow","cols":3,"title":"What a VPN tunnel does to a packet","what":"How a packet from a remote employee's laptop reaches an internal server through a VPN. Each box is one step of the journey.","steps":["Press Play and follow the packet.","Notice what the coffee-shop Wi-Fi can and can't see.","Find where the original packet is unwrapped."],"nodes":[["Original packet","Laptop (10.8.0.5) → internal wiki (10.0.3.20), port 443. Private addresses that mean nothing on the internet."],["Encrypt and wrap","The VPN software encrypts the whole packet and puts it inside a new packet: laptop's public IP → VPN gateway's public IP, UDP port 51820 (WireGuard)."],["Across the internet","The café Wi-Fi and every router in between see only encrypted UDP traffic to the VPN gateway — not where it's ultimately going or what it contains."],["VPN gateway unwraps","The gateway decrypts, checks the sender is an authorized peer, and recovers the original packet."],["Inside the private network","The original packet is routed to 10.0.3.20 like any internal traffic, subject to internal firewall rules."],["Reply","The wiki's reply goes back to the gateway, is encrypted and wrapped, and travels back through the tunnel."]]}

Types:

- **Site-to-site VPNs** link an office or data center to a cloud network (usually **IPsec**), always on.
- **Remote-access VPNs** connect individual laptops — OpenVPN, IPsec/IKEv2, and increasingly **WireGuard**: about 4,000 lines of code (vs hundreds of thousands for older VPNs), modern cryptography, fast, and built into the Linux kernel. Tailscale and similar products build mesh networks on top of it.
- **Consumer VPNs** route your traffic through a provider — hiding it from your local network and ISP, but the VPN provider can then see it instead.

> [!NOTE] Traditional VPNs grant access to a whole network once connected. **Zero-trust access proxies** (identity-aware proxies) instead grant access per application, checking identity and device on every request — reducing what a stolen laptop or credential can reach.

## Attacks on the network itself

- **IP spoofing:** forging the source address on packets. Can't complete a TCP handshake (replies go to the real owner), but is used in DDoS reflection attacks. Defense: ISPs filtering packets with impossible source addresses (BCP 38).
- **ARP spoofing:** on a local network, an attacker answers ARP requests with their own MAC address (Networking chapter 3), placing themselves between victims and the router (man-in-the-middle). Defenses: switch features like dynamic ARP inspection, and — most importantly — encryption (TLS), which makes intercepted traffic useless.
- **Rogue DHCP and DNS:** handing out the attacker's DNS server. DNSSEC, DNS-over-HTTPS and TLS certificate checks limit the damage.
- **BGP hijacking:** an internet network announces routes for addresses it doesn't own, attracting others' traffic (Networking chapter 2). In 2008, a Pakistani ISP accidentally took YouTube offline worldwide this way; in 2018, attackers hijacked Amazon's DNS routes to steal cryptocurrency. Defense: **RPKI**, cryptographically signed route ownership, now widely deployed.

## DDoS: overwhelming by volume

A **distributed denial-of-service** attack floods a target from many machines so legitimate users can't get through.

| Type | How it works | Example |
|---|---|---|
| **Volumetric** | Fill the network pipe with traffic | UDP floods; **reflection/amplification**: send small spoofed requests to open DNS, NTP or memcached servers, which send large replies to the victim (memcached could amplify ~50,000×) |
| **Protocol** | Exhaust connection tables in servers, firewalls and load balancers | SYN floods — half-open connections that never complete |
| **Application layer (L7)** | Valid-looking but expensive requests | Millions of HTTP requests to a slow search page; HTTP/2 "Rapid Reset" (2023) |

> [!ANALOGY] A volumetric attack is jamming a shop's entrance with a crowd of thousands — nobody can get in. A protocol attack is many people phoning the shop and leaving every line on hold. An application attack is a crowd of convincing fake customers each asking staff for complicated custom orders.

### Defenses

- **Absorb at the edge:** large networks (Cloudflare, Akamai, AWS Shield, Google Cloud Armor) spread **anycast** addresses across hundreds of locations (Networking chapter 9), so attack traffic is split and soaked up near its sources, with filtering at enormous scale.
- **SYN cookies:** the server encodes connection state in its SYN-ACK sequence number instead of storing it, so half-open floods can't fill tables.
- **Rate limiting** per IP, user or API key; **bot detection** and challenges for suspicious clients.
- **Caching** so most requests never reach the origin; **autoscaling** for application surges.
- **Hide the origin:** only accept traffic from the protection provider, so attackers can't bypass it by hitting the server's real IP.
- **Upstream blackholing** as a last resort: dropping all traffic to the attacked address, sacrificing it to protect everything else.

> [!RECAP]
> - **Stateless** filters judge packets alone; **stateful** firewalls track connections; default-deny, allow only what's needed, and filter **egress** too. WAFs filter web requests.
> - **Segment** networks; move toward **zero trust**, authenticating every request.
> - **VPNs** encrypt and tunnel packets (IPsec, **WireGuard**); site-to-site vs remote access; identity-aware proxies grant narrower access.
> - Network-level attacks: IP spoofing, **ARP spoofing**, rogue DHCP/DNS, **BGP hijacking** (defended by RPKI).
> - **DDoS**: volumetric (reflection/amplification), protocol (SYN floods), application layer. Defend with anycast edge networks, SYN cookies, rate limiting, caching and hidden origins.

> [!INTERVIEW] Security and infrastructure interviews ask: stateless vs stateful firewalls, what a VPN actually does, what an amplification attack is, how to protect a service from DDoS, and segmentation vs zero trust.

::quiz {"q":"Why does a DNS amplification attack hurt the victim so much?","options":["DNS is slow","Small spoofed requests make open servers send much larger replies to the victim's address","It cracks passwords","It hijacks BGP"],"answer":1,"explain":"Attackers multiply their bandwidth using third-party servers."}

::quiz {"q":"What does a stateful firewall remember?","options":["Users' passwords","Active connections, so reply traffic is automatically allowed","Every packet ever seen","DNS records"],"answer":1,"explain":"That's why security groups don't need explicit return rules."}

::quiz {"q":"How do SYN cookies defend against SYN floods?","options":["They block all SYN packets","The server encodes connection state in the SYN-ACK instead of storing half-open connections","They encrypt the handshake","They rate-limit DNS"],"answer":1,"explain":"No table to fill up."}
