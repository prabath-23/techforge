---
title: EDR and XDR — Endpoint Telemetry, Behavioural Detection and Coordinated Response
summary: How endpoint detection and response works: kernel sensors and the telemetry they record (process trees, network, file, registry, memory), cloud analytics with rules, behaviour models and MITRE ATT&CK, the investigation process tree, response actions like host isolation, tamper protection, and how XDR correlates endpoint, identity, email, network and cloud signals into single incidents.
---

::widget Scene {"title": "EDR catching a phishing attack in the process tree", "sub": "Outlook → Word macro → PowerShell → credential theft → isolated", "nodes": [{"id": "ol", "kind": "laptop", "label": "outlook.exe", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "wd", "kind": "doc", "label": "winword.exe (invoice.docm)", "x": 5.27, "y": 5.27, "color": "orange"}, {"id": "ps", "kind": "cpu", "label": "powershell.exe -enc …", "x": 9.77, "y": 0.77, "color": "red"}, {"id": "ls", "kind": "cube", "label": "lsass.exe memory read", "x": 14.27, "y": -3.73, "color": "red"}, {"id": "c2", "kind": "cloud", "label": "C2 server", "x": 9.0, "y": -9.0, "color": "red"}, {"id": "edr", "kind": "cube", "label": "EDR cloud analytics", "x": 15.35, "y": 6.35, "color": "purple"}, {"id": "xdr", "kind": "db", "label": "XDR incident", "x": 19.85, "y": 1.85, "color": "teal"}], "links": [["ol", "wd"], ["wd", "ps"], ["ps", "ls"], ["ps", "c2"], ["ps", "edr", {"dashed": true}], ["edr", "xdr"]], "metrics": [["tech", "ATT&CK technique"], ["sev", "Severity"], ["action", "Response"]], "steps": [{"short": "Sensor", "tag": "Sensor", "title": "The EDR sensor records every process, file, network and registry event", "body": "<p>Kernel callbacks / ETW on Windows, eBPF or kernel modules on Linux, Endpoint Security framework on macOS. Events stream to the cloud and are kept locally for investigation.</p>", "show": ["ol"], "metrics": {"tech": ["—"], "sev": ["—"], "action": ["—"]}}, {"short": "Open", "tag": "Initial access", "title": "A user opens invoice.docm from an email", "body": "<p>Word starts as a child of Outlook — normal so far.</p>", "show": ["ol", "wd"], "metrics": {"tech": ["T1566.001 phishing attachment"]}}, {"short": "Macro", "tag": "Execution", "title": "The macro starts powershell.exe with an encoded command", "body": "<p>Office spawning a script interpreter is rare and highly suspicious.</p>", "show": ["ol", "wd", "ps"], "hot": [["wd", "ps"]], "metrics": {"tech": ["T1059.001 PowerShell"], "sev": ["high", "bad"]}}, {"short": "C2", "tag": "C2", "title": "PowerShell downloads a payload and beacons to a new domain", "body": "<p>Domain registered 2 days ago; regular 60-second beacons.</p>", "show": ["ol", "wd", "ps", "c2"], "flow": [["ps", "c2", "#ef4444", "HTTPS beacon"]], "metrics": {"tech": ["T1071 C2 over web"]}}, {"short": "Creds", "tag": "Credential access", "title": "The payload reads lsass.exe memory", "body": "<p>Classic credential dumping (Mimikatz-style).</p>", "show": ["ol", "wd", "ps", "c2", "ls"], "flow": [["ps", "ls", "#ef4444", "OpenProcess(lsass)"]], "metrics": {"tech": ["T1003.001 LSASS dump"], "sev": ["critical", "bad"]}}, {"short": "Detect", "tag": "Detection", "title": "Analytics combine the chain into one detection", "body": "<p>Rules (Office → PowerShell), behaviour (encoded command + new domain), and ML on the full process tree. Blocking prevention may already have stopped the LSASS access.</p>", "show": ["ol", "wd", "ps", "c2", "ls", "edr"], "flow": [["ps", "edr", "#a855f7", "telemetry"]], "set": {"edr": {"badge": "detection: 4 techniques"}}}, {"short": "Isolate", "tag": "Response", "title": "Automatic response: kill the process tree and isolate the host", "body": "<p>Isolation blocks all network traffic except to the EDR cloud, so analysts can still investigate.</p>", "set": {"ps": {"dim": true, "badge": "killed"}, "ls": {"dim": true}}, "metrics": {"action": ["killed + isolated", "good"]}}, {"short": "XDR", "tag": "XDR", "title": "XDR correlates: same email reached 40 inboxes; one user's account logged in from abroad", "body": "<p>Email, identity and endpoint alerts become one incident with one storyline.</p>", "show": ["ol", "wd", "ps", "c2", "ls", "edr", "xdr"], "flow": [["edr", "xdr", "#14b8a6", "incident"]], "metrics": {"action": ["purge email, reset password, revoke sessions"]}}, {"short": "Hunt", "tag": "Hunt", "title": "Hunt across the fleet for the domain and file hash", "body": "<p>Query telemetry from every endpoint for the last 30 days: two more hosts touched the domain.</p>", "note": {"kind": "key", "text": "EDR = rich endpoint telemetry + behavioural detection on process trees + remote response. XDR = the same idea across endpoint, email, identity, network and cloud, producing correlated incidents."}}]}

## Antivirus said everything was fine

> [!STORY] A finance employee opens an "invoice" attachment. No known-malware signature matches — the payload was built that morning. Traditional antivirus stays silent. But the sequence that follows is unmistakable to anyone watching behaviour: Outlook starts Word, Word starts PowerShell with an encoded command, PowerShell connects to a two-day-old domain, then something reads the memory of the Windows credential process. **Endpoint Detection and Response** exists because attackers change their files daily but their *behaviours* much less often.

## From antivirus to EDR

- **Antivirus (EPP)** — prevention by signatures, reputation and heuristics on files. Fast and cheap, blind to novel and "living off the land" attacks using built-in tools (PowerShell, WMI, certutil).
- **EDR** — continuous recording of endpoint activity, behavioural detection, investigation tooling and remote response.

Modern products combine both: an agent that prevents what it can and records everything else.

## The sensor

The endpoint agent hooks into the operating system to observe:

- **Processes:** creation with full command line, parent/child, user, integrity level, hashes, signatures.
- **Files:** creation, modification, renames — especially executables and scripts.
- **Network:** connections with process attribution, DNS queries.
- **Registry and persistence:** run keys, services, scheduled tasks, WMI subscriptions.
- **Memory and API behaviour:** process injection, handle access to LSASS, suspicious loaded modules.
- **Identity events:** logons, privilege use.

Collection mechanisms: Windows kernel callbacks, minifilter drivers and **ETW** (including ETW Threat Intelligence); Linux **eBPF** or kernel modules plus audit; macOS **Endpoint Security** framework and network extensions.

Engineering challenges: performance (thousands of events per second on busy servers), stability (kernel code can crash machines), bandwidth (filter and compress locally), offline buffering, and **tamper protection** so attackers can't simply stop the agent.

## Detection

Telemetry is analysed locally (for fast blocking) and in the cloud (for wider context):

- **Rules/IOCs:** known-bad hashes, domains, and exact patterns.
- **Behavioural detections (IOAs):** sequences like "Office app spawns a script interpreter", "unsigned binary in a temp folder sets a run key", "process opens LSASS with read access".
- **Machine learning** on file features and process-tree behaviour.
- **Context enrichment:** prevalence across the fleet (is this binary seen on 1 machine or 10,000?), domain age, user role.

Detections are mapped to **MITRE ATT&CK** — the shared vocabulary of tactics (initial access, execution, persistence, privilege escalation, defence evasion, credential access, discovery, lateral movement, collection, exfiltration, impact) and techniques.

## Investigation

The core investigation view is the **process tree** with a timeline: what started what, which files and connections each process touched, which user, and what happened next. Analysts also run **threat hunts** — queries across all endpoints' historical telemetry ("which hosts ran `certutil -urlcache` in the last 30 days?").

## Response actions

- **Kill** a process or process tree; **quarantine** a file.
- **Isolate** the host from the network (keeping a channel to the EDR console).
- **Remote shell / live response** to collect artefacts.
- **Rollback** changes (some products can revert ransomware encryption using snapshots).
- **Block** a hash or domain fleet-wide.

Automatic responses are used for high-confidence detections; others go to analysts.

## XDR: extending beyond the endpoint

Attacks cross domains: a phishing email (email security), a stolen session (identity provider), malware (endpoint), lateral movement (network), data exfiltration to cloud storage (cloud). **XDR** (extended detection and response) ingests signals from these sources and correlates them into **incidents** instead of separate alerts.

| | SIEM | EDR | XDR |
|---|---|---|---|
| Data | any logs | endpoint telemetry | endpoint + email + identity + network + cloud |
| Strength | breadth, compliance, custom correlation | deep endpoint visibility and response | correlated incidents with built-in response |
| Weakness | needs heavy tuning, analysts write rules | endpoint only | often tied to one vendor's ecosystem |

**MDR** (managed detection and response) is a service: a provider's analysts run the EDR/XDR for you.

> [!RECAP]
> - EDR records **process, file, network, registry and memory** activity and detects **behaviour**, not just signatures.
> - Sensors use kernel callbacks/ETW, eBPF, or Endpoint Security; tamper protection matters.
> - Detections combine IOCs, behavioural IOAs, ML and fleet prevalence, mapped to **MITRE ATT&CK**.
> - Investigate with process trees and hunts; respond by killing, quarantining, **isolating**.
> - **XDR** correlates endpoint, email, identity, network and cloud into incidents.

> [!INTERVIEW] "EDR vs antivirus?", "How would you detect credential dumping?", "What telemetry would you collect on Linux and how (eBPF vs auditd)?", "How does host isolation work while keeping investigation possible?", "SIEM vs XDR?"

::quiz {"q": "What does EDR add over traditional antivirus?", "options": ["Faster scanning only", "Continuous behavioural telemetry, detection of novel attacks, investigation and remote response", "A firewall", "Email filtering"], "answer": 1, "explain": "It sees what processes do, not just what files look like."}

::quiz {"q": "Which chain is a classic behavioural detection?", "options": ["Explorer starts Chrome", "Word spawns PowerShell with an encoded command", "Windows Update downloads a patch", "A user opens Excel"], "answer": 1, "explain": "Office spawning script interpreters is rare and suspicious."}

::quiz {"q": "What does XDR correlate?", "options": ["Only endpoint events", "Signals from endpoints, email, identity, network and cloud into incidents", "Only firewall logs", "Only antivirus signatures"], "answer": 1, "explain": "One storyline across domains."}
