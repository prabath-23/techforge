---
title: Cost Engineering (FinOps)
summary: Treating cloud cost as an engineering metric, how cloud bills are structured, making spending visible with tagging and unit economics, the biggest levers (rightsizing, autoscaling, commitments, spot, storage tiers, data transfer, architecture choices), Kubernetes cost allocation, avoiding surprise bills, and building a culture where engineers own the cost of what they build.
---

::widget Scene {"title": "Where the cloud bill really goes", "sub": "a ₹10 L/month bill, cut by 45% in five moves", "nodes": [{"id": "bill", "kind": "cells", "label": "monthly bill (₹ lakh)", "x": 3.1, "y": 3.1, "values": ["compute 5", "DB 2", "storage 1", "egress 1.2", "NAT 0.5", "other 0.3"]}], "metrics": [["move", "Change"], ["saved", "Saved / month"], ["total", "Bill"]], "steps": [{"short": "Bill", "tag": "Baseline", "title": "Break the bill down by service and team", "body": "<p>Tag every resource with team and environment. You can't cut what you can't attribute.</p>", "metrics": {"move": ["tagging"], "saved": ["-"], "total": ["₹10 L"]}}, {"short": "Idle", "tag": "Waste", "title": "Turn off what nobody uses", "body": "<p>Dev and staging run 24/7 but are used 50 hours a week. Schedule them off nights and weekends; delete orphaned disks and old snapshots.</p>", "set": {"bill": {"marks": {"0": "orange", "2": "orange"}, "ptr": {}}}, "metrics": {"move": ["schedules + cleanup"], "saved": ["₹1.3 L"]}}, {"short": "Right", "tag": "Rightsize", "title": "Rightsize: servers averaging 12% CPU", "body": "<p>Halve instance sizes where p95 usage allows. Measure before and after.</p>", "set": {"bill": {"marks": {"0": "orange"}, "ptr": {}}}, "metrics": {"move": ["rightsizing"], "saved": ["+₹1.2 L"]}}, {"short": "Commit", "tag": "Commit", "title": "Commit to the steady baseline: savings plans / reserved", "body": "<p>~30–50% off for a 1–3 year commitment on capacity you'll definitely use.</p>", "metrics": {"move": ["savings plans"], "saved": ["+₹1 L"]}}, {"short": "Spot", "tag": "Spot", "title": "Run batch and CI on spot instances", "body": "<p>Up to 70–90% cheaper; they can be reclaimed, so only for interruptible work.</p>", "metrics": {"move": ["spot for batch"], "saved": ["+₹0.4 L"]}}, {"short": "Egress", "tag": "Data transfer", "title": "Data transfer is the surprise line item", "body": "<p>Serve images through the CDN, keep chatty services in one zone, use VPC endpoints instead of NAT for S3.</p>", "set": {"bill": {"marks": {"3": "red", "4": "red"}, "ptr": {}}}, "metrics": {"move": ["CDN + endpoints"], "saved": ["+₹0.6 L"]}}, {"short": "Storage", "tag": "Storage", "title": "Lifecycle rules move old objects to cheaper tiers", "body": "<p>Logs to infrequent-access after 30 days, archive after 90, delete after a year.</p>", "set": {"bill": {"marks": {"2": "green"}, "ptr": {}}}}, {"short": "Result", "tag": "Result", "title": "Bill: ₹10 L → ₹5.5 L", "body": "<p>Same product, same performance.</p>", "set": {"bill": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green"}, "ptr": {}, "values": ["compute 2.4", "DB 1.4", "storage 0.6", "egress 0.7", "NAT 0.2", "other 0.2"]}}, "metrics": {"saved": ["₹4.5 L", "good"], "total": ["₹5.5 L", "good"]}}, {"short": "Habit", "tag": "FinOps", "title": "Make it continuous", "body": "<p>Cost per team on dashboards, budgets with alerts, cost reviewed in design docs, and unit economics (cost per order) as a metric.</p>", "note": {"kind": "key", "text": "Attribute costs, delete waste, rightsize, commit to the baseline, use spot for interruptible work, watch data transfer, tier storage, and repeat monthly."}}]}


## The bill nobody owned

> [!STORY] A startup's monthly cloud bill climbs from $40,000 to $190,000 in a year, while users grew only 50%. Nobody can explain it: the bill is a single number owned by finance, and engineers never see it. A two-week investigation finds forgotten test clusters running since a hackathon, databases sized for a launch-day spike that never came, every log line kept forever at full price, a chatty service sending terabytes between regions, and NAT gateways processing traffic that could have used free private endpoints. Fixing them cuts the bill by 45%, with no loss of performance. The lesson: **cost is a property of your architecture** and engineers are the ones who can change it.

**FinOps** is the practice of bringing financial accountability to cloud spending: engineering, finance and product making decisions together, with cost treated like latency or reliability, measured, owned and optimized.

## How cloud bills work

Most of a typical bill comes from a handful of categories:

| Category | Charged by | Common surprises |
|---|---|---|
| **Compute** (VMs, containers, functions) | Instance-hours or vCPU/GB-seconds | Idle or oversized instances; dev environments running all weekend |
| **Managed databases** | Instance size, storage, IOPS, replicas | Over-provisioned IOPS; replicas nobody reads from |
| **Storage** | GB-month by tier; requests | Old snapshots and backups; logs kept forever; millions of tiny requests |
| **Data transfer** | GB moved | Egress to the internet, between regions, **between availability zones** through NAT gateways |
| **Observability** | GB ingested, retained, indexed | Debug logs in production; high-cardinality metrics (chapter 7) |
| **Managed services** | Per request / per hour | API gateway per-request fees; per-hour charges for idle resources |

> [!WARN] **Data transfer** is the most underestimated cost. Traffic between availability zones is billed in both directions on many clouds; NAT gateways charge per GB processed; egress to the internet is expensive. A service calling another in a different zone millions of times a day can cost more than the servers themselves.

## Step 1: make costs visible

You can't optimize what you can't see or attribute.

- **Tag everything** (team, service, environment, cost center), and enforce tags with policy (chapter 11). Untagged spend is unowned spend.
- **Separate accounts/projects** per team and environment give clean attribution for free.
- **Dashboards** per team and service, reviewed regularly, cost next to latency and error rate.
- **Budgets and anomaly alerts:** notify the owning team when daily spend jumps unexpectedly.

### Unit economics

Total spend going up isn't necessarily bad, the business may be growing. The meaningful metric is **cost per unit of value**:

- Cost per 1,000 API requests, per active user, per order, per GB processed, per model inference.

> [!EXAMPLE] **Unit cost tells the real story.** Spend rose 30% last quarter. Orders rose 60%. Cost per order **fell** from ₹4.10 to ₹3.30, the system got more efficient. Another team's spend rose 10% while its traffic was flat: cost per request rose, worth investigating.

## Step 2: the big levers

::widget Stepper {"type":"hub","title":"The biggest levers for reducing cloud cost","what":"The center is the goal; each box is a lever, roughly how much it can save, and its trade-off. Most savings come from the first few.","steps":["Click the center first.","Click each lever and estimate which would matter most for your own system.","Find the lever that requires changing architecture rather than settings."],"nodes":[["Pay only for value","Most savings come from removing waste, matching capacity to demand, and paying lower prices for predictable usage, without hurting reliability or speed."],["Turn off and delete waste","Idle instances, unattached disks, old snapshots, forgotten environments, unused load balancers and IPs. Schedule dev/test environments to stop at night and on weekends (saves ~65% of their compute). Often the quickest win."],["Rightsize","Most instances run at 10–20% CPU. Downsize based on real utilization (CPU, memory, p95 not averages); move to newer, cheaper instance generations and ARM processors (often 20–40% better price-performance)."],["Autoscale","Scale out for peaks, in for quiet hours; scale to zero where possible (serverless, Cloud Run, KEDA). Pay for the load you have, not the peak you fear."],["Commitments","Savings Plans / Reserved Instances / Committed Use Discounts: commit to a baseline for 1–3 years for 30–70% off. Cover the steady baseline only, not the peaks."],["Spot / preemptible","Spare capacity at up to 90% off, reclaimable with ~2 minutes' notice. Ideal for batch jobs, CI, stateless workers and Kubernetes node pools that tolerate interruption."],["Storage tiering and retention","Lifecycle rules moving old objects to infrequent-access and archive tiers; expire logs and snapshots; compress; choose cheaper disk types where performance allows."],["Architecture","Keep chatty services in the same zone; use private endpoints instead of NAT; cache and CDN to cut egress and compute; batch work; pick the right compute model (chapter 9). The biggest long-term savings, but they need design changes."]]}

### Rightsizing in practice

Look at **utilization over weeks** including peaks: CPU, memory, network and disk. A database at 8% CPU with 70% memory use may need a different instance **family** (memory-optimized), not just a smaller size. Change gradually and watch latency.

### Commitments and spot together

A common pattern for a steady service:

- **Baseline** (the minimum you always run) on commitments, the biggest discount for predictable load.
- **Daily peaks** on on-demand instances via autoscaling.
- **Interruptible work** (batch, CI, async workers) on spot, spread across many instance types and zones so reclaims rarely hit all at once.

## Kubernetes cost

Clusters hide cost: the bill shows nodes, but the money is spent by **pods**.

- **Requests drive cost:** the scheduler reserves what pods **request** so inflated CPU/memory requests waste node capacity even if actual usage is low. Rightsize requests using real usage (Vertical Pod Autoscaler recommendations, Goldilocks).
- **Bin-packing:** cluster autoscalers (Karpenter, Cluster Autoscaler) choose node sizes and remove underused nodes; consolidate small pods onto fewer nodes.
- **Spot node pools** for tolerant workloads; ARM node pools.
- **Allocation:** tools like OpenCost/Kubecost attribute node, storage and network cost to namespaces, labels and teams.

## Avoiding surprise bills

- **Budgets and anomaly detection** on every account, with alerts to owners, not just finance.
- **Service quotas** and organization policies that prevent unexpected expensive resources (e.g. large GPU instances outside approved accounts, chapter 11).
- **Cost estimates in pull requests:** tools like Infracost comment "this change adds ~$1,200/month" on Terraform changes, so cost is reviewed like code.
- Watch for **runaway loops:** a function triggering itself by writing to the bucket it listens on; recursive retries; logging inside a hot loop.

## Building the culture

- **Engineers see and own** their service's cost and unit cost.
- **Cost is a design input:** design reviews include rough cost estimates (System Design track, chapter 1's estimation skills apply directly).
- **Regular reviews** of top spenders and anomalies, with clear owners for each action.
- **Celebrate savings** like performance wins, and never cut costs at the expense of reliability or security without an explicit decision.

> [!NOTE] **Cost and carbon go together.** Idle and oversized resources waste energy as well as money. Rightsizing, autoscaling, efficient ARM instances and choosing regions with cleaner grids reduce both; cloud providers publish carbon footprint tools per account.

> [!RECAP]
> - FinOps makes cloud cost a shared, measured **engineering metric**.
> - Bills are driven by compute, databases, storage, **data transfer** (often underestimated), observability and managed services.
> - Make cost **visible**: tags, accounts per team, dashboards, budgets, anomaly alerts, and **unit economics**.
> - Levers: delete waste, schedule non-production, **rightsize** **autoscale** **commitments** for baselines, **spot** for interruptible work, **storage tiering** and **architecture** changes (zones, endpoints, caching).
> - In Kubernetes, **requests** drive cost; bin-pack, rightsize and allocate cost to teams.
> - Prevent surprises with quotas, policies and **cost checks in pull requests**.

> [!INTERVIEW] Senior and cloud interviews ask how you'd reduce a cloud bill, the trade-offs of reserved vs spot vs on-demand, why cross-zone traffic and NAT gateways get expensive, and how to estimate the cost of a design.

::quiz {"q":"Which pricing fits a steady baseline that runs 24/7 for years?","options":["Spot","Commitments (Savings Plans / Reserved / CUDs)","On-demand only","Free tier"],"answer":1,"explain":"Commit for the predictable baseline; use on-demand and spot for the rest."}

::quiz {"q":"Total cloud spend rose 30% while orders rose 60%. What happened to efficiency?","options":["It got worse","It improved, cost per order fell","No change","Can't tell"],"answer":1,"explain":"Unit economics matter more than total spend."}

::quiz {"q":"In Kubernetes, what mainly determines how many nodes you pay for?","options":["Actual CPU usage only","Pods' resource requests, which the scheduler reserves","The number of namespaces","Image sizes"],"answer":1,"explain":"Inflated requests waste capacity even when usage is low."}
