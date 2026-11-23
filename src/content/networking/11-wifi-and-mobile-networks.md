---
title: Wi-Fi and Mobile Networks (4G/5G)
summary: How data travels through the air, radio basics (frequency, bandwidth, interference), how Wi-Fi shares a channel and why it slows down in crowded places, Wi-Fi generations and security (WPA3), how a phone connects through a cellular network from tower to internet, what 5G actually changes, and what all this means for building apps that work on real mobile connections.
---

::widget Scene {"title": "Joining Wi-Fi: from scan to IP address", "sub": "beacons, association, the WPA2/WPA3 handshake and DHCP", "nodes": [{"id": "ph", "kind": "phone", "label": "Phone", "x": 3.72, "y": 3.72}, {"id": "ap", "kind": "router", "label": "Access point \"CafeNet\"", "x": 8.72, "y": -1.28, "color": "blue"}, {"id": "dh", "kind": "server", "label": "DHCP server", "x": 13.72, "y": -6.28, "color": "purple"}], "links": [["ph", "ap", {"both": true}], ["ap", "dh"]], "metrics": [["stage", "Stage"], ["enc", "Encrypted?"]], "steps": [{"short": "Beacon", "tag": "Discover", "title": "The AP broadcasts beacons ~10 times a second", "body": "<p>Network name, supported speeds, security type. Your phone lists networks from these.</p>", "show": ["ph", "ap"], "flow": [["ap", "ph", "#f59e0b", "beacon: CafeNet"]], "metrics": {"stage": ["scan"], "enc": ["no"]}}, {"short": "Auth", "tag": "Associate", "title": "Phone associates with the AP", "body": "<p>Agree on speeds and features. Now it's connected, but not yet trusted.</p>", "flow": [["ph", "ap", "#3b82f6", "associate"], ["ap", "ph", "#22c55e", "ok"]], "metrics": {"stage": ["associate"]}}, {"short": "PMK", "tag": "Keys", "title": "Both sides already know the password-derived key", "body": "<p>WPA2: PMK = function(password, network name). It's never sent over the air. (WPA3 uses SAE, which resists offline guessing.)</p>", "set": {"ph": {"badge": "PMK"}, "ap": {"badge": "PMK"}}}, {"short": "M1", "tag": "4-way", "title": "Message 1: AP sends a random number (ANonce)", "body": "<p>Fresh randomness makes each session's keys unique.</p>", "flow": [["ap", "ph", "#a855f7", "ANonce"]], "metrics": {"stage": ["4-way handshake 1/4"]}}, {"short": "M2", "tag": "4-way", "title": "Message 2: phone sends its SNonce + proof it knows the key", "body": "<p>Both can now compute the session key from PMK + both nonces + MAC addresses. A wrong password fails here.</p>", "flow": [["ph", "ap", "#a855f7", "SNonce + MIC"]], "set": {"ph": {"badge": "session key"}, "ap": {"badge": "session key"}}, "metrics": {"stage": ["2/4"]}}, {"short": "M34", "tag": "4-way", "title": "Messages 3 and 4: confirm and install keys", "body": "<p>The AP also sends the group key used for broadcasts.</p>", "flow": [["ap", "ph", "#a855f7", "GTK"], ["ph", "ap", "#a855f7", "ack"]], "metrics": {"stage": ["4/4"], "enc": ["yes", "good"]}}, {"short": "DHCP", "tag": "Address", "title": "Now DHCP for an IP address", "body": "<p>Encrypted from here on.</p>", "show": ["ph", "ap", "dh"], "flow": [[["ph", "ap", "dh"], "#3b82f6", "DHCP"], [["dh", "ap", "ph"], "#22c55e", "10.0.0.42"]], "metrics": {"stage": ["online", "good"]}}, {"short": "Shared", "tag": "Air", "title": "The air is shared", "body": "<p>Devices take turns (listen before talking). Every extra device and neighbouring network on the same channel slows everyone.</p>"}, {"short": "Roam", "tag": "Roaming", "title": "Walking to another AP: roam", "body": "<p>Fast roaming (802.11r) reuses keys so calls don't drop. Mobile networks do the same between cell towers (handover).</p>", "note": {"kind": "key", "text": "Beacon → associate → 4-way handshake derives per-session keys from the password without sending it → DHCP. Wi-Fi is a shared medium."}}]}

::widget Scene {"title": "Joining Wi-Fi: the WPA2 four-way handshake", "sub": "proving you know the password without sending it", "nodes": [{"id": "ph", "kind": "phone", "label": "Phone", "x": 3.1, "y": 3.1}, {"id": "ap", "kind": "router", "label": "Wi-Fi access point", "x": 8.1, "y": -1.9, "color": "blue"}], "links": [["ph", "ap", {"both": true}]], "metrics": [["key", "Session key"], ["pw", "Password sent over the air?"]], "steps": [{"short": "Shared secret", "tag": "Setup", "title": "Both sides know the Wi-Fi password", "body": "<p>From it each derives the same master key. The password itself never travels.</p>", "metrics": {"key": ["-"], "pw": ["no", "good"]}}, {"short": "Nonces", "tag": "Msg 1–2", "title": "Exchange random numbers (nonces)", "body": "<p>The AP sends ANonce; the phone sends SNonce plus a code proving it derived the right key. Mixing both nonces gives a fresh key for this session.</p>", "flow": [["ap", "ph", "#3b82f6", "1: ANonce"], ["ph", "ap", "#f59e0b", "2: SNonce + MIC"]]}, {"short": "Confirm", "tag": "Msg 3–4", "title": "The AP confirms; both install the session key", "body": "<p>Messages 3 and 4 confirm and deliver the group key for broadcasts. Traffic is now encrypted.</p>", "flow": [["ap", "ph", "#3b82f6", "3: GTK + MIC"], ["ph", "ap", "#22c55e", "4: ACK"]], "metrics": {"key": ["installed", "good"]}, "note": {"kind": "warn", "text": "An attacker who records this handshake can try guessing weak passwords offline. WPA3's SAE handshake prevents that, use long passphrases either way."}}]}

::widget Scene {"title": "Captive portals: hotel and café Wi-Fi logins", "sub": "why a login page pops up", "nodes": [{"id": "ph", "kind": "phone", "label": "Phone", "x": 3.1, "y": 3.1}, {"id": "ap", "kind": "router", "label": "Wi-Fi access point", "x": 8.1, "y": -1.9, "color": "blue"}, {"id": "gw", "kind": "server", "label": "Portal gateway", "x": 12.1, "y": -5.9, "color": "orange"}, {"id": "net", "kind": "cloud", "label": "Internet", "x": 16.1, "y": -9.9}], "links": [["ph", "ap"], ["ap", "gw"], ["gw", "net"]], "metrics": [["state", "Phone state"]], "steps": [{"short": "Blocked", "tag": "Join", "title": "You join the open network, but the internet is blocked", "body": "<p>The gateway lets only DNS and its own login page through.</p>", "metrics": {"state": ["connected, no internet", "bad"]}}, {"short": "Probe", "tag": "Detect", "title": "Your phone probes a known URL and gets redirected", "body": "<p>Phones fetch a test page (e.g. Apple's captive.apple.com). A redirect instead of the expected reply means \"captive portal\", so the login sheet pops up.</p>", "flow": [["ph", "gw", "#f59e0b", "GET test page"], ["gw", "ph", "#ef4444", "302 → /login"]]}, {"short": "Login", "tag": "Allow", "title": "After you accept the terms, your MAC is allowed", "body": "<p>The gateway adds your device to its allow list for a time window.</p>", "flow": [[["ph", "ap", "gw", "net"], "#22c55e", "internet"]], "metrics": {"state": ["online", "good"]}, "note": {"kind": "key", "text": "Captive portals are why HTTPS sites can't load until you log in, the gateway can't redirect encrypted requests cleanly."}}]}

::widget Scene {"title": "Enterprise Wi-Fi: 802.1X with RADIUS", "sub": "everyone has their own login", "nodes": [{"id": "ph", "kind": "phone", "label": "Phone", "x": 3.1, "y": 3.1}, {"id": "ap", "kind": "router", "label": "Wi-Fi access point", "x": 8.1, "y": -1.9, "color": "blue"}, {"id": "rad", "kind": "server", "label": "RADIUS server", "x": 12.1, "y": -5.9, "color": "purple"}, {"id": "dir", "kind": "db", "label": "Company directory", "x": 16.1, "y": -9.9, "color": "teal"}], "links": [["ph", "ap", {"both": true}], ["ap", "rad", {"both": true}], ["rad", "dir", {"both": true}]], "metrics": [["who", "Authenticated as"]], "steps": [{"short": "No shared password", "tag": "Problem", "title": "One shared password for 5,000 staff is a security hole", "body": "<p>When someone leaves, you'd have to change it for everyone.</p>", "metrics": {"who": ["-"]}}, {"short": "Relay", "tag": "EAP", "title": "The access point relays the login to a RADIUS server", "body": "<p>The phone proves its identity (username/password inside TLS, or a device certificate). The AP doesn't judge, it asks RADIUS.</p>", "flow": [[["ph", "ap", "rad"], "#f59e0b", "EAP credentials"], ["rad", "dir", "#a855f7", "check user"]]}, {"short": "Accept", "tag": "Allow", "title": "RADIUS says Accept and hands out a per-user key", "body": "<p>Each person gets unique encryption keys and can be placed on a VLAN by role. Disable an account and their Wi-Fi stops working.</p>", "flow": [["rad", "ap", "#22c55e", "Access-Accept"], ["ap", "ph", "#22c55e", "connected"]], "metrics": {"who": ["asha@company", "good"]}}]}

## Why the café Wi-Fi is slow

> [!STORY] Your laptop shows full Wi-Fi bars in a busy café, yet a video call stutters and a download crawls. At home, with the same laptop and fewer bars, everything is fast. Signal strength isn't the problem, **sharing** is. Wi-Fi is like a single conversation in a crowded room: only one device can usefully "speak" on a channel at a time, and fifty laptops and phones are all waiting their turn, while the neighboring shop's network on the same channel shouts over them. Wireless networks behave very differently from cables, and apps that assume a fast, stable connection break in exactly these places.

## Radio basics in three ideas

- **Frequency** is how fast the radio wave oscillates. Wi-Fi uses the **2.4 GHz** **5 GHz** and **6 GHz** bands; mobile networks use bands from ~600 MHz up to millimeter waves (24+ GHz). **Lower frequencies travel farther and pass through walls better; higher frequencies carry more data but over shorter distances.**
- **Bandwidth** the width of the frequency range a connection uses (20, 40, 80, 160, 320 MHz in Wi-Fi), sets how much data can flow, like the number of lanes on a road.
- **Signal-to-noise ratio** decides how many bits each radio symbol can carry. Close to the router with little interference, the radio packs in more bits per symbol (fancier "modulation"); far away, it falls back to slower, sturdier encodings.

> [!ANALOGY] Talking across a room. Close to someone in a quiet room, you can speak quickly and softly. Far away in a noisy room, you have to speak slowly, loudly and repeat yourself. Radios do the same, automatically, many times a second.

## How Wi-Fi shares the air

A Wi-Fi **access point** and all the devices connected to it share one **channel**. Unlike wired Ethernet with a switch (Networking chapter 3), the air is a shared medium, so Wi-Fi uses **CSMA/CA** "listen before talking":

1. A device with something to send listens. If the channel is busy, it waits.
2. When the channel is free, it waits a **random** short time (so two waiting devices don't both jump in at once).
3. It sends, and the receiver replies with an **acknowledgment**. No ACK → assume a collision or interference, wait longer, retry.

Consequences you've experienced:

- More devices means more waiting, throughput **per device** drops.
- A device with a weak signal transmits slowly, **hogging airtime** that faster devices could have used.
- Neighboring networks on the same channel compete with yours. In apartment buildings, 2.4 GHz has only **three** non-overlapping channels, so it's usually congested.
- Microwaves, Bluetooth and baby monitors also use 2.4 GHz.

### Wi-Fi generations

| Name | Standard | Key improvements |
|---|---|---|
| Wi-Fi 4 | 802.11n | MIMO (multiple antennas), 40 MHz channels |
| Wi-Fi 5 | 802.11ac | 5 GHz, 80/160 MHz channels, downlink multi-user MIMO |
| Wi-Fi 6 / 6E | 802.11ax | **OFDMA** splits a channel so the router can serve many devices **in the same moment**; better in crowded places; 6E adds the clean 6 GHz band |
| Wi-Fi 7 | 802.11be | 320 MHz channels, **multi-link** (using several bands at once), lower latency |

> [!NOTE] **Practical Wi-Fi tips:** prefer 5/6 GHz when close to the router; use wired Ethernet for desktops and servers; for large homes or offices, use several access points (mesh or wired backhaul) rather than one powerful router; and choose less crowded channels.

### Wi-Fi security

- **WEP** (broken long ago) and **WPA** are obsolete. **WPA2** with a strong passphrase is acceptable; **WPA3** is better: its **SAE** handshake stops attackers from capturing a handshake and guessing the password offline.
- **Enterprise Wi-Fi (802.1X)** gives each user their own credentials or certificate instead of a shared password.
- On **open public Wi-Fi** anyone nearby can observe unencrypted traffic and set up a fake hotspot with the same name. HTTPS everywhere (Networking chapter 7) protects the content; a VPN (chapter 12) protects more.

## Mobile networks: from your phone to the internet

A cellular network is much more than a tower. It must track millions of moving phones, hand them from tower to tower at highway speed, authenticate them, bill them, and connect them to the internet.

::widget Stepper {"type":"flow","cols":4,"title":"How a phone's request reaches the internet over 4G/5G","what":"The path of data from an app on your phone to a web server, through a mobile operator's network. Each box is one part of the system.","steps":["Press Play from the phone to the internet.","Notice that the phone's IP address is assigned deep inside the operator's network, not at the tower.","Find the part that keeps your connection alive as you move between towers."],"nodes":[["Phone and SIM","The SIM (or eSIM) holds a secret key used to prove the phone's identity to the network and agree on encryption keys for the radio link."],["Radio access: the tower","The base station (eNodeB in 4G, gNodeB in 5G) schedules every millisecond which phones may send and receive on which frequencies, no 'listen before talking' as in Wi-Fi; the tower is in charge."],["Backhaul","Fiber or microwave links carry traffic from towers to the operator's core network."],["Core: control","Authenticates subscribers, tracks which tower each phone is near, and manages handovers so moving phones keep their sessions. (MME/AMF and related functions.)"],["Core: user plane","Gateways (P-GW in 4G, UPF in 5G) assign the phone's IP address, forward its traffic, and apply policies and billing."],["Carrier-grade NAT and the internet","Usually many phones share public IP addresses through large NAT gateways (Networking chapter 2), then traffic reaches the internet. With 5G, some of this can run at the edge, near the user."]]}

### Why mobile connections feel different

- **Latency varies widely:** ~20–50 ms on good 4G/5G, hundreds of ms on congested or weak signals.
- **Radio state machine:** an idle phone's radio sleeps. The first request must wake it and get a slot from the tower, adding **tens to hundreds of milliseconds**. After transferring, the radio stays in a high-power state for seconds before sleeping again (OS track, chapter 15, the "radio tail").
- **Handovers and dead zones:** moving between towers, entering a lift or tunnel: connections stall or drop. Your IP address may even change.
- **Asymmetric and variable bandwidth:** download is usually much faster than upload; capacity changes second to second.
- **Carrier-grade NAT:** phones can't receive incoming connections; NAT tables time out idle connections, sometimes in minutes.

### What 5G changes

- **More spectrum:** mid-band (~3.5 GHz) gives most of 5G's real-world speed gains; **millimeter wave** (24+ GHz) offers huge speeds over short distances, mostly in dense urban spots and stadiums.
- **Lower latency** on the radio link and a redesigned core that can run functions close to users (**edge computing**).
- **Network slicing:** one physical network presented as several virtual networks with different guarantees (e.g. for factories or emergency services).
- **Massive IoT** support for huge numbers of low-power devices.

## Building apps for real mobile networks

> [!EXAMPLE] **Designing for a train journey.** An app used on a commuter train must assume the connection will vanish mid-request and come back with a different IP. Good apps: keep requests small and few, cache aggressively, queue user actions offline and sync later, use **idempotency keys** so retried payments don't double-charge (System Design track), set sensible timeouts and retry with backoff, and prefer protocols that survive network changes, **QUIC/HTTP/3** connections can migrate between Wi-Fi and cellular without restarting (Networking chapter 6).

- **Batch** network requests to let the radio sleep; avoid frequent polling, use push notifications.
- **Compress** and minimize payloads; use modern image formats and sizes appropriate to the screen.
- **Test on bad networks:** browser dev tools and OS network-link conditioners simulate slow, lossy, high-latency connections.
- Show **progress and cached content** instead of spinners when the network is slow.

> [!RECAP]
> - Radio trade-off: **lower frequency = range** **higher frequency = capacity**; signal quality decides bits per symbol.
> - **Wi-Fi** is a shared channel using listen-before-talk (**CSMA/CA**); crowding, weak devices and neighbors cut throughput. Wi-Fi 6/7 add **OFDMA** and multi-link; use **WPA3**.
> - **Cellular**: SIM authentication → tower scheduling → backhaul → core (control + user-plane gateways) → carrier NAT → internet; handovers keep you connected while moving.
> - Mobile networks have variable latency, radio wake-up delays, handovers and NAT timeouts; **5G** adds spectrum, lower latency, edge computing and slicing.
> - Build apps that batch, cache, retry idempotently, work offline and survive network changes.

> [!INTERVIEW] Mobile and backend interviews ask why mobile latency is unpredictable, how to design an API for flaky networks (small payloads, idempotency, retries, offline sync), and why Wi-Fi slows down with many users.

::quiz {"q":"Why does Wi-Fi throughput per device drop in a crowded café?","options":["The router overheats","Devices share one channel and must take turns transmitting","Wi-Fi uses less power in crowds","DNS gets slower"],"answer":1,"explain":"Listen-before-talk means more devices, more waiting."}

::quiz {"q":"Why is the first request after a phone sits idle often slow?","options":["DNS is always slow","The radio must wake up and get scheduled by the tower before sending","The SIM must be re-read","HTTPS is disabled"],"answer":1,"explain":"The radio state machine adds tens to hundreds of milliseconds."}

::quiz {"q":"Which protocol lets a connection survive switching from Wi-Fi to cellular?","options":["TCP","QUIC (HTTP/3), via connection migration","UDP alone","FTP"],"answer":1,"explain":"QUIC identifies connections by an ID, not by IP address and port."}
