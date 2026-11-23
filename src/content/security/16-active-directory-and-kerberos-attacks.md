---
title: Active Directory and Kerberos: How Domains Work and How They Are Attacked
summary: How Windows domains authenticate: Active Directory objects and groups, Kerberos tickets (TGT, service tickets) and the KDC, NTLM and why it's weaker; then the classic attack chain, password spraying, Kerberoasting, AS-REP roasting, pass-the-hash and pass-the-ticket, DCSync, golden and silver tickets, delegation abuse, with the detections and hardening for each.
---

::widget Scene {"title": "Kerberos logon and Kerberoasting", "sub": "how a ticket is issued, and how an attacker cracks a service account offline", "nodes": [{"id": "u", "kind": "laptop", "label": "User workstation", "x": 3.72, "y": 3.72}, {"id": "kdc", "kind": "server", "label": "Domain controller (KDC)", "x": 8.72, "y": -1.28, "color": "purple"}, {"id": "svc", "kind": "server", "label": "SQL service (svc_sql)", "x": 13.72, "y": -6.28, "color": "blue"}, {"id": "atk", "kind": "user", "label": "Attacker (any domain user)", "x": 9.92, "y": 9.92, "color": "red"}, {"id": "crack", "kind": "cpu", "label": "Offline GPU cracking", "x": 14.92, "y": 4.92, "color": "red"}], "links": [["u", "kdc", {"both": true}], ["u", "svc"], ["atk", "kdc", {"dashed": true}], ["atk", "crack", {"dashed": true}]], "metrics": [["msg", "Message"], ["secret", "Encrypted with"]], "steps": [{"short": "AS", "tag": "Logon", "title": "User logs on: AS-REQ to the KDC with a timestamp encrypted with their password key", "body": "<p>Pre-authentication proves knowledge of the password without sending it.</p>", "show": ["u", "kdc"], "flow": [["u", "kdc", "#3b82f6", "AS-REQ"]], "metrics": {"msg": ["AS-REQ"], "secret": ["user key (from password)"]}}, {"short": "TGT", "tag": "TGT", "title": "KDC returns a Ticket-Granting Ticket", "body": "<p>The TGT is encrypted with the krbtgt account's key, only the KDC can read it. Valid ~10 hours.</p>", "flow": [["kdc", "u", "#a855f7", "TGT"]], "metrics": {"msg": ["AS-REP: TGT"], "secret": ["krbtgt key"]}}, {"short": "TGS", "tag": "Service ticket", "title": "To reach SQL, the user presents the TGT and asks for a service ticket (TGS-REQ)", "body": "<p>The KDC looks up the service principal name (SPN) MSSQLSvc/db01.</p>", "flow": [["u", "kdc", "#3b82f6", "TGS-REQ: MSSQLSvc/db01"]], "metrics": {"msg": ["TGS-REQ"]}}, {"short": "ST", "tag": "Service ticket", "title": "The service ticket is encrypted with the service account's password key", "body": "<p>The user passes it to SQL; SQL decrypts it with its own key and trusts the user info inside.</p>", "show": ["u", "kdc", "svc"], "flow": [["kdc", "u", "#a855f7", "service ticket"], ["u", "svc", "#22c55e", "AP-REQ"]], "metrics": {"msg": ["TGS-REP → AP-REQ"], "secret": ["svc_sql key"]}}, {"short": "Roast", "tag": "Attack", "title": "Kerberoasting: ANY domain user can request a ticket for ANY SPN", "body": "<p>The attacker requests tickets for every service account, no special rights needed.</p>", "show": ["u", "kdc", "svc", "atk"], "flow": [["atk", "kdc", "#ef4444", "TGS-REQ ×40 SPNs"]], "metrics": {"msg": ["mass TGS-REQ"]}}, {"short": "Crack", "tag": "Offline", "title": "Crack the tickets offline: guess passwords until one decrypts", "body": "<p>Service accounts with human-chosen passwords like \"Sql2019!\" fall in minutes on GPUs, and often have high privileges.</p>", "show": ["u", "kdc", "svc", "atk", "crack"], "flow": [["atk", "crack", "#ef4444", "tickets"]], "set": {"crack": {"badge": "svc_sql: Sql2019!"}}, "metrics": {"secret": ["password recovered", "bad"]}}, {"short": "Detect", "tag": "Detect", "title": "Detection: event 4769 bursts, RC4 encryption requests, honey SPNs", "body": "<p>One user requesting dozens of service tickets, especially with RC4 (etype 0x17), is a strong signal. A decoy SPN no one uses is a perfect tripwire.</p>"}, {"short": "Harden", "tag": "Harden", "title": "Hardening: group Managed Service Accounts with 120-character random passwords", "body": "<p>Uncrackable; rotated automatically. Enforce AES-only and remove unneeded SPNs and privileges.</p>", "set": {"crack": {"badge": "gMSA: uncrackable"}}, "metrics": {"secret": ["random 120-char key", "good"]}, "note": {"kind": "key", "text": "Kerberos: password key → TGT (krbtgt key) → service ticket (service key). Kerberoasting abuses the last step offline; fix with gMSAs, AES and detection on 4769 patterns."}}]}

## The domain is the crown jewel

> [!STORY] Ransomware groups follow a remarkably consistent playbook: phish one user, steal credentials, move laterally, become **Domain Admin** then push the encryptor to every machine at once through Group Policy. Active Directory is how most companies manage identities and computers on Windows, so it's where attackers aim. If you work on HIDS, EDR or SIEM, AD attacks are some of the most important things your product must see.

## Active Directory in brief

- A **domain** (corp.example.com) is a database of objects, users, computers, groups, service accounts, Group Policy Objects (GPOs), replicated across **domain controllers (DCs)**.
- **Groups** grant rights; **Domain Admins** **Enterprise Admins** and some built-in groups effectively control everything.
- **Group Policy** pushes settings and scripts to machines, useful to admins and to attackers who gain control of it.
- **LDAP** is the protocol to query the directory; attackers use it (and tools like BloodHound) to map relationships and find paths to admin.

## Kerberos

The default authentication protocol in a domain (see the lesson):

1. **AS exchange** the user proves knowledge of their password-derived key and receives a **TGT** encrypted with the **krbtgt** account's key.
2. **TGS exchange** the user presents the TGT to get a **service ticket** for a service principal name (SPN), encrypted with that **service account's** key.
3. **AP exchange** the user presents the service ticket to the service, which decrypts it and trusts the identity and group memberships inside.

Passwords never cross the network; tickets are time-limited. But: the keys are derived from passwords, and whoever holds a key can forge or decrypt tickets.

## NTLM

The older challenge-response protocol, still used when Kerberos isn't possible (IP addresses, some legacy apps). Weaknesses: the password **hash** is effectively the password (pass-the-hash), relay attacks (forwarding a challenge to another server), weaker cryptography. Reduce NTLM use, require SMB signing and Extended Protection for Authentication, and audit where NTLM is still used.

## The attack chain and its detections

| Attack | What happens | Detect / mitigate |
|---|---|---|
| **Password spraying** | one common password tried against many accounts | many 4625/4771 failures across accounts from one source; smart lockout; MFA; banned passwords |
| **Kerberoasting** | request service tickets, crack offline | bursts of 4769, RC4 requests, honey SPNs; gMSAs, AES-only |
| **AS-REP roasting** | accounts without pre-auth leak crackable data | find and fix "do not require pre-auth" accounts; 4768 with no pre-auth |
| **Pass-the-hash** | use NTLM hash to authenticate without the password | NTLM logons (4624 type 3/9) from unusual hosts; LAPS for local admin; restrict NTLM |
| **Pass-the-ticket / overpass-the-hash** | reuse stolen Kerberos tickets or hashes to get tickets | tickets used from hosts other than where issued; Credential Guard |
| **Lateral movement** | PsExec/WMI/WinRM/RDP with stolen creds | service installs (7045), remote process creation, admin logons outside admin workstations |
| **DCSync** | pretend to be a DC and request replication of password hashes (including krbtgt) | replication requests (4662 with replication GUIDs) from non-DC hosts |
| **Golden ticket** | forge TGTs with the krbtgt key, any user, any group, long lifetime | tickets with odd lifetimes or for non-existent users; rotate krbtgt **twice** after compromise |
| **Silver ticket** | forge service tickets with a service account key | service access without matching TGS requests at the DC |
| **Delegation abuse** | misconfigured unconstrained/constrained/resource-based delegation lets attackers impersonate users | audit delegation settings; protect admins with "sensitive, cannot be delegated" and Protected Users |
| **AD CS abuse** | misconfigured certificate templates let users obtain certs as admins | audit templates; monitor certificate requests |

## Hardening principles

- **Tiered administration** Domain Admin accounts log on only to DCs and dedicated privileged access workstations, never to normal laptops where their credentials could be stolen.
- **Least privilege** for service accounts; **gMSAs**; remove stale accounts and SPNs.
- **LAPS** unique, rotated local administrator passwords per machine (stops one stolen local password from opening every machine).
- **Credential Guard** LSA protection, Protected Users group.
- **MFA** for remote access and admins; disable legacy protocols where possible.
- **Monitor** DCs heavily: they're the highest-value logs in the environment.
- Regularly run attack-path analysis (BloodHound-style) yourself and remove the paths.

> [!RECAP]
> - AD = users, computers, groups and GPOs on domain controllers; Domain Admin controls everything.
> - **Kerberos**: TGT (krbtgt key) → service ticket (service key) → service. NTLM is weaker and relayable.
> - Attack chain: spraying → Kerberoasting/AS-REP roasting → pass-the-hash/ticket → lateral movement → DCSync → golden ticket.
> - Detect with DC event patterns (4768/4769/4624/4662/7045) and EDR; harden with tiering, gMSA, LAPS, Credential Guard, delegation audits.

> [!INTERVIEW] "Explain Kerberos step by step", "What is Kerberoasting and how do you detect it?", "Golden vs silver ticket?", "What is DCSync?", "How do you stop pass-the-hash?", "What would you log on domain controllers?"

::quiz {"q": "Why can any domain user Kerberoast?", "options": ["They are all admins", "Any authenticated user may request a service ticket for any SPN, and it is encrypted with the service account's key", "Kerberos is disabled", "Tickets are plaintext"], "answer": 1, "explain": "The ticket can then be cracked offline."}

::quiz {"q": "What does a golden ticket require?", "options": ["A user's password", "The krbtgt account's key", "Physical access", "An SPN"], "answer": 1, "explain": "With it, attackers can forge TGTs for anyone."}

::quiz {"q": "Which control stops one stolen local admin password from working on every machine?", "options": ["SMB signing", "LAPS (unique rotated local admin passwords)", "Kerberos AES", "BitLocker"], "answer": 1, "explain": "Each machine gets its own password."}
