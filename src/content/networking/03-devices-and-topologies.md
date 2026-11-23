---
title: Network Devices and Topologies — The Boxes and the Shapes of Networks
summary: A tour of the equipment that makes networks work — modems, hubs, switches, routers, access points, firewalls — what each one actually looks at and decides, and the shapes (topologies) networks are built in, from your home to the giant "leaf-spine" networks inside Google's and Amazon's data centers.
---

## What's in the box under your desk?

Look at your home internet setup. There's probably one box (sometimes two) with blinking lights, a cable coming in from the street, and Wi-Fi antennas. People call it "the router", but it's actually **five or six different devices squeezed into one plastic case**:

- a **modem** that talks to your provider's cable or fiber,
- a **router** that moves packets between your home network and the internet,
- a **NAT** box that shares one public IP address among all your devices (chapter 2),
- a small **switch** for the Ethernet ports on the back,
- a **Wi-Fi access point** for wireless devices,
- a basic **firewall**, plus a DHCP server that hands out local addresses.

In offices and data centers, each of these is a separate, much bigger machine. This chapter explains what each one does, using the layers from chapter 1, and how they're arranged.

## The devices, from simplest to smartest

The best way to understand a network device is to ask one question: **which envelope does it open?** (Remember the layers from chapter 1: physical signals, link-layer frames with MAC addresses, network-layer packets with IP addresses, and so on.)

::widget Stepper {"type":"layers","title":"Network devices by the layer they work at","what":"Each band is a type of network device, ordered from the 'dumbest' (works on raw signals) to the 'smartest' (understands applications).","steps":["Press Play to go from simple to smart.","For each device, ask: what part of the data does it read to make its decision?","Notice that smarter devices can do more, but also need more processing per packet."],"nodes":[["Repeaters and hubs — Layer 1","They only see electrical signals. A repeater boosts a weak signal so it can travel further. A hub copies every signal it receives out of every port, to everyone. Almost extinct."],["Modem — Layer 1/2","Translates between your home's digital data and whatever the provider's line uses: radio over cable TV coax, light pulses over fiber, tones over a phone line, or a mobile signal."],["Switch and Wi-Fi access point — Layer 2","Read MAC addresses and forward each frame only to the device it's meant for, on the local network (chapter 1)."],["Router — Layer 3","Reads IP addresses and decides which network to send each packet to next, using its routing table (chapter 2). Connects different networks together."],["Firewall — Layers 3 to 7","Reads addresses and ports (and sometimes the content itself) and decides whether traffic is ALLOWED at all, based on security rules."],["Load balancer and proxy — Layers 4 to 7","Understand connections and even HTTP requests, and spread them across many servers (chapter 9)."]]}

### Hubs vs switches: why switches won

A **hub** is a dumb box: whatever arrives on one port is copied out to every other port. Everyone hears everything, and if two computers transmit at the same moment, their signals collide and both have to retry. Ten busy computers on a hub slow each other down badly.

A **switch** learns which device is on which port (chapter 1) and sends each frame only where it needs to go. Each port effectively gets its own private lane. That's why hubs disappeared in the 2000s.

> [!ANALOGY] A hub is a teacher who reads every student's note out loud to the whole class. A switch is a teacher who quietly hands each note to the person it's addressed to.

### Routers: connecting different networks

A switch connects devices **within** a network. A **router** connects **different networks** — your home to your provider, one office to another, one part of a data center to another. For every packet, it looks at the destination IP address, finds the best matching route (longest prefix match, chapter 2), and sends the packet one step closer.

Routers also act as **boundaries**. Messages addressed to "everyone on this network" (broadcasts, like ARP requests) stop at the router; they never leak into other networks. That keeps big networks from drowning in chatter.

> [!NOTE] Inside large networks you'll hear about **"Layer 3 switches"**. These are switches with routing built into the same high-speed chips. In modern data centers, the line between "switch" and "router" has largely disappeared — routing simply happens in hardware at full speed.

### Inside a router: the thinker and the doer

A big router has two very different jobs, handled by different parts:

- **The control plane** (the thinker) runs on a normal CPU. It talks to neighboring routers using routing protocols like OSPF and BGP (chapter 2), learns about the network, and builds the routing table. Slow, but it changes only occasionally.
- **The data plane** (the doer) runs on specialized chips. For **every single packet** — billions per second on a big router — it looks up the destination and forwards it. It never stops to think; it just follows the table the control plane gave it.

> [!ANALOGY] An airline. The **planning office** (control plane) spends weeks working out routes and schedules. The **gate agents** (data plane) don't plan anything — they just check each passenger's boarding pass against the schedule and point them to the right plane, thousands of times a day, as fast as possible.

This split matters: a router can keep forwarding traffic even while its control software restarts, and you'll see the same split again in software-defined networking below — and in Kubernetes (Cloud track).

### Firewalls: the bouncer

A **firewall** decides which traffic is **allowed**, based on rules: "allow incoming connections to port 443 (HTTPS) on the web server; block everything else". Types:

- **Stateless** firewalls check each packet against the rules in isolation.
- **Stateful** firewalls remember connections, so "allow replies to connections we started" works automatically. Your home router's NAT behaves like this.
- **Next-generation firewalls** inspect the content too — recognizing applications, blocking known attacks, sometimes decrypting traffic to scan it.

In the cloud, firewalls are mostly **software rules attached to each server** (AWS calls them security groups — Cloud track).

### Wi-Fi access points

An **access point** bridges radio (Wi-Fi) to the wired network. In your home it's built into the router box. In an office, there are dozens on the ceilings, all managed by a central **controller** that assigns channels so neighbors don't interfere and lets your laptop move between access points without dropping your video call. **Mesh Wi-Fi** systems at home do a smaller version of the same thing.

## Topologies: the shapes networks are built in

A **topology** is the shape of the connections. Each shape trades cost against how well the network survives failures:

::widget Stepper {"type":"hub","title":"Classic network shapes — click each","what":"The center is the question 'how should devices be connected?'. Each surrounding box is one classic answer with its strengths and weaknesses.","steps":["Click each shape.","For each, ask: what happens if one cable or one box fails?","Find the shape your home network uses (star)."],"nodes":[["How should we connect things?","Every topology is a trade-off between cost (how many cables and ports), reliability (what one failure breaks) and performance."],["Bus","Every device taps into one shared cable. Cheap — but one break in the cable takes everyone down, and everyone competes for the same wire. Old office Ethernet in the 1980s; today mostly inside cars (the CAN bus)."],["Star","Every device connects to one central switch or access point. Your home and almost every office. One broken cable affects only one device — but if the central box dies, everyone is offline."],["Ring","Each device connects to two neighbors in a loop. Data travels around the ring. Used in city-wide fiber networks, usually as two rings in opposite directions so a single cut doesn't break anything."],["Full mesh","Every device connects directly to every other. Maximum reliability, very expensive: 10 devices need 45 links, 100 need 4,950. Used only for small critical cores."],["Partial mesh","Many but not all connections, so there are several possible paths between any two points. This is the shape of the internet's backbone."],["Tree (hierarchy)","Stars of stars: small switches connect up to bigger ones, which connect to a core. Classic for offices and campuses."]]}

> [!EXAMPLE] **Your home network is a star**: every device connects to one Wi-Fi router. That's why, when the router reboots, every device loses internet at once — the center of the star is a single point of failure. Businesses that can't afford that use two internet connections and two routers.

## How big companies build networks

### Offices: three layers

A typical company campus is a tree with three levels:

1. **Access switches** in each wiring closet, where desks, phones, printers and Wi-Fi access points plug in.
2. **Distribution switches** that connect all the access switches in a building and route between departments.
3. **Core switches** that connect buildings together and to the data center and internet — built in pairs, so one can fail without an outage.

### Data centers: leaf-spine

Inside a data center, the traffic pattern is different. Most traffic isn't users talking to servers ("north-south"), but **servers talking to other servers** ("east-west"): a web server calling a database, a cache, a search service, ten microservices, a storage system. A tree topology funnels all of that through a few core switches, which become bottlenecks.

So modern data centers use a **leaf-spine** design (also called a **Clos network**, after the 1950s telephone engineer who invented the idea):

```text
      Spine 1     Spine 2     Spine 3     Spine 4      ← every leaf connects to every spine
        |  \ \ \    / | \ \   / / | \    / / / |
      Leaf 1      Leaf 2      Leaf 3      Leaf 4       ← one leaf switch on top of each rack
      [rack]      [rack]      [rack]      [rack]       ← servers
```

- Every **leaf** switch (one on top of each rack of servers) connects to **every spine** switch.
- Leaves never connect to each other; spines never connect to each other.
- Any server reaches any other server in exactly **leaf → spine → leaf**: three hops, always. Predictable.
- All the links carry traffic at the same time, with packets spread across the spines. If a spine fails, traffic just uses the others.
- Need more capacity? Add spines. Need more racks? Add leaves.

> [!EXAMPLE] Google's data center network (called **Jupiter**) and Meta's are giant leaf-spine designs connecting tens of thousands of servers. AI training clusters push this even further: thousands of GPUs exchange data constantly while training one model, so those networks are built so every GPU can talk to every other at full speed at the same time.

### Wide-area networks: connecting distant sites

Connecting offices in different cities used to mean renting expensive private lines or **MPLS** circuits from telecom companies. Today most companies use **SD-WAN**: ordinary internet connections plus a central controller that encrypts the traffic and steers each application over whichever link is performing best at the moment. Big cloud providers run their own private fiber networks between their data centers around the world.

## Software-defined networking (SDN)

Traditionally, every router and switch had its own control plane and made its own decisions; engineers configured each box one at a time. **Software-defined networking** moves the "thinking" into a central program that sees the whole network and tells every switch exactly what to do. It's the router's control-plane/data-plane split, applied to the entire network.

> [!EXAMPLE] **Your cloud network is software.** When you create a "VPC" (a private network) in AWS, Google Cloud or Azure in a few seconds, no technician plugs in cables. Software instructs virtual switches on thousands of physical servers to keep your traffic separate from everyone else's. You get the experience of a private network on hardware shared with millions of other customers (Cloud track).

## Troubleshooting, layer by layer

When "the internet isn't working", the layers give you a checklist. Start at the bottom and work up:

1. **Physical:** is the cable plugged in, the Wi-Fi connected, the link light on?
2. **Link:** do you have a local connection? Can you see your router's MAC address in `arp -a`?
3. **Network:** do you have an IP address (`ipconfig` / `ip addr`)? Can you `ping` your router? Can you `ping 8.8.8.8`?
4. **Names:** does `nslookup google.com` work? If pinging an IP works but names don't resolve, it's DNS (chapter 6).
5. **Application:** does the specific website or app work? Is it just one site?

> [!TRY] Next time your connection acts up, walk through that list. "I can ping 8.8.8.8 but can't open any websites" points straight at DNS. "I can't even ping my router" points at Wi-Fi or the cable. Network engineers debug this way every day.

> [!RECAP]
> - The home "router" bundles a modem, router, NAT, switch, Wi-Fi access point and firewall.
> - Devices differ in **which layer** they read: hubs (signals), switches (MAC addresses), routers (IP addresses), firewalls and load balancers (ports and content).
> - Routers split work into a **control plane** (planning routes) and a **data plane** (forwarding packets at full speed).
> - **Topologies** trade cost against resilience: star (homes), tree (offices), partial mesh (the internet), **leaf-spine** (data centers, built for server-to-server traffic).
> - **SDN** centralizes network control in software — it's how cloud networks are built.
> - Troubleshoot from the bottom layer up.

> [!INTERVIEW] Know: hub vs switch vs router, and which layer each works at; control plane vs data plane; star vs mesh trade-offs; why data centers moved to leaf-spine (east-west traffic, predictable hops, all links active); and a layer-by-layer approach to troubleshooting.

::quiz {"q":"Which device stops broadcast messages from spreading into other networks?","options":["Hub","Repeater","Switch","Router"],"answer":3,"explain":"Routers connect separate networks; broadcasts stay within one network."}

::quiz {"q":"Why do modern data centers use leaf-spine instead of a traditional tree?","options":["It needs fewer cables","Most traffic is server-to-server, and leaf-spine gives every pair of servers several equal three-hop paths with all links in use","Spine switches are cheaper","It removes the need for IP"],"answer":1,"explain":"Trees funnel server-to-server traffic through a few core switches; leaf-spine spreads it out predictably."}

::quiz {"q":"You can ping 8.8.8.8, but no websites load by name. What's the most likely problem?","options":["The Wi-Fi is down","The cable is unplugged","DNS (name lookup) isn't working","The CPU is overloaded"],"answer":2,"explain":"Reaching an IP address proves the lower layers work; failing names points to DNS."}
