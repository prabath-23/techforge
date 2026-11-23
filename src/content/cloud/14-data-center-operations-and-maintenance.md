---
title: Data Centre Operations — Power, Cooling, Hardware Lifecycle and Safe Maintenance
summary: What keeps physical infrastructure running: data-centre tiers and redundancy (N+1, 2N), power from utility to UPS to PDU, cooling and PUE, racks and networking, hardware lifecycle from provisioning to secure decommissioning, out-of-band management, firmware and OS patching, planned maintenance windows with draining and change management, capacity planning and remote hands.
---

::widget Scene {"title": "Patching a rack without anyone noticing", "sub": "a planned maintenance window: drain, patch, verify, restore", "nodes": [{"id": "cm", "kind": "doc", "label": "Change request (approved)", "x": 3.72, "y": 3.72}, {"id": "lb", "kind": "router", "label": "Load balancer", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "r1", "kind": "server", "label": "Rack A (to patch)", "x": 9.0, "y": -9.0, "color": "orange", "count": 3}, {"id": "r2", "kind": "server", "label": "Rack B", "x": 12.72, "y": -5.28, "color": "green", "count": 3}, {"id": "r3", "kind": "server", "label": "Rack C", "x": 16.44, "y": -1.56, "color": "green", "count": 3}, {"id": "oob", "kind": "cube", "label": "Out-of-band (BMC/IPMI)", "x": 13.5, "y": -13.5, "color": "purple"}, {"id": "mon", "kind": "cube", "label": "Monitoring", "x": 20.94, "y": -6.06, "color": "teal"}], "links": [["cm", "lb"], ["lb", "r1"], ["lb", "r2"], ["lb", "r3"], ["oob", "r1", {"dashed": true}], ["r2", "mon", {"dashed": true}]], "metrics": [["step", "Step"], ["capacity", "Serving capacity"], ["risk", "Risk"]], "steps": [{"short": "Plan", "tag": "Plan", "title": "Change request: firmware + kernel patch for rack A, Tuesday 02:00", "body": "<p>Scope, steps, rollback plan, owner, communication, and a check that the remaining racks can carry the load (N+1).</p>", "show": ["cm"], "metrics": {"step": ["plan + approval"], "capacity": ["100%"], "risk": ["assessed"]}}, {"short": "Capacity", "tag": "Check", "title": "Racks B and C can carry peak load at 2 a.m. with headroom", "body": "<p>Never start maintenance that drops you below required redundancy.</p>", "show": ["cm", "lb", "r1", "r2", "r3"], "metrics": {"capacity": ["67% after drain → OK"]}}, {"short": "Drain", "tag": "Drain", "title": "Drain rack A: stop new traffic, let existing connections finish", "body": "<p>Kubernetes cordon + drain, load balancer deregistration, database replicas moved away first.</p>", "flow": [["lb", "r2", "#22c55e", ""], ["lb", "r3", "#22c55e", ""]], "set": {"r1": {"badge": "draining"}}, "metrics": {"step": ["drain"], "capacity": ["67%"]}}, {"short": "OOB", "tag": "Patch", "title": "Patch through out-of-band management", "body": "<p>The BMC (iDRAC/iLO/IPMI/Redfish) allows firmware updates, power cycling and a remote console even if the OS hangs — no one needs to drive to the site.</p>", "show": ["cm", "lb", "r1", "r2", "r3", "oob"], "flow": [["oob", "r1", "#a855f7", "firmware + reboot"]], "set": {"r1": {"badge": "patching"}}, "metrics": {"step": ["patch firmware + OS"]}}, {"short": "Fail", "tag": "Problem", "title": "One server doesn't come back: failed disk on reboot", "body": "<p>Hardware often fails at power cycles. Open a ticket for remote hands to swap the drive; the server stays out of service.</p>", "set": {"r1": {"badge": "1 server failed"}}, "metrics": {"risk": ["1 server down (expected)"]}}, {"short": "Verify", "tag": "Verify", "title": "Health checks, burn-in tests and smoke tests on patched servers", "body": "<p>Only healthy servers rejoin.</p>", "show": ["cm", "lb", "r1", "r2", "r3", "oob", "mon"], "flow": [["r2", "mon", "#14b8a6", "metrics normal"]], "set": {"r1": {"badge": "verified (2 of 3)"}}}, {"short": "Restore", "tag": "Restore", "title": "Gradually return traffic and watch error rates and latency", "body": "<p>Roll back if metrics degrade.</p>", "flow": [["lb", "r1", "#22c55e", "traffic back"]], "set": {"r1": {"badge": null}}, "metrics": {"step": ["restore"], "capacity": ["~97%"], "risk": ["low", "good"]}}, {"short": "Close", "tag": "Close", "title": "Close the change with notes; next rack next night", "body": "<p>Rolling one failure domain at a time keeps users unaffected.</p>", "note": {"kind": "key", "text": "Plan with rollback → confirm N+1 capacity → drain → patch via out-of-band management → verify → restore gradually → document. One failure domain at a time."}}]}

## The generator that didn't start

> [!STORY] A data centre loses utility power during a storm. The UPS batteries carry the load for the planned seconds while the diesel generators start — except one generator fails its start sequence because a monthly load test had been skipped for a quarter. Half the racks go dark. The software was redundant across racks; the power path wasn't as redundant as everyone assumed. Physical operations is where "five nines" is earned or lost.

## Tiers and redundancy

Data centres are commonly rated by redundancy level (Uptime Institute Tiers I–IV):

- **N** — exactly enough capacity; any failure causes an outage.
- **N+1** — one spare component (a spare generator, chiller, UPS module).
- **2N** — two complete, independent systems (A and B power feeds), each able to carry the full load.
- **Concurrently maintainable** — any component can be taken down for maintenance without an outage. **Fault tolerant** — any single failure doesn't cause an outage.

Servers typically have **dual power supplies** connected to A and B feeds from separate distribution paths.

## Power path

**Utility feed → transformers → switchgear → UPS → PDUs → rack power strips → server PSUs**, with **diesel generators** behind an automatic transfer switch.

- **UPS** (batteries or flywheels) bridges the seconds until generators carry the load, and conditions power.
- **Generators** need fuel contracts, regular load testing, and maintenance.
- Watch **per-rack power budgets** (e.g. 8–15 kW typical, much higher for GPU racks); exceeding them trips breakers.

## Cooling

IT equipment turns almost all its power into heat. Approaches: hot-aisle/cold-aisle containment, in-row cooling, free cooling with outside air, and **liquid cooling** (direct-to-chip or immersion) for dense GPU racks. Efficiency is measured by **PUE** (power usage effectiveness = total facility power ÷ IT power); modern hyperscale sites run around 1.1–1.2.

Environmental monitoring tracks temperature, humidity, leaks and airflow per rack.

## Racks, cabling and network

- Racks have top-of-rack (ToR) switches connecting to a **leaf-spine** fabric (Networking chapter 3); critical servers have dual network links to two switches.
- Good cabling and labelling matter: wrong-cable mistakes cause outages during maintenance.
- A separate **out-of-band management network** reaches every server's **BMC** (baseboard management controller — iDRAC, iLO, IPMI, Redfish API) for remote power, console and firmware, even when the main network or OS is down.

## Hardware lifecycle

1. **Procurement and capacity planning** — forecast growth, lead times of months for hardware.
2. **Racking and provisioning** — automated: PXE boot, OS image, configuration management (Ansible, etc.), registration in inventory (CMDB/DCIM).
3. **Burn-in** — stress tests to catch early failures before production.
4. **Operation** — monitoring of SMART disk data, ECC memory errors, PSU and fan health; predictive replacement.
5. **Repair** — "remote hands" technicians swap failed disks, PSUs, DIMMs according to tickets.
6. **Decommissioning** — drain, wipe or **physically destroy** drives with certificates of destruction, update inventory, recycle responsibly.

## Planned maintenance

Every maintenance — firmware, OS patching, network upgrades, power work — follows **change management**:

- A written plan with steps, **rollback**, owner, timing and communication.
- **Risk assessment** and approval (a change advisory board for high-risk changes).
- **Maintenance windows** at low-traffic times, announced to affected teams/customers.
- **Rolling** by failure domain: drain a host, rack or zone; patch; verify; restore; move on.
- **Freeze periods** (major sales, year-end) when only emergency changes happen.

## Operational hygiene

- Patch firmware (BIOS, BMC, NIC, disk) as well as operating systems — firmware has vulnerabilities too.
- Physical security: badges, mantraps, cameras, visitor logs, escorted access, locked cages.
- Spares on site for common parts; vendor support contracts with response times.
- Regular **failover tests**: pull a power feed, fail a generator, switch network paths — under controlled conditions.

> [!RECAP]
> - Redundancy levels: N, N+1, 2N; aim for concurrent maintainability.
> - Power: utility → UPS → generators → PDUs → dual PSUs; test generators under load.
> - Cooling efficiency (PUE) and dense-rack liquid cooling.
> - Out-of-band BMC management makes remote maintenance possible.
> - Hardware lifecycle: provision, burn-in, monitor, repair, **securely decommission**.
> - Maintenance via change management: plan, rollback, drain, patch, verify, restore — one failure domain at a time.

> [!INTERVIEW] For infrastructure/SRE roles: "How would you patch 2,000 servers without downtime?", "What's N+1 vs 2N?", "What is a BMC used for?", "How do you safely decommission hardware?", "What goes in a change request?"

::quiz {"q": "What does 2N power redundancy mean?", "options": ["Two servers", "Two fully independent power systems, each able to carry the full load", "Twice the electricity bill", "Two UPS batteries"], "answer": 1, "explain": "Either path alone keeps everything running."}

::quiz {"q": "Why is out-of-band management (BMC/IPMI) valuable during maintenance?", "options": ["It speeds up the network", "It allows remote power control, console and firmware updates even when the OS is down", "It replaces backups", "It cools servers"], "answer": 1, "explain": "No site visit needed for most work."}

::quiz {"q": "What should happen to drives from decommissioned servers?", "options": ["Sell them as-is", "Securely wipe or physically destroy them and record it", "Keep them in a drawer", "Reformat quickly"], "answer": 1, "explain": "Data must not leave with the hardware."}
