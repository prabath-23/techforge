---
title: Cloud Security — IAM, Secrets, Guardrails and Compliance
summary: Securing what you run in AWS, GCP or Azure — the shared responsibility model, how cloud accounts actually get breached, designing IAM with roles and least privilege, organization-wide guardrails, secrets and key management, network exposure, detection with audit logs, posture management, and what compliance frameworks like SOC 2 and PCI DSS ask of engineers.
---

## A key on GitHub, a bill for ₹40 lakh

> [!STORY] A developer pushes a small side project to a public GitHub repository. Buried in a config file is an AWS access key with administrator permissions. Within minutes — before the developer has even closed their laptop — automated bots find the key, log in, and start hundreds of GPU instances across every region to mine cryptocurrency. By morning, the bill is tens of thousands of dollars. Stories like this happen every week. In the cloud, the most common breaches aren't sophisticated attacks on the provider's infrastructure; they're **misconfigurations and leaked credentials** in the customer's own account.

## The shared responsibility model

The cloud provider secures the **infrastructure**: data centers, hardware, hypervisors, the global network and the managed services themselves. **You** secure what you put **in** the cloud: identities and permissions, data, network exposure, operating systems on your VMs, application code and configuration.

> [!ANALOGY] Renting a flat in a secure building. The landlord handles the building's walls, front-door guard, fire alarms and lifts. But if you leave your own door unlocked or give copies of your key to strangers, that's on you. Most cloud breaches are unlocked doors, not broken walls.

The more managed the service, the more the provider handles: for a VM you patch the OS; for a serverless function you only secure your code and permissions.

## How cloud accounts actually get breached

1. **Leaked long-lived credentials** — keys in code, CI logs, laptops, Docker images.
2. **Over-permissive IAM** — roles with `*:*`, letting one compromised component reach everything.
3. **Public exposure** — storage buckets, databases, admin panels or snapshots open to the internet.
4. **Application vulnerabilities** used to reach cloud credentials — SSRF to the metadata service (Capital One — chapter 5).
5. **Compromised human accounts** — phished console logins without strong MFA.
6. **Unpatched, internet-facing VMs.**

The defenses below map directly onto these.

## IAM: the new perimeter

In the cloud, **identity is the perimeter** — every API call is authorized by IAM, so IAM design matters more than any firewall.

### Principles

- **No long-lived keys** for workloads. Use **roles**: EC2 instance profiles, EKS IRSA / Pod Identity, GKE Workload Identity, Lambda execution roles. Credentials are short-lived and rotated automatically.
- **No long-lived keys for CI either:** GitHub Actions and other CI systems can exchange their **OIDC token** for short-lived cloud credentials (workload identity federation).
- **Humans use SSO** (IAM Identity Center, Google Workspace/Entra ID) with phishing-resistant MFA, assuming roles per task — never personal access keys.
- **Least privilege:** start narrow; use access analysers and "last used" data to remove unused permissions.
- **Separate accounts/projects** per environment and workload, so a mistake or breach in one can't touch others (the strongest boundary the cloud offers).
- Protect the **root/owner account** with hardware MFA and never use it day to day.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::acme-thumbnails/*",
    "Condition": { "StringEquals": { "aws:PrincipalTag/team": "media" } }
  }]
}
```

## Guardrails at the organization level

Individual policies can be wrong; **guardrails** apply to every account and can't be overridden by account admins:

::widget Stepper {"type":"layers","title":"Layers of cloud guardrails, from organization down to resource","what":"Controls that apply at each level of a cloud organization. Higher layers set limits that lower layers cannot exceed.","steps":["Press Play from the top (the whole organization) down.","For each layer, think of one mistake it would prevent.","Find the layer that would have stopped the crypto-mining story."],"nodes":[["Organization policies (SCPs / Org Policy)","Hard limits for every account: 'no one may disable CloudTrail', 'only these regions may be used', 'no public S3 buckets', 'no IAM user access keys', 'no GPU instances outside the ML account'. Even an account administrator can't override them."],["Account structure","Separate accounts/projects for production, staging, development, security tooling, logging and each workload. Logs and backups live in accounts few people can access."],["Identity and roles","SSO with MFA for people; roles for workloads; permission boundaries so teams can create roles without escalating beyond limits."],["Network","Private subnets by default, no public IPs on servers, security groups referencing each other, private endpoints for cloud services, egress controls (chapter 5)."],["Resource policies and encryption","Bucket and key policies, block public access, encryption with KMS keys whose use is logged, object lock for backups."],["Detection","Audit logs from every account, threat detection, posture scanning and alerts — the safety net when everything above has a gap."]]}

The story above would have been stopped at several layers: an org policy forbidding IAM user access keys, a region restriction, a GPU limit outside the ML account, and a billing anomaly alert.

## Secrets and keys

- **Secrets managers** (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault): store database passwords and API keys; inject at runtime; **rotate automatically**.
- **KMS** for encryption keys with envelope encryption (Security track, chapter 2); restrict and log every use of a key.
- **Secret scanning** in repositories and CI (GitHub secret scanning, gitleaks, trufflehog); pre-commit hooks.
- If a secret leaks: **revoke/rotate first**, then investigate what it was used for in audit logs (Security track, chapter 8).

## Network exposure

- Nothing internet-facing unless intended: no public IPs on servers; databases only in private subnets; admin interfaces behind SSO-protected access proxies.
- **Private endpoints** for cloud services; **egress filtering** to stop data exfiltration and malware call-backs.
- A **WAF** and DDoS protection in front of public applications (Networking track, chapter 12).
- **IMDSv2** (or equivalent) required on all VMs to blunt SSRF.

## Detection and response

- **Audit logs everywhere:** CloudTrail / Cloud Audit Logs / Azure Activity Log for every account and region, shipped to a dedicated, locked-down logging account.
- **Threat detection:** GuardDuty, Security Command Center, Microsoft Defender for Cloud — flag unusual API calls, credential use from new locations, crypto-mining, known malicious IPs.
- **Billing anomaly alerts** — often the fastest signal of abuse.
- Playbooks for common incidents: leaked key, public bucket, compromised instance.

## Posture management and policy as code

Hundreds of accounts and thousands of resources can't be checked by hand.

- **Cloud security posture management (CSPM)** continuously scans for misconfigurations: public buckets, unencrypted volumes, security groups open to `0.0.0.0/0`, unused admin roles (AWS Security Hub, Wiz, Prisma Cloud, open-source Prowler).
- **Policy as code in CI:** check Terraform plans before they're applied (Checkov, tfsec/Trivy, OPA/Conftest) — "this change would make a bucket public" fails the pull request.
- **Kubernetes admission policies** (Kyverno, OPA Gatekeeper): reject privileged containers, unsigned images, missing resource limits.

> [!EXAMPLE] **Shifting left.** A developer opens a pull request adding an S3 bucket for user uploads. CI runs `terraform plan` and Checkov, which flags that the bucket lacks block-public-access and encryption settings. The developer fixes it before merging. The misconfiguration never reaches production — far cheaper than finding it in a breach report.

## Compliance: what engineers need to know

Customers and regulators often require certifications. They mostly formalize the practices above:

- **SOC 2:** controls for security, availability and confidentiality, audited over time — access reviews, change management, logging, incident response, vendor management.
- **ISO 27001:** an information security management system with risk assessments and controls.
- **PCI DSS:** for card payment data — minimize scope (tokenize cards so most systems never see them), segment networks, encrypt, log and test.
- **HIPAA** (US health data), **GDPR** (EU personal data), India's **DPDP Act**: data minimization, consent, deletion rights, breach notification, sometimes data residency.

Engineering habits that make audits easy: everything in infrastructure as code, peer-reviewed changes, centralized logs, automated evidence collection, and least-privilege access with regular reviews.

> [!RECAP]
> - **Shared responsibility:** the provider secures the cloud; you secure what's in it — and most breaches are customer misconfigurations and leaked credentials.
> - **IAM is the perimeter:** roles not keys, CI via OIDC federation, SSO + MFA for humans, least privilege, separate accounts.
> - **Guardrails:** organization policies, account structure, permission boundaries, private networking, encryption, detection.
> - **Secrets managers and KMS**, secret scanning, rotate on leak.
> - **Detect** with audit logs, threat detection and billing anomalies; **prevent** with CSPM and policy as code in CI.
> - **Compliance** (SOC 2, ISO 27001, PCI DSS, GDPR/DPDP) formalizes the same practices.

> [!INTERVIEW] Expect: the shared responsibility model; how you'd give an app or CI pipeline cloud access without keys; how to prevent public buckets across hundreds of accounts; what you'd do if an access key leaked; and how least privilege is achieved in practice.

::quiz {"q":"Under the shared responsibility model, who is responsible for an S3 bucket being publicly readable by mistake?","options":["The cloud provider","The customer","Nobody","The internet service provider"],"answer":1,"explain":"Configuration of your resources is your responsibility."}

::quiz {"q":"How should a GitHub Actions pipeline get AWS credentials?","options":["Store an admin access key as a secret","Exchange its OIDC token for short-lived role credentials (workload identity federation)","Use the root account","Hard-code a key in the workflow"],"answer":1,"explain":"No long-lived keys to leak."}

::quiz {"q":"What can an organization-level policy (SCP) do that an account admin can't undo?","options":["Nothing","Enforce hard limits like 'CloudTrail can't be disabled' or 'no public buckets' across every account","Speed up instances","Lower prices"],"answer":1,"explain":"Guardrails sit above account-level permissions."}
