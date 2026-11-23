---
title: IP Addresses and Routing — How Packets Find Their Way Across the World
summary: What an IP address really is, how networks are carved up with subnets and CIDR, why your home has one public IP shared by every device (NAT), how traceroute reveals the path your packets take, how routers decide where to send each packet, and how BGP glues the whole internet together — including the day Facebook disappeared.
---

## From names to addresses

Chapter 1 left us with a problem: MAC addresses work only on the local network. To reach a computer anywhere in the world, we need addresses that say **where** something is, not just **who** it is. That's the job of the **Internet Protocol (IP)** and its **IP addresses**.

> [!ANALOGY] A MAC address is like your name; an IP address is like your postal address. Your name doesn't help a mail carrier in another country find you. Your postal address does — and it's structured from big to small (country, city, street, house), so each sorting center only needs to understand the part relevant to it.

## What IP promises (and doesn't)

IP's job is simple and deliberately modest: **get a packet from any machine to any other machine, through any number of networks in between**. It's a "best effort" service — a postal service with no tracking numbers:

- Packets **can be lost** (a router's queue overflowed).
- Packets **can arrive out of order** (they took different routes).
- Packets **can be duplicated**.

IP makes no promises about any of these. Everything reliable — making sure every byte arrives, in order, exactly once — is built **on top**, by TCP (chapter 4). Keeping the core of the network simple and putting the smarts at the edges is a big reason the internet scaled to billions of devices.

## IPv4 addresses

An IPv4 address is 32 bits, written as four numbers from 0 to 255: `142.250.183.14`. There are about **4.3 billion** possible addresses.

Each address has two parts:

- The **network part** — which network the machine is on (like the street).
- The **host part** — which machine on that network (like the house number).

Where's the dividing line? It's written after a slash, in **CIDR notation**: `192.168.1.77/24` means "the first 24 bits are the network". So every address from `192.168.1.0` to `192.168.1.255` is on the same network, and the last 8 bits pick the machine.

> [!EXAMPLE] Your home network is almost certainly `192.168.0.x/24` or `192.168.1.x/24`: one street with up to 254 houses (two addresses are reserved — one for the network itself, one for broadcasting to everyone). Your router is usually `.1`, and your devices get the other numbers.

Play with the line between network and host. Drag the slider and watch how many machines fit:

::widget SubnetCalc {}

The rule to remember: a `/n` network has 2^(32−n) addresses.

| Prefix | Addresses | Typical use |
|---|---|---|
| /32 | 1 | One specific machine |
| /24 | 256 | A home or small office |
| /16 | 65,536 | A big company site, a cloud VPC |
| /8 | 16.7 million | Very large organizations; private 10.x.x.x networks |

### "Is it on my street?"

Every time your computer sends a packet, it asks one question: **is the destination on my own network?**

- **Yes** → send it directly, using ARP to find the destination's MAC address (chapter 1).
- **No** → send it to the **default gateway** (your router) and let it deal with it.

The check is pure arithmetic: keep only the network bits of both addresses and see if they match.

### Private addresses

Some ranges are reserved for **private** networks and are never used on the public internet:

- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`

Every home and office reuses them. Millions of homes have a device at `192.168.1.5`, and that's fine — because of NAT.

## NAT: how one address is shared by a whole household

Here's a problem: 4.3 billion IPv4 addresses for well over 20 billion connected devices. The world officially ran out of new IPv4 addresses in 2011. How does it still work?

**Network Address Translation (NAT).** Your home router has **one** public IP address from your internet provider. Every device at home has a private address. When your phone sends a request out, the router:

1. Replaces the private source address (`192.168.1.23`, port 51000) with its **own public address** and a port it picks (say, 62001).
2. Remembers the mapping in a table: "62001 → 192.168.1.23:51000".
3. When the reply comes back to the public address on port 62001, it looks up the table and forwards the reply to your phone.

> [!ANALOGY] An office building with one public phone number and a receptionist. When an employee calls out, the receptionist notes "the call to the bank came from extension 23". When the bank calls back, the receptionist knows to put it through to extension 23. Outsiders only ever see the building's main number.

NAT has side effects you've probably noticed:

- **Nobody outside can start a connection to your laptop**, because the router has no table entry telling it where to forward unexpected incoming traffic. That's an accidental firewall, and mostly a good thing.
- **Peer-to-peer apps struggle**: video calls (Zoom, WhatsApp, Google Meet), online games and torrents have to use clever tricks so two devices behind different NATs can reach each other directly — or fall back to relaying through a server (chapter 8 mentions WebRTC).
- Many mobile carriers put thousands of customers behind **one** public IP (carrier-grade NAT). That's why websites sometimes block or CAPTCHA a whole mobile network when one user misbehaves.

## IPv6: the long-term fix

**IPv6** uses 128-bit addresses — written like `2001:db8:85a3::8a2e:370:7334` — giving 340 undecillion addresses (a 39-digit number). Enough to give every device on Earth its own public address, many times over, and make NAT unnecessary.

Adoption has been slow because the whole internet has to support both at once, but it's well underway: Google sees roughly **45% of its users** arriving over IPv6, and mobile networks in India, the US and elsewhere use it heavily. Most devices today run **dual-stack**: they have both kinds of address, and browsers try both and use whichever connects first.

> [!TRY] Visit a "what is my IP" website on your phone using mobile data, then on home Wi-Fi. You may see an IPv6 address on one and IPv4 on the other. Also compare the public address shown with your phone's local Wi-Fi address (Settings → Wi-Fi → details): that difference is NAT at work.

## Seeing the path: traceroute

Every IP packet carries a small counter called **TTL** (time to live). Each router that forwards it subtracts 1. If it reaches 0, the router throws the packet away and sends back a small error message: "time exceeded". This exists to stop packets from looping around forever if routes are misconfigured.

**traceroute** turns this into a clever tool. It sends packets with TTL = 1, then 2, then 3, and so on. The first router replies to the TTL-1 packet, the second router to the TTL-2 packet… so each router along the path reveals itself:

```bash
$ traceroute google.com
 1  192.168.1.1        1.2 ms     ← your home router
 2  100.64.0.1         8.9 ms     ← your internet provider's first router
 3  103.24.86.17      11.3 ms     ← provider's core network
 ...
 9  142.250.183.14    14.1 ms     ← Google
```

> [!TRY] Run `traceroute google.com` (Mac/Linux) or `tracert google.com` (Windows). Then try a website hosted on another continent and watch where the time jumps — that's often the moment your packets cross an ocean.

## Routing: how each router chooses the next hop

Every router (and your laptop too) has a **routing table**: a list of "to reach this range of addresses, send packets to that next router". When a packet arrives, the router finds the matching entries and picks the **most specific one** — the one with the longest prefix. This rule is called **longest prefix match**.

> [!ANALOGY] Directions in a mall. A general sign says "All shops → this way". A more specific sign says "Food court → upstairs". If you want the food court, you follow the more specific sign, even though the general one also technically applies.

The least specific route of all, `0.0.0.0/0`, matches everything. It's the **default route**: "if nothing more specific matches, send it here". At home, that points to your internet provider.

> [!TRY] Run `ip route` (Linux), `netstat -rn` (Mac) or `route print` (Windows). You'll see your own routing table: a route for your local network, maybe one for a VPN, and a default route pointing at your router.

### Where do routes come from?

Inside one organization, routers share information automatically using an **interior routing protocol** like **OSPF**: every router tells every other router which links it has and how fast they are. Each router then builds a map of the whole network and computes the shortest path to everywhere (using Dijkstra's algorithm — see the Algorithms track). If a link breaks, the routers notice and recompute within seconds.

## BGP: the protocol that holds the internet together

The internet isn't one network. It's about **75,000 independent networks** — internet providers, cloud providers, universities, large companies — called **autonomous systems (AS)**, each with a number (Google is AS15169, Cloudflare is AS13335). They connect to each other at exchange points and through private links.

They exchange routes using **BGP** (Border Gateway Protocol). Each network **announces** which address ranges it can reach: "I am AS15169, and you can reach 142.250.0.0/15 through me". Neighbors pass those announcements on, adding themselves to the path. Every network then chooses routes based partly on path length but mostly on **business relationships**: you pay your upstream providers, get paid by your customers, and swap traffic for free with peers of similar size.

BGP is powerful — and built on trust. Networks largely believe what their neighbors announce. That has caused some of the internet's most famous outages:

> [!STORY] **The day YouTube vanished (2008).** Pakistan's government ordered YouTube blocked inside the country. Pakistan Telecom implemented this by announcing a BGP route for a slice of YouTube's addresses that pointed nowhere — and accidentally announced it to the whole world. Because their announcement was **more specific** than YouTube's own (longest prefix wins!), routers around the planet preferred it. For about two hours, much of the world's YouTube traffic was sent to Pakistan and dropped.

> [!STORY] **The day Facebook disappeared (October 2021).** During routine maintenance, a command accidentally withdrew the BGP routes to Facebook's own DNS servers. Within minutes, the rest of the internet had no route to them. Facebook, Instagram and WhatsApp vanished for about **six hours** for billions of people. Worse, Facebook's internal tools ran on the same network — reportedly even some door badge systems stopped working, slowing engineers trying to get physical access to fix the routers.

The fix for the trust problem is called **RPKI**: cryptographically signed records stating which network is allowed to announce which addresses, so routers can reject impostors. Adoption is growing steadily.

### Anycast: one address, many places

A network can deliberately announce **the same address** from many locations around the world. BGP then naturally sends each user to the nearest one. This is **anycast**, and it's how Google's public DNS server `8.8.8.8` and Cloudflare's `1.1.1.1` answer quickly wherever you are — there are hundreds of servers behind each of those single addresses.

## The whole journey

::widget Stepper {"type":"flow","cols":3,"title":"A packet's trip from your laptop to a website abroad","what":"Each box is one place your packet passes through on its way to a web server in another country.","steps":["Press Play and read each hop.","Notice where the MAC address changes and where the IP address changes (only at NAT).","Notice which steps use BGP and which use internal routing."],"nodes":[["Your laptop","The destination isn't on your local network, so the laptop sends the packet to the default gateway, using ARP to find the router's MAC address."],["Home router (NAT)","Rewrites the private source address (192.168.1.23) to your public IP, remembers the mapping, and forwards the packet to your internet provider."],["Internet provider","Looks up the destination in its routing table (longest prefix match). The route was learned via BGP from the networks it connects to."],["Across the internet","The packet crosses several autonomous systems along BGP-chosen paths, possibly through an undersea cable. TTL decreases at each router; the MAC address changes at every hop."],["Destination network","Inside the destination company's network, internal routing (like OSPF) carries the packet to the right data center."],["Web server","Finally the server's network card receives it, and the operating system hands it up to TCP and then to the web server program."]]}

> [!RECAP]
> - **IP** delivers packets between any two machines, on a best-effort basis; reliability is added on top.
> - An IPv4 address has a **network part** and a **host part**; **CIDR** (`/24`) says where the line is. Same network → deliver directly; otherwise → send to the **default gateway**.
> - **Private addresses** plus **NAT** let a whole household share one public IP; **IPv6** removes the shortage.
> - **traceroute** reveals each router on the path using the **TTL** counter.
> - Routers choose the **longest matching prefix**; inside organizations routes come from protocols like **OSPF**, and between them from **BGP**.
> - BGP runs on trust, which has caused famous outages; **anycast** serves one address from many places.

> [!INTERVIEW] Expect: subnet arithmetic (how many hosts in a /26?), "same subnet or via the gateway?", longest prefix match, what NAT does and what it breaks, how traceroute works, and a high-level explanation of BGP and anycast. Telling the Facebook 2021 story while explaining BGP shows real-world understanding.

::quiz {"q":"How many usable host addresses does a /26 network have?","options":["26","30","62","64"],"answer":2,"explain":"2^(32−26) = 64 addresses, minus the network and broadcast addresses = 62."}

::quiz {"q":"A router has routes for 10.0.0.0/8, 10.1.0.0/16 and 10.1.2.0/24. Where does a packet to 10.1.2.50 go?","options":["10.0.0.0/8","10.1.0.0/16","10.1.2.0/24","The default route"],"answer":2,"explain":"All three match; the longest (most specific) prefix wins."}

::quiz {"q":"Why can't someone on the internet directly open a connection to your laptop at home?","options":["Laptops don't accept connections","Your router's NAT has no mapping telling it which private device should receive unsolicited incoming traffic","IPv4 forbids it","DNS blocks it"],"answer":1,"explain":"NAT only knows where to send replies to connections started from inside."}
