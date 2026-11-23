---
title: Incident Response and Forensics — When Prevention Fails
summary: What happens after a breach is suspected — the incident response lifecycle from preparation to lessons learned, triage and severity, containing an attacker without tipping them off, preserving evidence, the logs you'll wish you had, rotating secrets and rebuilding, communication and legal duties, and practicing with tabletop exercises.
---

## 3:12 am: "unusual login from a new country"

> [!STORY] An alert fires: an engineer's account just logged into the cloud console from an unfamiliar country and created a new access key. Is it the engineer on holiday? A compromised laptop? A phished session? The next hour decides how bad this gets. A team that has practised knows exactly what to do: who's in charge, how to disable the key without destroying evidence, which logs to pull, when to tell legal, and what to say to customers. A team that hasn't will argue on a group chat while the attacker copies data.

Every organization will eventually have a security incident. The goal isn't zero incidents; it's **detecting them fast and responding well**. Industry studies have long found that breaches go unnoticed for months on average, and that companies with tested response plans have significantly lower breach costs.

## The lifecycle

The widely used NIST model has these phases:

::widget Stepper {"type":"cycle","title":"The incident response lifecycle","what":"The phases of handling a security incident. It's a cycle: lessons from each incident improve preparation for the next.","steps":["Press Play and go around the cycle.","Notice that preparation happens before anything goes wrong.","Find the phase where acting too fast can destroy evidence or tip off the attacker."],"nodes":[["Prepare","Before anything happens: an incident plan with roles and contacts, logging that captures what you'll need, tools and access ready, playbooks for common scenarios, and practice exercises."],["Detect and analyze","Alerts, user reports, a researcher's email, or a bill that's suddenly huge. Confirm whether it's real, decide its severity, and start a timeline. Most of the skill is here."],["Contain","Stop the damage from spreading: disable the compromised key, isolate the affected machine, block the attacker's addresses — while preserving evidence."],["Eradicate","Remove the attacker completely: every backdoor, new account, scheduled task and stolen credential. Find the original way in and close it."],["Recover","Restore from clean backups or rebuild, rotate secrets, bring systems back carefully, and watch closely for signs they've returned."],["Learn","A blameless post-incident review: timeline, root cause, what went well and badly, and action items with owners — fed back into preparation."]]}

## Detect and triage

Signals come from many places: security alerts (impossible travel, new admin accounts, disabled logging), cloud bills spiking from crypto-mining, customers reporting strange emails, a bug bounty report, or a journalist asking about your data on a forum.

First questions:

- **Is it real?** Confirm with a second source before waking everyone up.
- **What's affected?** Which accounts, systems, data?
- **Is it ongoing?** Is the attacker still active?
- **How severe?** Use a defined scale — e.g. SEV1 for confirmed access to customer data, SEV3 for a blocked phishing attempt — so everyone knows the urgency and who to involve.

Assign an **incident commander** (coordinates, doesn't investigate), investigators, a communications lead, and bring in legal early for anything involving personal data. Keep a **timestamped log** of every finding and action from the very first minute.

## Contain — carefully

> [!ANALOGY] Discovering a burglar is still in your house. Shouting at them might make them flee — or smash things on the way out and take what they can. Calling the police quietly, locking the doors to the rooms with valuables, and noting which window they used may lead to a better outcome. Containment trades off speed against tipping off the attacker and losing evidence.

- **Short-term containment:** disable compromised credentials, revoke sessions, isolate affected machines from the network (rather than powering them off — memory contains evidence), block attacker infrastructure.
- **Preserve evidence first** when you can: snapshot disks and memory, export logs before retention deletes them. Cloud makes this easier — snapshot a VM's disk and attach it to a separate forensics account.
- If the attacker has deep access, coordinate containment to happen **all at once**, so they can't use one remaining foothold to regain the rest.

## Forensics: reconstructing what happened

Investigators build a **timeline**: when did the attacker get in, what did they touch, what did they take, how did they persist?

The logs you'll wish you had:

| Source | Answers |
|---|---|
| **Cloud audit logs** (CloudTrail, Cloud Audit Logs) | Who called which API, from where — created keys, changed permissions, read storage |
| **Identity provider logs** | Logins, MFA prompts, new devices, password resets |
| **Application audit logs** | Which user viewed or exported which records |
| **Network flow logs, DNS logs** | Which machines talked to which addresses; data leaving the network |
| **Endpoint/EDR telemetry** | Processes started, files changed on laptops and servers |
| **Database and storage access logs** | Queries run, objects downloaded |

> [!WARN] Logs that aren't collected, are kept for only 7 days, or live on the same machine the attacker controls can't help you. Ship security logs to a **separate, append-only** store (a different account, with write-once storage) and keep them long enough — often a year or more.

Look for **indicators of compromise**: unfamiliar IPs, new accounts or keys, unusual processes, scheduled tasks, modified binaries, large outbound transfers. Then search the whole environment for the same indicators — attackers rarely stop at one machine.

## Eradicate and recover

- Assume **every secret the attacker could have seen is compromised**: rotate passwords, API keys, tokens, certificates and signing keys reachable from the affected systems.
- **Rebuild** compromised machines from known-good images rather than trying to clean them — you can't be sure you found every backdoor. Immutable infrastructure (Cloud track) makes this routine.
- Restore data from backups taken **before** the compromise, and verify backups weren't tampered with. (Ransomware groups specifically target backups — keep immutable, offline or separate-account copies.)
- Fix the **root cause**: the unpatched server, the phishable MFA, the over-privileged role.
- Monitor closely afterwards; attackers often try to return.

## Communicate

- **Internally:** regular updates to leadership and affected teams on a dedicated channel; avoid speculation.
- **Legal and regulatory duties:** many laws set deadlines for notifying regulators and affected people after a personal-data breach — **72 hours** to the regulator under the EU's GDPR, and India's CERT-In requires reporting certain incidents within **6 hours**. Involve legal counsel early.
- **Customers:** honest, clear, timely: what happened, what data, what you've done, what they should do. Vague or delayed disclosures damage trust more than the breach itself.

## Practice before it's real

- **Tabletop exercises:** walk the team through a realistic scenario ("an engineer's laptop is stolen with an active session", "ransomware on the file server") and see where the plan breaks — missing contacts, unclear authority, logs nobody can access.
- **Playbooks** for common incidents: leaked secret in GitHub, compromised account, ransomware, DDoS, lost device.
- **Red team / purple team** exercises: authorized attackers test detection and response for real.
- Make sure responders have **break-glass access** that works even if your identity provider is down.

> [!RECAP]
> - Incidents are inevitable; aim for **fast detection and a practised response**.
> - Lifecycle: **prepare → detect & analyze → contain → eradicate → recover → learn**.
> - Triage with a severity scale; assign an **incident commander**; keep a timestamped log.
> - **Contain** without destroying evidence: isolate, snapshot, preserve logs; coordinate to avoid tipping off the attacker.
> - Collect the right **logs** in a separate, append-only store; build a timeline; hunt for indicators across the environment.
> - **Rotate every exposed secret, rebuild from clean images**, restore from trusted backups, fix the root cause.
> - Meet **notification deadlines**, communicate honestly, and run **tabletop exercises**.

> [!INTERVIEW] Security and SRE interviews ask "an AWS access key was leaked on GitHub — what do you do?" Answer in order: revoke/rotate the key immediately, check CloudTrail for what it was used for, contain and clean up anything it created, scan for other leaks, and prevent recurrence with secret scanning and short-lived credentials.

::quiz {"q":"Why isolate a compromised server from the network rather than powering it off?","options":["It's faster","Memory and running state contain evidence that a power-off destroys","Powering off is not allowed","To keep serving users"],"answer":1,"explain":"Preserve evidence, then investigate."}

::quiz {"q":"After a compromise, why rebuild machines instead of cleaning them?","options":["It's cheaper","You can't be certain every backdoor was found; a known-good image removes doubt","Cleaning is illegal","Rebuilding preserves evidence"],"answer":1,"explain":"Immutable infrastructure makes rebuilding routine."}

::quiz {"q":"Where should security logs be stored?","options":["On the same server, for speed","In a separate, append-only store the attacker can't modify, kept for a long period","Only in memory","In the application database"],"answer":1,"explain":"Logs an attacker can delete can't help you."}
