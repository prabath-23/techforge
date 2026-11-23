---
title: Cloud Building Blocks: Regions, Private Networks, Compute, Storage and Permissions
summary: A guided tour of the pieces every cloud architecture is built from, regions and availability zones, private networks (VPCs) with public and private subnets, firewalls, the spectrum of compute from VMs to serverless functions, the three kinds of storage, managed databases, permissions (IAM) and the mistakes that cause breaches, plus where the money goes.
---

::widget Scene {"title": "A secure cloud network: public and private subnets", "sub": "a request in, a software update out", "nodes": [{"id": "u", "kind": "user", "label": "Users", "x": 3.72, "y": 3.72}, {"id": "igw", "kind": "router", "label": "Internet gateway", "x": 7.32, "y": 0.12, "color": "blue"}, {"id": "alb", "kind": "router", "label": "Load balancer (public subnet)", "x": 7.82, "y": -6.58, "color": "blue"}, {"id": "nat", "kind": "router", "label": "NAT gateway (public)", "x": 14.33, "y": -0.07, "color": "orange"}, {"id": "app", "kind": "server", "label": "App servers (private subnet)", "x": 14.72, "y": -7.28, "color": "purple"}, {"id": "db", "kind": "db", "label": "Database (private, no route out)", "x": 18.52, "y": -11.08, "color": "purple"}], "links": [["u", "igw"], ["igw", "alb"], ["alb", "app"], ["app", "db"], ["app", "nat"], ["nat", "igw"]], "metrics": [["sg", "Security group rule"], ["path", "Path"], ["ok", "Allowed?"]], "steps": [{"short": "VPC", "tag": "VPC", "title": "A VPC: your own private network, 10.0.0.0/16", "body": "<p>Split into subnets in each availability zone. A subnet is \"public\" only if its route table points to the internet gateway.</p>", "show": ["igw", "alb", "nat", "app", "db"], "metrics": {"sg": ["-"], "path": ["-"], "ok": ["-"]}}, {"short": "In", "tag": "Inbound", "title": "A user request reaches the load balancer", "body": "<p>Only the load balancer has a public address.</p>", "show": ["u", "igw", "alb", "nat", "app", "db"], "flow": [[["u", "igw", "alb"], "#3b82f6", "HTTPS 443"]], "metrics": {"sg": ["LB: allow 443 from anywhere"], "path": ["internet → LB"], "ok": ["yes", "good"]}}, {"short": "App", "tag": "Inbound", "title": "LB forwards to app servers in a private subnet", "body": "<p>App servers accept traffic only from the load balancer's security group.</p>", "flow": [["alb", "app", "#3b82f6", ":8080"]], "metrics": {"sg": ["App: allow 8080 from LB SG"], "path": ["LB → app"]}}, {"short": "Direct", "tag": "Blocked", "title": "Someone tries to reach an app server directly", "body": "<p>No public IP, no route, and the security group would refuse anyway.</p>", "flow": [["u", "igw", "#ef4444", "to 10.0.2.15?"]], "metrics": {"path": ["internet → app"], "ok": ["impossible", "good"]}}, {"short": "DB", "tag": "Data tier", "title": "App queries the database", "body": "<p>Database security group: allow 5432 only from the app security group. Referencing groups, not IPs, keeps rules correct as servers come and go.</p>", "flow": [["app", "db", "#a855f7", ":5432"]], "metrics": {"sg": ["DB: allow 5432 from App SG"], "path": ["app → DB"], "ok": ["yes"]}}, {"short": "Out", "tag": "Outbound", "title": "App servers need to download a security update", "body": "<p>They go out through the NAT gateway, which hides them behind its public IP.</p>", "flow": [[["app", "nat", "igw"], "#f59e0b", "apt update"]], "metrics": {"path": ["app → NAT → internet"], "ok": ["outbound only"]}}, {"short": "NoIn", "tag": "Outbound", "title": "NAT allows replies but never new inbound connections", "body": "<p>So private servers can fetch updates without being reachable.</p>"}, {"short": "Endpoints", "tag": "Private access", "title": "Reach S3 without the internet: a VPC endpoint", "body": "<p>Traffic to cloud services stays on the provider's network, cheaper NAT bills and no internet exposure.</p>"}, {"short": "Zones", "tag": "Resilience", "title": "Duplicate everything across availability zones", "body": "<p>Subnets, app servers and a database standby in at least two zones, so one data-centre outage isn't yours.</p>", "note": {"kind": "key", "text": "Public subnets hold only entry points (LB, NAT). App and data tiers live in private subnets. Security groups reference each other to allow exactly the needed paths."}}]}


## Renting a data center by the minute

Twenty years ago, launching a website meant buying servers, waiting weeks for delivery, and renting space in a data center. Today you can create servers, databases and global networks in minutes, pay by the second, and delete them when you're done. That's the cloud: Amazon Web Services (AWS), Google Cloud (GCP) and Microsoft Azure are the biggest providers.

The names differ between providers, but the building blocks are the same. This chapter tours them, using AWS names with the equivalents noted.

## Where things physically run: regions and zones

- A **region** is a geographic area, Mumbai (`ap-south-1`), Virginia (`us-east-1`), Frankfurt.
- Each region contains several **availability zones (AZs)**: separate data centers with independent power, cooling and networking, a few kilometers apart and connected by very fast links.

> [!ANALOGY] A region is a city; availability zones are separate hospitals in that city, on different power grids. A fire in one hospital doesn't affect the others, and they're close enough to transfer patients quickly.

**Run every important component in at least two or three zones.** Then a whole data center failing, a fire, a flood, a power cut, doesn't take you down. Use several **regions** to survive a regional disaster, to be close to users on other continents, or to keep data inside a country as the law requires.

## Your own private network: the VPC

A **VPC** (virtual private cloud, called a "VNet" on Azure) is your own isolated network inside the cloud. You choose its address range (for example `10.0.0.0/16`, Networking track, chapter 2), divide it into **subnets** and control exactly what can reach what.

The classic layout has three tiers, repeated in each availability zone:

::widget Stepper {"type":"layers","title":"A standard secure layout for a web app's network","what":"The layers of a typical cloud network, from the internet inward. Each deeper layer is harder to reach from outside.","steps":["Press Play from the internet down.","Notice that only the top subnet can be reached directly from the internet.","Find how private servers download updates without being reachable from outside (the NAT gateway)."],"nodes":[["The internet","Users reach your app only through the load balancer's public address."],["Public subnets","These subnets have a route to the internet gateway. They hold only the load balancer and the NAT gateways, never your application servers."],["Private app subnets","No route in from the internet at all. Your app servers or Kubernetes machines live here. To download updates, they go OUT through the NAT gateway, which doesn't allow anything to come back in uninvited."],["Private data subnets","Databases and caches. Their firewall rules allow connections only from the app servers. No route to the internet whatsoever."],["Private endpoints","Private connections from your network to cloud services like S3 storage, so that traffic never touches the public internet (and avoids NAT gateway charges)."]]}

Key pieces:

- **Subnets:** a slice of your address range in one zone. Whether a subnet is "public" or "private" is decided only by its **route table**.
- **Internet gateway:** lets resources with public addresses talk to the internet.
- **NAT gateway:** lets private servers make **outbound** connections (to download updates or call external APIs) without being reachable from outside (Networking track, chapter 2).
- **Security groups:** firewall rules attached to each server. They're **stateful** if a connection is allowed in, its replies are automatically allowed out. Best of all, rules can refer to **other security groups**: "allow port 5432 only from servers in the 'app' security group", which keeps working however many servers come and go.
- **Peering, transit gateways, VPNs and dedicated links** connect your VPC to other VPCs or to your office.

> [!WARN] Plan your address ranges so they **don't overlap** across all your VPCs and offices from the start. Two networks using the same addresses can't easily be connected later, and fixing it means renumbering everything.

## Compute: from full servers to single functions

| Option | What you get | You manage | Good for |
|---|---|---|---|
| **Virtual machines** (EC2, Compute Engine) | A full server | The OS and everything on it | Full control, special software, long-running workloads |
| **Managed Kubernetes** (EKS, GKE, AKS) | A cluster for containers | Your containers (and node settings) | Many services, portability between clouds |
| **Serverless containers** (Cloud Run, AWS Fargate) | Just run this container | Your container | Web services and APIs, scaling to zero when idle |
| **Functions** (AWS Lambda, Cloud Functions) | Just run this function on each event | Your code | Event-driven glue: "resize the image when it's uploaded" |

**Serverless functions** are wonderful for spiky or occasional work: no servers to patch, automatic scaling, and you pay nothing when idle. The trade-offs: a **cold start** delay when a new instance spins up (from tens of milliseconds to seconds), time limits per run, and per-request pricing that becomes expensive under constant heavy load.

**How you pay:**

- **On-demand:** by the second, no commitment, the highest price.
- **Commitments** (Savings Plans, reserved instances): commit to one or three years for 30–70% off.
- **Spot instances:** spare capacity at up to 90% off, but the cloud can take it back with about two minutes' warning. Perfect for work that can be interrupted and retried: batch jobs, CI builds, data processing.

> [!NOTE] ARM-based processors (AWS Graviton, Google Axion, Azure Cobalt) usually give noticeably better price-performance for typical web workloads. Many teams switch simply by building their containers for ARM.

## Storage: three different kinds

| Kind | Think of it as | Examples | Used for |
|---|---|---|---|
| **Block storage** | A virtual hard drive attached to one server | EBS, Persistent Disk | A VM's disk, databases you run yourself |
| **File storage** | A shared network drive | EFS, Filestore, Azure Files | Many servers sharing the same files |
| **Object storage** | A bottomless bucket of files addressed by name, over HTTP | **S3** Google Cloud Storage, Azure Blob | Photos, videos, backups, logs, data lakes, static websites |

**Object storage** is the backbone of the cloud. It's practically unlimited, extremely durable (S3 is designed so you'd lose roughly one object in 10,000 years out of 10 million stored), cheap, and automatically spread across zones. A few features worth knowing:

- **Storage classes:** cheaper tiers for rarely accessed data (archives can cost a fraction of the standard price), with **lifecycle rules** that move or delete objects automatically after N days.
- **Pre-signed URLs:** your server generates a temporary, single-use link, and the user's browser or phone uploads or downloads directly from storage, huge files never pass through your servers.
- **Versioning and object lock** protect against accidental deletion and ransomware.

> [!EXAMPLE] **The public bucket disaster.** Over the years, many companies have leaked millions of customer records by accidentally making a storage bucket **public**. It's one of the most common cloud breaches. Cloud providers now block public access by default, keep it that way unless you're deliberately hosting public files.

## Managed databases and services

Instead of installing and babysitting your own database, you can rent one that the provider patches, backs up, replicates and fails over for you: relational (RDS, Aurora, Cloud SQL, AlloyDB), key-value and document (DynamoDB, Firestore, Cosmos DB), caches (ElastiCache / Memorystore for Redis), search (OpenSearch), queues and streams (SQS, Pub/Sub, Kinesis, managed Kafka), data warehouses (BigQuery, Redshift, Snowflake). Paying a bit more to avoid running these yourself is usually the right call.

## Permissions: IAM

**IAM** (identity and access management) decides **who** can do **what** on **which resources**:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::acme-uploads/user-photos/*"
}
```

This policy allows reading files only under `user-photos/` in one bucket, nothing else.

Rules to live by:

- **Least privilege:** grant only the exact actions on the exact resources needed.
- **No long-lived keys in code or on laptops.** Let servers, containers and CI pipelines **assume roles** that hand out short-lived credentials automatically. Leaked access keys, pushed to GitHub by accident, are one of the most common causes of cloud breaches; bots scan GitHub for them within minutes.
- **Separate accounts/projects** for production, staging and development, so a mistake in one can't touch another.
- **Turn on multi-factor authentication** for every human, and log every action (CloudTrail, Cloud Audit Logs).

> [!STORY] **The Capital One breach (2019).** An attacker found a flaw that let them make one of the bank's servers send requests on their behalf (server-side request forgery). They pointed it at the cloud's internal **metadata service** which hands out temporary credentials to servers, and got the server's credentials. Those credentials had permission to read far more storage than the server needed. About 100 million customers' data was exposed. Two lessons: grant least privilege, and use the newer metadata service version (IMDSv2) that blocks this trick.

## Where the money goes

Cloud bills surprise people. The usual suspects:

- **Oversized or forgotten resources:** servers bigger than needed, test environments nobody turned off, old disks and snapshots.
- **Data transfer:** moving data **out** to the internet, **between regions** and even between zones costs money. NAT gateways charge per gigabyte processed.
- **Logs and metrics** kept forever at full detail.

Habits that help: tag every resource with its team and project; set budgets and anomaly alerts; right-size and autoscale; use commitments for steady workloads and spot instances for interruptible ones; move cold data to cheaper storage classes. Managing this is a whole discipline called **FinOps**.

> [!RECAP]
> - **Regions** are geographic areas; **availability zones** are independent data centers within them, always use at least two.
> - A **VPC** is your private network: public subnets for load balancers, private subnets for apps and databases, **NAT gateways** for outbound access, **security groups** as firewalls.
> - Compute ranges from **VMs** to **Kubernetes** **serverless containers** and **functions**; pricing from on-demand to commitments to **spot**.
> - Storage: **block** (a disk), **file** (a shared drive), **object** (S3, the cloud's backbone; never make buckets public by accident).
> - **IAM**: least privilege, roles instead of keys, separate accounts, MFA, audit logs.
> - Watch costs: idle resources, data transfer, NAT gateways, logs.

> [!INTERVIEW] In cloud-flavored design questions, show multi-zone placement; a VPC with public and private subnets; security groups that reference each other; private endpoints; roles instead of keys; the right compute model with a reason; object storage with pre-signed uploads; and awareness of cost drivers like data transfer.

::quiz {"q":"What makes a subnet 'public' in AWS?","options":["Its name","Its route table sends internet traffic to an internet gateway","It contains a NAT gateway","It uses public IP ranges"],"answer":1,"explain":"Public vs private is purely a matter of routing."}

::quiz {"q":"How should a phone app upload a 2 GB video to S3 without sending it through your API servers?","options":["Put AWS keys inside the app","Have your backend generate a pre-signed URL, and the app uploads directly to S3","Make the bucket public","Email it"],"answer":1,"explain":"A pre-signed URL grants temporary permission for one specific upload."}

::quiz {"q":"Which practice most directly reduces the damage from a stolen server credential?","options":["Bigger servers","Least-privilege IAM: the server's role can only do exactly what it needs","More availability zones","Spot instances"],"answer":1,"explain":"Capital One's breach was so large because the stolen credentials had far more access than needed."}
