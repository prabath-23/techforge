---
title: Shipping Software Safely — CI/CD, Deployment Strategies and Infrastructure as Code
summary: How top teams deploy many times a day without breaking things. Automated testing on every change (CI), automated releases (CD), the safe ways to roll out a new version (rolling, blue-green, canary, feature flags), changing a database without downtime, GitOps, and describing your whole infrastructure as code with Terraform.
---

## Speed and safety are not opposites

You might expect that teams who deploy more often break things more often. Years of research by the DORA team (published in the book *Accelerate*) found the opposite: the best-performing teams deploy **many times a day** *and* have **fewer failures** and **faster recovery**.

Why? Small, frequent changes are easy to review, easy to test, and easy to undo. A deployment containing three months of changes is terrifying: if something breaks, which of the 400 changes caused it?

> [!ANALOGY] Cleaning your kitchen a little every day vs. once a year. The daily version is never a big deal. The yearly version is a miserable, risky weekend where you might find something truly horrifying behind the fridge.

DORA measures four things: **how often** you deploy, **how long** a change takes to reach production, **how often** deployments cause failures, and **how fast** you recover. This chapter is about the tools that improve all four.

## Continuous integration (CI): test every change automatically

Every time someone pushes code, an automated **pipeline** checks it: Does it build? Do the tests pass? Is the code style consistent? Are there known security vulnerabilities in the libraries it uses?

```yaml
# .github/workflows/ci.yml  — runs on every pull request and every push to main
name: ci
on: [pull_request, push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci                                 # install exact dependency versions
      - run: npm run lint && npm run typecheck      # style and type errors
      - run: npm test                               # unit and integration tests
  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t ghcr.io/acme/web:${{ github.sha }} .   # image tagged with the exact commit
      - run: docker push ghcr.io/acme/web:${{ github.sha }}
```

A good CI pipeline is **fast** (under about 10 minutes, or people stop waiting for it) and **reliable** (tests that fail randomly teach everyone to ignore failures). Its output is an **artifact** — typically a container image — tagged with the exact commit it was built from.

**Build once, deploy that same artifact everywhere.** Test, staging and production should run the **identical** image, differing only in configuration. Rebuilding for each environment means production runs something you never tested.

### The pipeline is a target too

Attackers increasingly target the build process itself, because compromising one build can infect every customer.

> [!STORY] **The xz backdoor (2024).** Over two years, someone patiently earned the trust of the volunteer maintainer of `xz`, a small compression library used by almost every Linux system, became a co-maintainer, and slipped a cleverly hidden backdoor into the release files. It was caught by luck: a Microsoft engineer noticed that SSH logins on his machine were half a second slower than expected and dug in. It could have given the attacker a key to millions of servers.

Defenses: lock dependency versions, scan them for known vulnerabilities, give CI the minimum permissions, use short-lived cloud credentials instead of stored keys, and **sign** the images you build so production only runs images you produced.

## Continuous delivery and deployment (CD)

- **Continuous delivery:** every change that passes CI is **ready** to release; a person presses the button.
- **Continuous deployment:** every change that passes CI goes to production **automatically**.

Either way, deployment itself is automated, repeatable and **easy to roll back**.

## How to roll out a new version safely

::widget Stepper {"type":"flow","cols":3,"title":"Ways to release a new version","what":"Six release strategies, from the simplest (with downtime) to the most cautious. Each box explains how it works and what it costs.","steps":["Press Play and compare the strategies.","For each, ask: how many users are affected if the new version is broken?","Find the two strategies that separate 'deploying code' from 'turning a feature on'."],"nodes":[["Recreate","Stop the old version, start the new one. Simple, but users see downtime in between. Fine for internal tools."],["Rolling update","Replace servers a few at a time (Kubernetes' default). No downtime and no extra servers, but for a while both versions run side by side, so they must be compatible."],["Blue-green","Run two complete environments. 'Blue' serves users while you deploy 'green'; flip all traffic to green at once; flip back instantly if needed. Costs double the servers during the switch."],["Canary","Send 1%, then 5%, 25%, 100% of traffic to the new version, comparing its error rate and speed with the old version at each step, and roll back automatically if it's worse. Named after canaries that warned coal miners of gas."],["Shadow traffic","Copy real requests to the new version but throw away its answers. Tests it with production load at zero risk — as long as it doesn't send emails or charge cards."],["Feature flags","Ship the new code switched OFF, then switch it on for employees, then 5% of users, then everyone — at runtime, with no deploy. A misbehaving feature can be switched off in seconds."]]}

Big companies roll out **progressively across failure domains**: one server, then one zone, then one region, then everywhere, with automatic checks and waiting time between each step.

> [!STORY] **Why progressive rollout matters: CrowdStrike, July 2024.** A faulty update for security software running inside the Windows kernel was sent to millions of computers at essentially the same time. About 8.5 million Windows machines crashed and couldn't restart normally, grounding airlines and disrupting hospitals, banks and broadcasters worldwide. Rolling it out to 1% of machines first would have revealed the crash almost immediately, at a tiny fraction of the cost.

## Changing the database without downtime

Code can be rolled back in seconds; a database change often can't. And during a rolling update, the old and new versions of your app run **at the same time**, so the database must work with **both**.

The safe recipe is called **expand and contract**. Say you're renaming a column from `name` to `full_name`:

1. **Expand:** add the new `full_name` column (leaving `name` in place). Deploy.
2. Release code that **writes to both** columns, and **backfill** existing rows in small batches.
3. Release code that **reads from** `full_name`.
4. **Contract:** stop writing `name`; in a later release, delete it.

Each step is safe with both the previous and next version of the app. Slow, but nothing ever breaks.

> [!WARN] Some database commands lock a table while they run — on a 500-million-row table, that can mean minutes of failed requests. Learn which operations are safe online for your database (for example, PostgreSQL's `CREATE INDEX CONCURRENTLY`), and use migration tools that apply changes gradually.

## GitOps: Git as the source of truth

With **GitOps**, the desired state of every environment lives in a Git repository. A tool running inside your cluster (**Argo CD** or **Flux**) continuously makes the cluster match the repository — the same reconciliation idea as Kubernetes itself (chapter 4).

- **Deploying** = merging a pull request that changes the image version.
- **Rolling back** = reverting that commit.
- If someone changes production by hand, the tool notices the difference ("drift") and corrects it.
- Every change is reviewed and recorded in Git's history for free.

## Infrastructure as Code

Clicking around a cloud console to create servers and networks is fine once. But nobody remembers exactly what they clicked, it can't be reviewed, and recreating it in another region takes days. **Infrastructure as Code (IaC)** describes infrastructure in files that live in Git.

> [!ANALOGY] Building furniture from memory vs. from the instruction booklet. With the booklet, anyone can build an identical copy, spot a missing step, or build ten more.

**Terraform** (and its open-source fork **OpenTofu**) is the most widely used tool:

```hcl
resource "aws_s3_bucket" "uploads" {
  bucket = "acme-uploads-prod"
}

resource "aws_s3_bucket_public_access_block" "uploads" {     # never public
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

module "network" {                                          # a reusable, pre-built VPC module
  source = "terraform-aws-modules/vpc/aws"
  cidr   = "10.20.0.0/16"
  azs    = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
  private_subnets = ["10.20.1.0/24", "10.20.2.0/24", "10.20.3.0/24"]
  public_subnets  = ["10.20.101.0/24", "10.20.102.0/24", "10.20.103.0/24"]
}
```

How it works: Terraform compares your files with its record of what currently exists (the **state**) and produces a **plan** — "create these 3 things, change this 1, delete nothing" — which you review before you **apply** it.

Good practices: keep state in shared remote storage with locking (never on one person's laptop); run `terraform plan` automatically on every pull request so reviewers see the real effect; split state by environment and component so one mistake can't affect everything; and never change infrastructure by hand (it causes drift). Other tools: AWS CloudFormation, Azure Bicep, Pulumi (infrastructure in real programming languages) and Crossplane (Kubernetes-style).

> [!RECAP]
> - Frequent, small, automated deployments are **both faster and safer** (DORA research).
> - **CI** tests every change and produces one **immutable artifact**; deploy that same artifact everywhere. Protect the pipeline itself (the xz backdoor).
> - Release strategies: **rolling**, **blue-green**, **canary**, **shadow**, **feature flags**; roll out progressively (remember CrowdStrike).
> - Change databases with **expand and contract** so every step works with old and new code.
> - **GitOps** makes Git the source of truth; **Terraform** describes infrastructure as reviewable code with plan → apply.

> [!INTERVIEW] Be ready to design a CI/CD pipeline for a service (stages, artifacts, environments, approvals, rollback), compare rolling vs blue-green vs canary, explain feature flags, describe a zero-downtime database migration (expand and contract), and explain Terraform's plan/apply/state model.

::quiz {"q":"What's the main advantage of a canary release?","options":["It needs no monitoring","Only a small share of users see a broken version before automatic rollback","It's the cheapest option","It avoids database migrations"],"answer":1,"explain":"The blast radius stays small while you compare the new version's metrics against the old."}

::quiz {"q":"You need to rename a heavily used column with zero downtime. What's the right approach?","options":["Rename it during the night","Expand and contract: add the new column, write to both and backfill, switch reads, then remove the old column","Take the app offline briefly","Blue-green the database"],"answer":1,"explain":"During rollouts, old and new code run together, so every step must work with both."}

::quiz {"q":"What does `terraform plan` do?","options":["Applies changes immediately","Compares your files with the recorded state and shows what would be created, changed or deleted","Deletes unused resources","Writes your code for you"],"answer":1,"explain":"Review the plan first, then apply it."}
