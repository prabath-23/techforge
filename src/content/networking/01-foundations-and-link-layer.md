---
title: How Networks Work — Layers, Packets and the Local Network
summary: What actually happens when one computer sends data to another — chopped into packets, wrapped in layers like envelopes inside envelopes — and how computers on the same Wi-Fi or office network find and talk to each other using MAC addresses, switches and ARP.
---

::widget Scene {"title": "Sending one packet across your home network", "sub": "layers, ARP and a switch learning — the whole local journey", "nodes": [{"id": "a", "kind": "laptop", "label": "Laptop 192.168.1.20", "x": 3.72, "y": 3.72}, {"id": "sw", "kind": "router", "label": "Switch", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "p", "kind": "doc", "label": "Printer 192.168.1.50", "x": 9.0, "y": -9.0}, {"id": "r", "kind": "router", "label": "Router 192.168.1.1", "x": 16.44, "y": -1.56, "color": "purple"}, {"id": "tbl", "kind": "doc", "label": "MAC table", "x": 2.33, "y": -6.67, "color": "orange"}], "links": [["a", "sw"], ["sw", "p"], ["sw", "r"], ["sw", "tbl", {"dashed": true}]], "metrics": [["layer", "Layer"], ["frame", "Frame"], ["tbl", "Switch MAC table"]], "steps": [{"short": "Goal", "tag": "Setup", "title": "The laptop wants to send a print job to 192.168.1.50", "body": "<p>The app hands bytes to TCP, which hands segments to IP. But Ethernet can't deliver to an IP address — only to a MAC address.</p>", "show": ["a", "sw", "p", "r"], "metrics": {"layer": ["app → transport → network"], "frame": ["—"], "tbl": ["empty"]}}, {"short": "Wrap", "tag": "Encapsulation", "title": "Each layer wraps the one above in its own header", "body": "<p>Data → TCP header (ports) → IP header (IP addresses) → Ethernet header (MAC addresses). Envelopes in envelopes.</p>", "metrics": {"layer": ["L7 → L4 → L3 → L2"]}}, {"short": "Local?", "tag": "Routing decision", "title": "Is the destination on my subnet?", "body": "<p>192.168.1.50 and 192.168.1.20 share 192.168.1.0/24 → deliver directly, no router needed.</p>", "set": {"a": {"badge": "same /24 → direct"}}}, {"short": "ARP?", "tag": "ARP", "title": "Unknown MAC: broadcast \"Who has 192.168.1.50?\"", "body": "<p>Sent to ff:ff:ff:ff:ff:ff — every device on the LAN receives it.</p>", "flow": [["a", "sw", "#f59e0b", "ARP who-has .50"], ["sw", "p", "#f59e0b", "broadcast"], ["sw", "r", "#f59e0b", "broadcast"]], "metrics": {"frame": ["ARP broadcast"]}}, {"short": "Learn", "tag": "Switch learning", "title": "The switch learns: laptop's MAC is on port 1", "body": "<p>Switches learn from source addresses of every frame they see.</p>", "show": ["a", "sw", "p", "r", "tbl"], "set": {"tbl": {"badge": "aa:20 → port 1"}}, "metrics": {"tbl": ["aa:20 → p1"]}}, {"short": "Reply", "tag": "ARP", "title": "Printer replies directly: \"That's me, bb:50\"", "body": "<p>A unicast reply. The switch learns the printer's port too. The laptop caches the answer.</p>", "flow": [["p", "sw", "#22c55e", "is-at bb:50"], ["sw", "a", "#22c55e", ""]], "set": {"tbl": {"badge": "aa:20→p1, bb:50→p2"}, "a": {"badge": "ARP cache: .50 = bb:50"}}, "metrics": {"tbl": ["aa:20 → p1, bb:50 → p2"]}}, {"short": "Frame", "tag": "Delivery", "title": "Now send the real frame to bb:50", "body": "<p>Ethernet header: dst bb:50, src aa:20, type IPv4, then the IP packet, then a CRC checksum.</p>", "flow": [["a", "sw", "#3b82f6", "frame → bb:50"]], "metrics": {"frame": ["unicast IP"]}}, {"short": "Forward", "tag": "Switching", "title": "The switch sends it only out port 2", "body": "<p>The router never sees it. That's the difference from an old hub, which repeated everything everywhere.</p>", "flow": [["sw", "p", "#3b82f6", "port 2 only"]], "set": {"r": {"dim": true}}}, {"short": "Check", "tag": "Receive", "title": "The printer checks the CRC, strips headers layer by layer", "body": "<p>Ethernet → IP (is this my IP?) → TCP (port 9100) → print server.</p>", "set": {"p": {"badge": "printing"}}, "metrics": {"layer": ["L2 → L3 → L4 → L7"]}}, {"short": "Remote", "tag": "Contrast", "title": "For google.com it would ARP for the router instead", "body": "<p>Different subnet → frame goes to the default gateway's MAC; the IP destination stays Google's.</p>", "set": {"r": {"dim": false, "badge": "default gateway"}}, "note": {"kind": "key", "text": "IP addresses say where a packet is going overall; MAC addresses say which device it hops to next. ARP connects the two; switches learn MACs per port."}}]}

::widget Scene {"title": "Layers: envelopes inside envelopes", "sub": "what actually leaves your laptop", "nodes": [{"id": "pk", "kind": "cells", "label": "one frame on the wire", "x": 3.1, "y": 3.1, "values": ["ETH", "IP", "TCP", "HTTP"]}], "metrics": [["layer", "Layer added"], ["job", "Its job"]], "steps": [{"short": "App data", "tag": "L7", "title": "Your browser writes \"GET /\"", "body": "<p>The application only knows what it wants to say.</p>", "set": {"pk": {"marks": {"3": "orange"}, "ptr": {}, "values": ["", "", "", "HTTP"]}}, "metrics": {"layer": ["HTTP: GET /"], "job": ["what to say"]}}, {"short": "TCP", "tag": "L4", "title": "TCP wraps it: ports and sequence numbers", "body": "<p>Adds source/destination <b>ports</b> (which program) and sequence numbers (reliable, in order).</p>", "set": {"pk": {"marks": {"2": "purple"}, "ptr": {}, "values": ["", "", "TCP", "HTTP"]}}, "metrics": {"layer": ["TCP :52344 → :80"], "job": ["which program, reliably"]}}, {"short": "IP", "tag": "L3", "title": "IP wraps that: source and destination addresses", "body": "<p>Adds the IP addresses that routers use to forward the packet across the internet.</p>", "set": {"pk": {"marks": {"1": "blue"}, "ptr": {}, "values": ["", "IP", "TCP", "HTTP"]}}, "metrics": {"layer": ["IP .1.10 → 93.184.215.14"], "job": ["which machine, worldwide"]}}, {"short": "Ethernet", "tag": "L2", "title": "Ethernet/Wi-Fi wraps it all for the next hop only", "body": "<p>Adds MAC addresses for <b>this link only</b> — from your laptop to the router. Each router strips and replaces this outer envelope.</p>", "set": {"pk": {"marks": {"0": "teal"}, "ptr": {}, "values": ["ETH", "IP", "TCP", "HTTP"]}}, "metrics": {"layer": ["ETH laptop MAC → router MAC"], "job": ["next hop on this wire"]}, "note": {"kind": "key", "text": "Each layer only reads its own header. That separation is why Wi-Fi, fibre and 5G can all carry the same HTTP."}}]}

::widget Scene {"title": "Switches learn where everyone is", "sub": "MAC learning on a home network", "nodes": [{"id": "pc", "kind": "laptop", "label": "Laptop .10", "x": 0.0, "y": 0.0}, {"id": "ph", "kind": "phone", "label": "Phone .11", "x": 5.58, "y": 5.58}, {"id": "sw", "kind": "router", "label": "Switch", "x": 6.79, "y": -1.21, "color": "teal"}, {"id": "rt", "kind": "router", "label": "Router .1", "x": 10.79, "y": -5.21, "color": "blue"}], "links": [["pc", "sw", {"both": true}], ["ph", "sw", {"both": true}], ["sw", "rt", {"both": true}]], "metrics": [["table", "Switch MAC table"]], "steps": [{"short": "Unknown", "tag": "Flood", "title": "First frame: the switch doesn't know where the phone is", "body": "<p>The laptop sends a frame to the phone's MAC. The switch learns \"laptop is on port 1\" and, not knowing the phone yet, <b>floods</b> it out of every other port.</p>", "flow": [["pc", "sw", "#3b82f6", "to phone"], ["sw", "ph", "#3b82f6", "flood"], ["sw", "rt", "#3b82f6", "flood"]], "metrics": {"table": ["laptop → port 1"]}}, {"short": "Learn", "tag": "Learn", "title": "The phone replies; the switch learns its port", "body": "<p>Now the table has both. Learning happens automatically from the <b>source</b> address of every frame.</p>", "flow": [["ph", "sw", "#22c55e", "reply"]], "metrics": {"table": ["laptop → 1, phone → 2"]}}, {"short": "Direct", "tag": "Forward", "title": "From now on, frames go only where they need to", "body": "<p>No more flooding: the switch forwards directly between ports, so devices don't see each other's traffic.</p>", "flow": [["pc", "sw", "#3b82f6", ""], ["sw", "ph", "#3b82f6", "direct"]], "note": {"kind": "key", "text": "Switches work with MAC addresses inside one network (layer 2). Routers work with IP addresses between networks (layer 3)."}}]}

::widget Scene {"title": "ARP: who has 192.168.1.1?", "sub": "turning an IP address into a MAC address", "nodes": [{"id": "pc", "kind": "laptop", "label": "Laptop .10", "x": 0.0, "y": 0.0}, {"id": "ph", "kind": "phone", "label": "Phone .11", "x": 5.58, "y": 5.58}, {"id": "sw", "kind": "router", "label": "Switch", "x": 6.79, "y": -1.21, "color": "teal"}, {"id": "rt", "kind": "router", "label": "Router .1", "x": 10.79, "y": -5.21, "color": "blue"}], "links": [["pc", "sw", {"both": true}], ["ph", "sw", {"both": true}], ["sw", "rt", {"both": true}]], "metrics": [["cache", "Laptop ARP cache"]], "steps": [{"short": "Need MAC", "tag": "Problem", "title": "The laptop knows the router's IP, not its MAC", "body": "<p>To send anything to the internet it must put the router's MAC address in the Ethernet header.</p>", "metrics": {"cache": ["(empty)"]}}, {"short": "Broadcast", "tag": "Ask", "title": "\"Who has 192.168.1.1? Tell 192.168.1.10\" — to everyone", "body": "<p>An ARP request is broadcast to every device on the network.</p>", "flow": [["pc", "sw", "#f59e0b", "who has .1?"], ["sw", "ph", "#f59e0b", ""], ["sw", "rt", "#f59e0b", ""]]}, {"short": "Reply", "tag": "Answer", "title": "Only the router answers: \"that's me, aa:bb:cc…\"", "body": "<p>The laptop caches the answer for a few minutes, so it doesn't ask before every packet.</p>", "flow": [["rt", "pc", "#22c55e", "I am .1 → aa:bb:cc"]], "metrics": {"cache": [".1 → aa:bb:cc", "good"]}, "note": {"kind": "warn", "text": "ARP trusts any reply, so on shared Wi-Fi an attacker can claim to be the router (ARP spoofing). Encryption (TLS) makes intercepted traffic useless."}}]}










## Sending a letter across the world

You click a link and a web page from a server in another country appears in a fraction of a second. Somewhere in between, your request crossed a dozen pieces of equipment owned by different companies, over copper, glass fiber and radio waves — and none of them understands what a "web page" is.

The trick that makes this possible is the same one the postal system uses.

> [!ANALOGY] To send a letter, you write it, put it in an envelope with an address, and drop it in a mailbox. The local post office doesn't read your letter; it only reads the address and sends the envelope toward the right city. The sorting center there sends it to the right neighborhood; a carrier takes it to the right house. **Each step only looks at the part of the address it needs, and passes the envelope on.** Computer networks work exactly the same way — and that's why they can grow to billions of devices.

## Packets: chopping data into pieces

Networks don't send your 2 MB photo as one continuous stream. They chop it into small **packets** — typically up to about 1,500 bytes each — and send each packet separately, each with its destination address written on it. Packets from many people share the same cables, interleaved, and they're reassembled at the other end.

This is called **packet switching**. The old telephone network did the opposite (**circuit switching**): a call reserved a dedicated line end to end for its whole duration, even during silences. Packet switching is far more efficient for computer traffic, which comes in bursts — a page load, then nothing while you read it.

The trade-off: when too many packets arrive at a busy point at once, they wait in a **queue**, and if the queue overflows, packets are **dropped**. Dealing with delays and lost packets is a big part of what network software does (chapter 4).

## How fast is a network? Two very different numbers

People say "fast internet", but there are two separate measures, and confusing them causes a lot of bad decisions:

- **Bandwidth** — how much data per second the link can carry. Like the **width of a highway**. "1 Gbps fiber" is about bandwidth.
- **Latency** — how long one piece of data takes to arrive. Like **how long the drive takes**. Usually measured as **round-trip time (RTT)**: there and back.

> [!EXAMPLE] A truck full of hard drives driving from Mumbai to Delhi has enormous bandwidth (petabytes per trip!) but terrible latency (two days). A text message has tiny bandwidth needs and low latency. Video calls need low latency; backing up your photos needs high bandwidth. AWS literally sells a truck service (Snowmobile) for moving huge datasets — because sometimes a truck *is* the fastest network.

Latency has a hard floor set by physics. Light in fiber travels at about 200,000 km per second. Mumbai to New York is roughly 12,500 km, so even with a perfect network a round trip takes at least **125 milliseconds**. No amount of money buys a faster speed of light — which is why big companies put servers on every continent (chapter 9 on CDNs).

> [!NOTE] **Latency numbers worth remembering** (approximate): reading RAM 100 nanoseconds · a round trip inside a datacenter 0.5 ms · from your laptop to a nearby city 10–20 ms · India ↔ US 200–250 ms · to a geostationary satellite and back about 600 ms.

## Layers: envelopes inside envelopes

Networking is split into **layers**. Each layer solves one problem and relies on the layer below it, without caring how that layer works internally. Here's the model actually used on the internet (with the common "OSI" layer numbers in brackets — engineers use those numbers all the time, as in "a Layer 7 load balancer"):

::widget Stepper {"type":"layers","title":"The internet's layers, from your app down to the wire","what":"Each band is one layer. When you send data, it travels down the layers on your machine, across the network, and up the layers on the other machine.","steps":["Press Play to go from the application down to the wire.","For each layer, notice what kind of address it uses (none, port, IP address, MAC address).","Notice that each layer only talks to the same layer on the other side."],"nodes":[["Application [7] — HTTP, DNS, email","Your browser and the web server speak HTTP: 'GET /index.html'. This layer is about what the data MEANS."],["Transport [4] — TCP, UDP","Which program on the machine gets the data (identified by a port number, like 443 for HTTPS), and whether lost data is resent. Chapter 4."],["Network [3] — IP","Getting packets from one machine to any other machine in the world, across many networks, using IP addresses. Chapter 2."],["Link [2] — Ethernet, Wi-Fi","Getting a frame from one device to the next device on the SAME local network, using MAC addresses. This chapter."],["Physical [1] — cables, fiber, radio","Turning bits into electrical signals, light pulses or radio waves, and back."]]}

When your browser sends a request, each layer **wraps** the data from the layer above with its own header — its own envelope with its own address:

```text
                                    [ GET /index.html HTTP/1.1 ... ]      ← application data
                         [TCP header][ GET /index.html HTTP/1.1 ... ]      ← + ports (which program)
              [IP header][TCP header][ GET /index.html HTTP/1.1 ... ]      ← + IP addresses (which machine)
[Eth header] [IP header][TCP header][ GET /index.html HTTP/1.1 ... ][check]  ← + MAC addresses (next hop)
```

This wrapping is called **encapsulation**. At the receiving end, each layer removes its own envelope and hands the contents up. Along the way, a router only opens the outer two envelopes (link and network) to decide where to send the packet next; it never needs to read your HTTP request. That's what lets one internet carry web pages, video calls, games and email without the network caring which is which.

> [!NOTE] There's a famous older 7-layer model called **OSI**. In practice, its layers 5 and 6 are folded into the application, but its numbers stuck: "Layer 2 switch", "Layer 4 load balancer", "Layer 7 firewall".

## Layer 1: bits become signals

The physical layer turns 1s and 0s into something that can travel: voltages on copper wire (the Ethernet cable in your office), pulses of light in glass fiber (undersea cables, data centers, fiber to your home), or radio waves (Wi-Fi, 4G/5G). Modern fiber links in data centers carry 400 billion bits per second.

> [!EXAMPLE] About **99% of intercontinental internet traffic** travels through roughly 500 undersea fiber-optic cables, some thinner than a garden hose. When a ship's anchor cut several cables in the Red Sea in 2024, internet traffic between Asia, Europe and Africa had to be rerouted, and some countries saw noticeable slowdowns.

## Layer 2: talking to your neighbors

The link layer handles one job: getting data from one device to another device **on the same local network** — your laptop to your Wi-Fi router, one server to another in the same rack. The most common link-layer technology is **Ethernet** (wired), and Wi-Fi works very similarly.

### MAC addresses

Every network interface — your laptop's Wi-Fi chip, a server's network card — has a **MAC address** burned in by the manufacturer: six bytes written like `3c:22:fb:9a:10:4e`. The first three bytes identify the manufacturer.

A MAC address is like a person's **name**: it identifies the device, but says nothing about where it is in the world. That's fine on a local network, where everyone can hear everyone. It doesn't work for the whole internet — for that, we need IP addresses (chapter 2).

> [!NOTE] Modern phones and laptops use **randomized MAC addresses** for each Wi-Fi network they join, so shops and airports can't track you by your device's real MAC address as you walk past their access points.

### Frames

Data at this layer travels in **frames**: a header with the destination and source MAC addresses and a "type" field (saying, for example, "this contains an IP packet"), the payload (usually up to 1,500 bytes), and a checksum at the end. If the checksum doesn't match, the frame was damaged on the way and is silently **thrown away**. Ethernet doesn't resend anything; reliability is TCP's job, higher up.

## Switches: the local post office

In an office, every computer plugs into a **switch** — a box with many ports. When a frame arrives, the switch reads the destination MAC address and sends the frame **only out of the port where that device is**.

How does a switch know which device is on which port? It **learns**, simply by watching:

1. A frame arrives on port 3 from MAC `A`. The switch notes: "`A` lives on port 3".
2. It looks up the destination MAC. If it knows where that is, it sends the frame only there.
3. If it doesn't know yet, it **floods** the frame out of every port except the one it came in on. When the destination replies, the switch learns its port too.

> [!ANALOGY] A new receptionist at a large office. At first they don't know who sits where, so when a parcel arrives for "Priya", they call out on every floor. When Priya answers from the 3rd floor, they write it down. Next time, the parcel goes straight to floor 3.

Before switches, offices used **hubs**, which simply copied every frame to every port — so every computer heard every conversation, and when two devices talked at once, their signals collided. Switches gave each port its own private connection and made collisions a thing of the past.

## ARP: finding a neighbor's MAC address

Here's a gap. Your laptop wants to send an IP packet to `192.168.1.20` (a printer on your home network). Programs use IP addresses, but the Ethernet or Wi-Fi frame needs the printer's **MAC address**. How does your laptop find it?

It **asks everyone**. This is **ARP** (Address Resolution Protocol). Step through it:

::widget Sequence {"title":"Finding a neighbor's MAC address with ARP","what":"Three devices on one home network. Your laptop knows the printer's IP address but not its MAC address, so it asks everyone and only the printer answers.","steps":["Press Step to send each message.","Notice the first message goes to everyone (broadcast) and the reply goes only to the laptop.","Ask: why can't the laptop skip this and just use the IP address?"],"actors":["Laptop 192.168.1.5","Switch / Wi-Fi","Printer 192.168.1.20"],"msgs":[[0,0,"I need the MAC for 192.168.1.20","Your laptop wants to send a print job to 192.168.1.20, which is on the same local network. Its ARP cache (memory of recent answers) has no entry for it."],[0,1,"Who has 192.168.1.20? (to everyone)","The laptop sends an ARP request to the special broadcast MAC address ff:ff:ff:ff:ff:ff, meaning 'everyone on this network'."],[1,2,"delivered to every device","Broadcasts go out of every port. Every device on the network receives it — phones, TVs, the printer."],[2,2,"That's my IP!","Every device checks whether the IP in the question is theirs. Only the printer says yes. It also notes the laptop's MAC from the question."],[2,0,"192.168.1.20 is at 3c:22:fb:9a:10:4e","The printer replies directly to the laptop (not to everyone)."],[0,0,"Remember it, send the print job","The laptop saves the answer in its ARP cache for a few minutes and sends the print job in a frame addressed to the printer's MAC."]]}

What if the destination is **not** on your local network — say, a web server in another country? Then your laptop ARPs for the MAC address of your **router** (the "default gateway") instead, and hands the packet to the router. The packet's **IP** destination stays the faraway server; only the **MAC** destination is the router.

> [!NOTE] **The key insight of this chapter:** MAC addresses change at every hop — each frame only goes from one device to the next. IP addresses stay the same from start to finish. Like a letter whose envelope (destination: a house in Delhi) never changes, while the truck it's loaded onto changes at every sorting center.

> [!TRY] Run `arp -a` (Mac/Windows) or `ip neigh` (Linux) to see your computer's ARP cache: the IP and MAC addresses of devices it has talked to recently on your local network, including your router.

> [!WARN] ARP has no security: any device can reply "I'm 192.168.1.1, send me everything". On a shared network (like café Wi-Fi), an attacker can pretend to be the router and see all your traffic — an **ARP spoofing** or man-in-the-middle attack. This is a big reason why everything sensitive should be encrypted (HTTPS, chapter 7).

## VLANs: several networks on one switch

Big organizations want to separate traffic — guests, employees, security cameras, servers — without buying separate switches for each. A **VLAN** (virtual LAN) adds a tag to each frame saying which virtual network it belongs to, and the switch keeps the groups completely apart, as if they were different physical networks. Your company's guest Wi-Fi that can reach the internet but not the office printers is usually a separate VLAN.

## Wi-Fi in one paragraph

Wi-Fi works like Ethernet, but everyone shares the same radio channel, and a device can't listen while it's transmitting, so it can't detect collisions. Instead, Wi-Fi devices wait for a quiet moment plus a random delay before sending (to avoid talking over each other), and the receiver acknowledges every frame — Wi-Fi *does* resend lost frames itself, because radio loses far more data than cables do. That's why Wi-Fi speeds and latency vary much more than a wired connection, especially in crowded apartment buildings where dozens of networks share the same channels.

> [!RECAP]
> - Data travels as **packets**, each with its own address, sharing links with everyone else's packets (packet switching).
> - **Bandwidth** is how much per second; **latency** is how long it takes — and the speed of light limits latency.
> - Networking is built in **layers** (application, transport, network, link, physical); each wraps the data in its own header (**encapsulation**).
> - On a local network, devices are identified by **MAC addresses**; **switches** learn which device is on which port.
> - **ARP** finds a neighbor's MAC address by asking everyone; for faraway destinations, you send to the **router's** MAC.
> - **MAC addresses change every hop; IP addresses stay end to end.**

> [!INTERVIEW] Be able to explain: what each layer does; why MAC addresses change per hop while IP addresses don't; how a switch learns where devices are; what ARP does; and latency vs bandwidth. These are the building blocks of the classic question "what happens when you type a URL into your browser?" (answered fully in chapter 9).

::quiz {"q":"Your laptop sends a packet to a server in another country. What destination MAC address is on the frame that leaves your laptop?","options":["The faraway server's MAC address","Your router's (default gateway's) MAC address","The broadcast address","No MAC address is needed"],"answer":1,"explain":"Frames only travel one hop; the IP destination remains the faraway server."}

::quiz {"q":"A switch receives a frame for a MAC address it has never seen. What does it do?","options":["Drops it","Sends it back","Floods it out of every port except the one it arrived on","Asks the router"],"answer":2,"explain":"It learns the destination's port when that device replies."}

::quiz {"q":"Which is mainly limited by the speed of light rather than by your internet plan?","options":["Bandwidth","Latency over long distances","Packet size","Number of devices"],"answer":1,"explain":"Light in fiber needs ~125 ms for a Mumbai–New York round trip no matter what."}
