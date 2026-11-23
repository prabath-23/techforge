---
title: Network Detection and Threat Intelligence — IDS/IPS, NDR, MITRE ATT&CK and Threat Hunting
summary: Watching the network for attackers: signature IDS/IPS with Suricata and Snort, protocol logging with Zeek, network detection and response on encrypted traffic (JA3/JA4, beaconing, DNS anomalies), deception and honeypots, threat-intelligence levels and the pyramid of pain, MITRE ATT&CK for coverage, and hypothesis-driven threat hunting.
---

::widget Scene {"title": "Spotting a beacon in encrypted traffic", "sub": "no payload visible — the timing, the fingerprint and DNS give it away", "nodes": [{"id": "host", "kind": "laptop", "label": "Infected laptop", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "tap", "kind": "router", "label": "Network sensor (Zeek + Suricata)", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "c2", "kind": "cloud", "label": "cdn-update-check.net", "x": 13.22, "y": -5.78, "color": "red"}, {"id": "ti", "kind": "doc", "label": "Threat intel feeds", "x": 2.33, "y": -6.67, "color": "orange"}, {"id": "ndr", "kind": "cube", "label": "NDR analytics", "x": 18.8, "y": -0.2, "color": "teal"}], "links": [["host", "tap"], ["tap", "c2"], ["ti", "tap", {"dashed": true}], ["tap", "ndr"]], "metrics": [["signal", "Signal"], ["level", "Pyramid of pain level"]], "steps": [{"short": "Traffic", "tag": "Observe", "title": "All traffic is TLS — the payload is unreadable", "body": "<p>But metadata isn't: who talks to whom, when, how much, which TLS client, which DNS names.</p>", "show": ["host", "tap", "c2"], "flow": [["host", "tap", "#3b82f6", "TLS"], ["tap", "c2", "#3b82f6", ""]], "metrics": {"signal": ["—"], "level": ["—"]}}, {"short": "Zeek", "tag": "Logging", "title": "Zeek writes structured logs: conn, dns, tls, http, files", "body": "<p>Every connection summarised — perfect input for a SIEM and for hunting.</p>", "set": {"tap": {"badge": "conn.log, dns.log, ssl.log"}}}, {"short": "IOC", "tag": "Intel", "title": "Threat intel: the IP isn't on any blocklist", "body": "<p>Attackers rotate IPs and domains cheaply — the bottom of the pyramid of pain.</p>", "show": ["host", "tap", "c2", "ti"], "flow": [["ti", "tap", "#f59e0b", "no match"]], "metrics": {"signal": ["IP / domain IOC"], "level": ["easy for attacker to change"]}}, {"short": "DNS", "tag": "DNS", "title": "DNS: the domain was registered 3 days ago and is queried by only one host", "body": "<p>Rare + young domains are suspicious.</p>", "set": {"c2": {"badge": "age 3 days, 1 host"}}, "metrics": {"signal": ["rare new domain"]}}, {"short": "Beacon", "tag": "Timing", "title": "Connections every 60 s ± 3 s, small and uniform in size, for 9 hours — even at night", "body": "<p>Human browsing is bursty; malware beacons are regular. Jitter analysis reveals it.</p>", "show": ["host", "tap", "c2", "ti", "ndr"], "flow": [["tap", "ndr", "#14b8a6", "connection series"]], "set": {"ndr": {"badge": "beaconing score 0.97"}}, "metrics": {"signal": ["periodic beacon"], "level": ["behaviour (hard to change)"]}}, {"short": "JA4", "tag": "Fingerprint", "title": "TLS client fingerprint (JA3/JA4) matches a known C2 framework", "body": "<p>The way the client says hello — cipher order, extensions — identifies the tool, not the domain.</p>", "metrics": {"signal": ["TLS fingerprint"], "level": ["tools (painful to change)", "good"]}}, {"short": "Alert", "tag": "Detect", "title": "NDR raises a high-confidence alert, correlated with EDR on that laptop", "body": "<p>Combined: rare domain + beacon + fingerprint + unsigned process making the connections.</p>", "metrics": {"signal": ["correlated detection", "good"]}}, {"short": "Block", "tag": "Respond", "title": "Block the domain at DNS and the fingerprint at the proxy; isolate the host", "body": "<p>An IPS could block inline automatically for high-confidence signatures.</p>", "set": {"c2": {"dim": true, "badge": "blocked"}}}, {"short": "Hunt", "tag": "Hunt", "title": "Hunt: which other hosts show the same fingerprint or beacon pattern?", "body": "<p>Turn the finding into a durable detection on behaviour, not on the IP.</p>", "note": {"kind": "key", "text": "Encrypted traffic still leaks behaviour: DNS rarity, beacon timing, TLS fingerprints. Detect at the top of the pyramid of pain — behaviours and tools — not just IPs and hashes."}}]}

## The attacker changed the IP, not the habit

> [!STORY] A threat-intelligence feed lists an attacker's command-and-control IP. The SOC blocks it. The next morning the same malware is back, talking to a new IP from a new domain. Blocking indicators one by one is a game the defender loses. What the attacker didn't change was the way their implant behaves: a connection every sixty seconds, a distinctive TLS handshake, a freshly registered domain. Network detection that focuses on **behaviour** is far harder to evade.

## IDS and IPS

- **IDS** (intrusion detection system) watches a copy of traffic (SPAN port or network tap) and alerts.
- **IPS** sits **inline** and can drop malicious traffic — with the risk that a false positive blocks real business.

**Suricata** and **Snort** use signatures that match packet and protocol content:

```
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"Suspicious PowerShell download cradle";
  flow:established,to_server; http.user_agent; content:"WindowsPowerShell";
  http.uri; content:".ps1"; sid:1000001; rev:1;)
```

Rulesets (Emerging Threats and others) cover exploits, malware traffic and policy violations. Signatures are excellent for known attacks and noisy if untuned.

## Zeek: the network's flight recorder

**Zeek** (formerly Bro) doesn't primarily alert — it writes rich, structured logs of every connection and protocol: `conn.log` (who, when, bytes, duration), `dns.log`, `http.log`, `ssl.log` (TLS versions, server names, certificates, fingerprints), `files.log`. These logs feed SIEMs and make hunting possible long after the traffic has passed. Zeek scripts can also implement custom detections.

## NDR: detecting in encrypted traffic

Most traffic is encrypted, so **network detection and response** focuses on metadata and behaviour:

- **Beaconing:** regular intervals, small consistent sizes, long durations.
- **Rare destinations:** domains seen by one host, newly registered domains, unusual ASNs.
- **DNS anomalies:** long random subdomains (DNS tunnelling, DGA domains), high NXDOMAIN rates.
- **TLS fingerprints:** **JA3/JA4** hashes of the client hello identify tools and malware families regardless of destination.
- **Lateral movement:** unusual SMB/RDP/WinRM between workstations, admin protocols from non-admin hosts.
- **Exfiltration:** large uploads to unusual destinations, off-hours transfers.

Some organisations decrypt selected traffic at proxies, with privacy and legal constraints.

## Deception

Honeypots, honey-tokens and canary credentials are fake assets no legitimate user should touch: a fake admin account, an unused file share, a decoy database. Any interaction is a high-confidence alert with almost no false positives.

## Threat intelligence

Threat intelligence is evidence-based knowledge about attackers, at different levels:

- **Strategic** — who targets our industry and why (for leadership).
- **Operational** — campaigns and their timing.
- **Tactical** — attacker tactics, techniques and procedures (**TTPs**).
- **Technical** — indicators: IPs, domains, hashes, URLs.

### The pyramid of pain

David Bianco's pyramid ranks indicators by how much pain it causes attackers when you detect them:

1. Hash values — trivial to change.
2. IP addresses — easy.
3. Domain names — simple.
4. Network/host artefacts — annoying.
5. Tools — challenging.
6. **TTPs** — tough: changing *how* they operate is expensive.

Invest detection effort toward the top. Use indicator feeds for enrichment and quick blocks, with expiry dates, not as your main defence.

## MITRE ATT&CK

**ATT&CK** catalogues real attacker tactics and techniques. Teams use it to:

- tag detections with technique IDs,
- build coverage heat maps and find gaps,
- plan adversary emulation and purple-team exercises,
- describe incidents in a shared language.

## Threat hunting

Hunting is proactive: assume something got past the alerts and look for it.

1. **Hypothesis** — "An attacker is using scheduled tasks for persistence on servers."
2. **Data** — EDR process and task-creation events, last 90 days.
3. **Analyse** — stack counts, rare values, timelines.
4. **Outcome** — found something (incident) or not (still useful: document and turn into a detection).

> [!RECAP]
> - IDS alerts; IPS blocks inline. Suricata/Snort use signatures; Zeek logs everything.
> - NDR finds attackers in encrypted traffic through **beaconing, rare domains, DNS anomalies and TLS fingerprints**.
> - Deception assets give near-zero-false-positive alerts.
> - Threat intel has strategic → technical levels; aim detections at the top of the **pyramid of pain** (TTPs).
> - Use **MITRE ATT&CK** for coverage; hunt with hypotheses and convert findings into detections.

> [!INTERVIEW] "How would you detect C2 traffic that's encrypted?", "IDS vs IPS?", "What is the pyramid of pain?", "How do you use MITRE ATT&CK?", "Describe a threat hunt you'd run."

::quiz {"q": "Malware switches to a new IP daily. Which detection is most durable?", "options": ["Blocking yesterday's IP", "Detecting its beaconing behaviour and TLS client fingerprint", "Blocking all HTTPS", "Checking file names"], "answer": 1, "explain": "Behaviours and tools sit high on the pyramid of pain."}

::quiz {"q": "What does Zeek mainly produce?", "options": ["Blocked packets", "Structured logs of connections and protocols", "Antivirus signatures", "Firewall rules"], "answer": 1, "explain": "Its logs power SIEM detections and hunting."}

::quiz {"q": "What is an advantage of honey-tokens?", "options": ["They encrypt data", "Any use is almost certainly malicious, so alerts have very few false positives", "They replace EDR", "They speed up networks"], "answer": 1, "explain": "No legitimate user should touch them."}
