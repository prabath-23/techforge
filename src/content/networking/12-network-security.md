---
title: Network Security — Firewalls, VPNs and DDoS
summary: Protecting networks and the services on them — stateless vs stateful firewalls and how rules are written, segmentation and zero trust, VPNs (IPsec, WireGuard) and modern alternatives, attacks on the network itself (spoofing, ARP poisoning, BGP hijacks), and how DDoS attacks work and are absorbed at internet scale.
---

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
