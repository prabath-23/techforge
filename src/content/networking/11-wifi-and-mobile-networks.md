---
title: Wi-Fi and Mobile Networks (4G/5G)
summary: How data travels through the air — radio basics (frequency, bandwidth, interference), how Wi-Fi shares a channel and why it slows down in crowded places, Wi-Fi generations and security (WPA3), how a phone connects through a cellular network from tower to internet, what 5G actually changes, and what all this means for building apps that work on real mobile connections.
---

## Why the café Wi-Fi is slow

> [!STORY] Your laptop shows full Wi-Fi bars in a busy café, yet a video call stutters and a download crawls. At home, with the same laptop and fewer bars, everything is fast. Signal strength isn't the problem — **sharing** is. Wi-Fi is like a single conversation in a crowded room: only one device can usefully "speak" on a channel at a time, and fifty laptops and phones are all waiting their turn, while the neighboring shop's network on the same channel shouts over them. Wireless networks behave very differently from cables, and apps that assume a fast, stable connection break in exactly these places.

## Radio basics in three ideas

- **Frequency** is how fast the radio wave oscillates. Wi-Fi uses the **2.4 GHz**, **5 GHz** and **6 GHz** bands; mobile networks use bands from ~600 MHz up to millimeter waves (24+ GHz). **Lower frequencies travel farther and pass through walls better; higher frequencies carry more data but over shorter distances.**
- **Bandwidth** — the width of the frequency range a connection uses (20, 40, 80, 160, 320 MHz in Wi-Fi) — sets how much data can flow, like the number of lanes on a road.
- **Signal-to-noise ratio** decides how many bits each radio symbol can carry. Close to the router with little interference, the radio packs in more bits per symbol (fancier "modulation"); far away, it falls back to slower, sturdier encodings.

> [!ANALOGY] Talking across a room. Close to someone in a quiet room, you can speak quickly and softly. Far away in a noisy room, you have to speak slowly, loudly and repeat yourself. Radios do the same, automatically, many times a second.

## How Wi-Fi shares the air

A Wi-Fi **access point** and all the devices connected to it share one **channel**. Unlike wired Ethernet with a switch (Networking chapter 3), the air is a shared medium, so Wi-Fi uses **CSMA/CA** — "listen before talking":

1. A device with something to send listens. If the channel is busy, it waits.
2. When the channel is free, it waits a **random** short time (so two waiting devices don't both jump in at once).
3. It sends, and the receiver replies with an **acknowledgment**. No ACK → assume a collision or interference, wait longer, retry.

Consequences you've experienced:

- More devices means more waiting — throughput **per device** drops.
- A device with a weak signal transmits slowly, **hogging airtime** that faster devices could have used.
- Neighboring networks on the same channel compete with yours. In apartment buildings, 2.4 GHz has only **three** non-overlapping channels, so it's usually congested.
- Microwaves, Bluetooth and baby monitors also use 2.4 GHz.

### Wi-Fi generations

| Name | Standard | Key improvements |
|---|---|---|
| Wi-Fi 4 | 802.11n | MIMO (multiple antennas), 40 MHz channels |
| Wi-Fi 5 | 802.11ac | 5 GHz, 80/160 MHz channels, downlink multi-user MIMO |
| Wi-Fi 6 / 6E | 802.11ax | **OFDMA** — splits a channel so the router can serve many devices **in the same moment**; better in crowded places; 6E adds the clean 6 GHz band |
| Wi-Fi 7 | 802.11be | 320 MHz channels, **multi-link** (using several bands at once), lower latency |

> [!NOTE] **Practical Wi-Fi tips:** prefer 5/6 GHz when close to the router; use wired Ethernet for desktops and servers; for large homes or offices, use several access points (mesh or wired backhaul) rather than one powerful router; and choose less crowded channels.

### Wi-Fi security

- **WEP** (broken long ago) and **WPA** are obsolete. **WPA2** with a strong passphrase is acceptable; **WPA3** is better: its **SAE** handshake stops attackers from capturing a handshake and guessing the password offline.
- **Enterprise Wi-Fi (802.1X)** gives each user their own credentials or certificate instead of a shared password.
- On **open public Wi-Fi**, anyone nearby can observe unencrypted traffic and set up a fake hotspot with the same name. HTTPS everywhere (Networking chapter 7) protects the content; a VPN (chapter 12) protects more.

## Mobile networks: from your phone to the internet

A cellular network is much more than a tower. It must track millions of moving phones, hand them from tower to tower at highway speed, authenticate them, bill them, and connect them to the internet.

::widget Stepper {"type":"flow","cols":4,"title":"How a phone's request reaches the internet over 4G/5G","what":"The path of data from an app on your phone to a web server, through a mobile operator's network. Each box is one part of the system.","steps":["Press Play from the phone to the internet.","Notice that the phone's IP address is assigned deep inside the operator's network, not at the tower.","Find the part that keeps your connection alive as you move between towers."],"nodes":[["Phone and SIM","The SIM (or eSIM) holds a secret key used to prove the phone's identity to the network and agree on encryption keys for the radio link."],["Radio access: the tower","The base station (eNodeB in 4G, gNodeB in 5G) schedules every millisecond which phones may send and receive on which frequencies — no 'listen before talking' as in Wi-Fi; the tower is in charge."],["Backhaul","Fiber or microwave links carry traffic from towers to the operator's core network."],["Core: control","Authenticates subscribers, tracks which tower each phone is near, and manages handovers so moving phones keep their sessions. (MME/AMF and related functions.)"],["Core: user plane","Gateways (P-GW in 4G, UPF in 5G) assign the phone's IP address, forward its traffic, and apply policies and billing."],["Carrier-grade NAT and the internet","Usually many phones share public IP addresses through large NAT gateways (Networking chapter 2), then traffic reaches the internet. With 5G, some of this can run at the edge, near the user."]]}

### Why mobile connections feel different

- **Latency varies widely:** ~20–50 ms on good 4G/5G, hundreds of ms on congested or weak signals.
- **Radio state machine:** an idle phone's radio sleeps. The first request must wake it and get a slot from the tower, adding **tens to hundreds of milliseconds**. After transferring, the radio stays in a high-power state for seconds before sleeping again (OS track, chapter 15 — the "radio tail").
- **Handovers and dead zones:** moving between towers, entering a lift or tunnel: connections stall or drop. Your IP address may even change.
- **Asymmetric and variable bandwidth:** download is usually much faster than upload; capacity changes second to second.
- **Carrier-grade NAT:** phones can't receive incoming connections; NAT tables time out idle connections, sometimes in minutes.

### What 5G changes

- **More spectrum:** mid-band (~3.5 GHz) gives most of 5G's real-world speed gains; **millimeter wave** (24+ GHz) offers huge speeds over short distances, mostly in dense urban spots and stadiums.
- **Lower latency** on the radio link and a redesigned core that can run functions close to users (**edge computing**).
- **Network slicing:** one physical network presented as several virtual networks with different guarantees (e.g. for factories or emergency services).
- **Massive IoT** support for huge numbers of low-power devices.

## Building apps for real mobile networks

> [!EXAMPLE] **Designing for a train journey.** An app used on a commuter train must assume the connection will vanish mid-request and come back with a different IP. Good apps: keep requests small and few, cache aggressively, queue user actions offline and sync later, use **idempotency keys** so retried payments don't double-charge (System Design track), set sensible timeouts and retry with backoff, and prefer protocols that survive network changes — **QUIC/HTTP/3** connections can migrate between Wi-Fi and cellular without restarting (Networking chapter 6).

- **Batch** network requests to let the radio sleep; avoid frequent polling — use push notifications.
- **Compress** and minimize payloads; use modern image formats and sizes appropriate to the screen.
- **Test on bad networks:** browser dev tools and OS network-link conditioners simulate slow, lossy, high-latency connections.
- Show **progress and cached content** instead of spinners when the network is slow.

> [!RECAP]
> - Radio trade-off: **lower frequency = range**, **higher frequency = capacity**; signal quality decides bits per symbol.
> - **Wi-Fi** is a shared channel using listen-before-talk (**CSMA/CA**); crowding, weak devices and neighbors cut throughput. Wi-Fi 6/7 add **OFDMA** and multi-link; use **WPA3**.
> - **Cellular**: SIM authentication → tower scheduling → backhaul → core (control + user-plane gateways) → carrier NAT → internet; handovers keep you connected while moving.
> - Mobile networks have variable latency, radio wake-up delays, handovers and NAT timeouts; **5G** adds spectrum, lower latency, edge computing and slicing.
> - Build apps that batch, cache, retry idempotently, work offline and survive network changes.

> [!INTERVIEW] Mobile and backend interviews ask why mobile latency is unpredictable, how to design an API for flaky networks (small payloads, idempotency, retries, offline sync), and why Wi-Fi slows down with many users.

::quiz {"q":"Why does Wi-Fi throughput per device drop in a crowded café?","options":["The router overheats","Devices share one channel and must take turns transmitting","Wi-Fi uses less power in crowds","DNS gets slower"],"answer":1,"explain":"Listen-before-talk means more devices, more waiting."}

::quiz {"q":"Why is the first request after a phone sits idle often slow?","options":["DNS is always slow","The radio must wake up and get scheduled by the tower before sending","The SIM must be re-read","HTTPS is disabled"],"answer":1,"explain":"The radio state machine adds tens to hundreds of milliseconds."}

::quiz {"q":"Which protocol lets a connection survive switching from Wi-Fi to cellular?","options":["TCP","QUIC (HTTP/3), via connection migration","UDP alone","FTP"],"answer":1,"explain":"QUIC identifies connections by an ID, not by IP address and port."}
