---
title: Disaster Recovery and Business Continuity: RPO, RTO, Strategies and Real Drills
summary: Planning for the bad day: business impact analysis and tiering, RPO and RTO, backup vs replication, DR strategies from backup-and-restore to pilot light, warm standby and multi-site active-active, regional failover with DNS and data replication, ransomware-resilient backups, runbooks and game days, and the business continuity plan beyond IT.
---

::widget Scene {"title": "A region goes down: failing over the payments system", "sub": "warm standby in a second region, from alarm to recovery", "nodes": [{"id": "users", "kind": "user", "label": "Users", "x": 3.72, "y": 3.72}, {"id": "dns", "kind": "router", "label": "Global DNS / traffic manager", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "pr", "kind": "server", "label": "Primary region (Mumbai)", "x": 8.5, "y": -8.5, "color": "purple", "count": 3}, {"id": "dr", "kind": "server", "label": "DR region (Hyderabad), warm", "x": 15.94, "y": -1.06, "color": "teal", "count": 1}, {"id": "pdb", "kind": "db", "label": "Primary DB", "x": 13.0, "y": -13.0, "color": "purple"}, {"id": "rdb", "kind": "db", "label": "Replica DB (async)", "x": 20.44, "y": -5.56, "color": "teal"}, {"id": "ic", "kind": "user", "label": "Incident commander", "x": 13.92, "y": 5.92, "color": "orange"}], "links": [["users", "dns"], ["dns", "pr"], ["dns", "dr", {"dashed": true}], ["pr", "pdb"], ["pdb", "rdb", {"label": "replication"}], ["dr", "rdb"]], "metrics": [["t", "Time since outage"], ["rpo", "Data lost (RPO)"], ["state", "State"]], "steps": [{"short": "Targets", "tag": "Plan", "title": "Payments is tier 1: RPO ≤ 1 minute, RTO ≤ 30 minutes", "body": "<p>Decided by business impact analysis, not by engineers alone. These targets chose the strategy: warm standby in a second region.</p>", "show": ["users", "dns", "pr", "pdb"], "metrics": {"t": ["-"], "rpo": ["target ≤ 1 min"], "state": ["normal"]}}, {"short": "Standby", "tag": "Standby", "title": "The DR region runs a scaled-down copy, and the database replicates continuously", "body": "<p>Infrastructure as code keeps both regions identical; replication lag is monitored and alerted on.</p>", "show": ["users", "dns", "pr", "pdb", "dr", "rdb"], "flow": [["pdb", "rdb", "#14b8a6", "lag 4 s"]]}, {"short": "Outage", "tag": "Disaster", "title": "The primary region suffers a major outage", "body": "<p>Health checks fail across services; the cloud provider confirms a regional incident.</p>", "set": {"pr": {"dim": true, "badge": "region down"}, "pdb": {"dim": true}}, "metrics": {"t": ["0 min"], "state": ["outage", "bad"]}}, {"short": "Declare", "tag": "Decide", "title": "The incident commander declares a disaster and starts the runbook", "body": "<p>Failover has costs (possible data loss, split-brain risk), so a named person decides, following pre-agreed criteria.</p>", "show": ["users", "dns", "pr", "pdb", "dr", "rdb", "ic"], "metrics": {"t": ["6 min"], "state": ["DR declared"]}}, {"short": "Fence", "tag": "Fence", "title": "Fence the old primary so it can't accept writes if it recovers", "body": "<p>Prevents two primaries (split brain).</p>", "set": {"pdb": {"badge": "fenced"}}}, {"short": "Promote", "tag": "Promote", "title": "Promote the replica to primary", "body": "<p>Asynchronous replication means the last ~4 seconds of writes may be lost, within the RPO, and reconciled later from logs.</p>", "set": {"rdb": {"badge": "primary now"}}, "metrics": {"t": ["10 min"], "rpo": ["~4 s lost", "good"]}}, {"short": "Scale", "tag": "Scale up", "title": "Scale the DR region to full capacity", "body": "<p>Pre-approved quotas and pre-warmed images matter here.</p>", "set": {"dr": {"count": 3, "badge": "scaled to 100%"}}, "metrics": {"t": ["18 min"]}}, {"short": "DNS", "tag": "Traffic", "title": "Switch traffic with DNS / global load balancer", "body": "<p>Low TTLs (60 s) set in advance; clients and caches follow within minutes.</p>", "flow": [["dns", "dr", "#22c55e", "100% traffic"]], "metrics": {"t": ["24 min"], "state": ["recovered", "good"]}}, {"short": "Comms", "tag": "Communicate", "title": "Status page, customer and regulator communication", "body": "<p>Part of the business continuity plan, with templates ready.</p>"}, {"short": "Failback", "tag": "Fail back", "title": "Later: rebuild the primary, resync, and fail back in a planned window", "body": "<p>Then a blameless review. The drill last quarter is why this took 24 minutes and not 6 hours.</p>", "note": {"kind": "key", "text": "Targets (RPO/RTO) → strategy → replicate and keep DR identical with IaC → declare → fence → promote → scale → shift traffic → communicate → fail back. Practise it with game days."}}]}

## The plan nobody had tested

> [!STORY] A company has a beautifully formatted disaster recovery document. When a ransomware attack encrypts its primary environment, the team discovers that the DR site's servers haven't been updated in eight months, the runbook references an employee who left, backups are reachable from the compromised admin account, and nobody knows the order in which 40 services must start. Recovery takes eleven days. A DR plan is only as good as the last time it was exercised.

## Business continuity vs disaster recovery

- **Business continuity planning (BCP)** keeping the *business* running during disruption: people, offices, suppliers, communication, manual workarounds.
- **Disaster recovery (DR)** restoring *IT systems and data* after a disruption. DR is part of BCP.

Disasters include region or data-centre outages, ransomware and destructive attacks, major human errors (deleting a production database), corrupted data replicated everywhere, supplier failures and natural disasters.

## Business impact analysis and tiers

Not every system needs the same protection. A **business impact analysis** asks, per process: what does an hour of downtime cost (money, legal, reputation, safety)? What data loss is tolerable? Systems are then **tiered**:

| Tier | Example | RPO | RTO |
|---|---|---|---|
| 0–1 | payments, core auth | seconds–1 min | minutes |
| 2 | order history, internal tools | 15 min–1 h | hours |
| 3 | analytics, reporting | 24 h | days |

- **RPO (recovery point objective)** maximum acceptable data loss, measured in time.
- **RTO (recovery time objective)** maximum acceptable downtime.

Also map **dependencies**: tier-1 payments can't recover if the tier-3 configuration service it depends on takes a day.

## Backups vs replication

- **Replication** copies changes continuously to another place, great RPO and RTO, but it also replicates mistakes, corruption and ransomware encryption.
- **Backups** are point-in-time copies kept for days to years, the defence against bad data and deletion.

You need both. Follow **3-2-1** (Cloud chapter 8), with at least one **immutable** or offline copy in a separate account with separate credentials, and **test restores** regularly.

## DR strategies

From cheapest/slowest to most expensive/fastest:

1. **Backup and restore** rebuild infrastructure from code and restore data. RTO hours–days.
2. **Pilot light** core data replicated and minimal services ready; scale out on demand. RTO tens of minutes–hours.
3. **Warm standby** a scaled-down, fully functional copy running in another region. RTO minutes.
4. **Multi-site active-active** full capacity in several regions serving traffic simultaneously. RTO near zero, but needs multi-region data design (System Design chapters on replication and consistency).

Infrastructure as code makes 1 and 2 realistic: the environment can be recreated from version control.

## Executing a failover

A runbook (see the lesson) usually covers:

1. **Detect and declare** clear criteria and a named decision-maker.
2. **Fence** the failed primary to avoid split brain.
3. **Promote** replicas / restore data.
4. **Scale up** capacity (quotas pre-approved, images ready).
5. **Shift traffic** DNS with low TTLs, global load balancers, anycast.
6. **Verify** with smoke tests and business metrics.
7. **Communicate** status page, customers, regulators.
8. **Fail back** later, in a planned window.

## Ransomware-specific recovery

- Assume attackers have admin credentials: backups must be **immutable** and managed by separate identities.
- Restore into a **clean environment** from a point before the compromise, after identifying how they got in, otherwise you restore the attacker too.
- Have offline copies of critical runbooks, contact lists and credentials (break-glass), since normal systems may be unavailable.

## Practise

- **Tabletop exercises** walk through a scenario with decision-makers.
- **Restore tests** automated, frequent, timed.
- **Game days / chaos drills** actually fail over a component or region in a controlled way.
- Measure achieved RPO/RTO against targets and fix gaps; update runbooks after every drill and incident.

> [!RECAP]
> - BCP keeps the business running; DR restores IT. Tier systems by **business impact**.
> - **RPO** = tolerable data loss; **RTO** = tolerable downtime; map dependencies.
> - Replication for speed, **immutable backups** for bad data and ransomware, you need both.
> - Strategies: backup-restore → pilot light → warm standby → active-active.
> - Failover: declare → fence → promote → scale → shift traffic → verify → communicate → fail back.
> - Untested plans fail: run tabletops, restore tests and game days.

> [!INTERVIEW] "RPO vs RTO?", "How would you design DR for a payments system?", "Why isn't replication enough?", "Pilot light vs warm standby?", "How do you recover from ransomware?", "How do you test a DR plan?"

::quiz {"q": "Your RPO is 5 minutes. What does that mean?", "options": ["Systems must restart within 5 minutes", "You can afford to lose at most 5 minutes of data", "Backups take 5 minutes", "DNS TTL is 5 minutes"], "answer": 1, "explain": "RPO is about data loss; RTO is about downtime."}

::quiz {"q": "Why aren't replicas a substitute for backups?", "options": ["Replicas are slower", "Replication copies deletions, corruption and ransomware encryption too", "Backups are cheaper", "Replicas can't be read"], "answer": 1, "explain": "Point-in-time backups let you go back."}

::quiz {"q": "Which DR strategy keeps a scaled-down but fully working copy running?", "options": ["Backup and restore", "Pilot light", "Warm standby", "Cold storage"], "answer": 2, "explain": "Scale it up on failover."}
