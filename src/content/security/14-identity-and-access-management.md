---
title: Identity and Access Management (IAM): Identities, Federation, Lifecycle, Cloud IAM and Privileged Access
summary: IAM from end to end: identities for people, workloads and devices; directories and identity providers; SSO with SAML and OIDC; MFA and conditional access; provisioning with SCIM and joiner-mover-leaver processes; access reviews; cloud IAM policies and how AWS evaluates them; workload identity without secrets; and privileged access management with just-in-time elevation.
---

::widget Scene {"title": "How AWS decides: allow or deny?", "sub": "one API call evaluated against every policy type", "nodes": [{"id": "req", "kind": "laptop", "label": "Request: s3:GetObject on payroll/report.csv", "x": 3.72, "y": 3.72}, {"id": "scp", "kind": "doc", "label": "Org SCP (guardrail)", "x": 2.52, "y": -7.48, "color": "red"}, {"id": "id", "kind": "doc", "label": "Identity policy (role)", "x": 6.86, "y": -3.14, "color": "blue"}, {"id": "res", "kind": "doc", "label": "Resource policy (bucket)", "x": 11.2, "y": 1.2, "color": "purple"}, {"id": "pb", "kind": "doc", "label": "Permission boundary / session policy", "x": 15.54, "y": 5.54, "color": "orange"}, {"id": "dec", "kind": "cube", "label": "Decision", "x": 13.72, "y": -6.28, "color": "green"}], "links": [["req", "scp"], ["req", "id"], ["req", "res"], ["req", "pb"], ["scp", "dec"], ["id", "dec"], ["res", "dec"], ["pb", "dec"]], "metrics": [["check", "Check"], ["result", "Result"]], "steps": [{"short": "Default", "tag": "Default", "title": "Everything starts as an implicit deny", "body": "<p>Nothing is allowed unless some policy allows it.</p>", "show": ["req", "dec"], "set": {"dec": {"badge": "implicit deny"}}, "metrics": {"check": ["default"], "result": ["deny"]}}, {"short": "Explicit", "tag": "Explicit deny", "title": "Any explicit Deny anywhere wins immediately", "body": "<p>Evaluated across all applicable policies. Deny beats Allow, always.</p>", "metrics": {"check": ["explicit deny?"], "result": ["none found"]}}, {"short": "SCP", "tag": "Guardrails", "title": "Organisation SCPs must allow the action", "body": "<p>Service control policies set the maximum for whole accounts (e.g. \"no actions outside ap-south-1\"). They grant nothing by themselves.</p>", "show": ["req", "dec", "scp"], "flow": [["scp", "dec", "#ef4444", "allowed in this region"]], "metrics": {"check": ["SCP"], "result": ["within guardrail"]}}, {"short": "Identity", "tag": "Identity policy", "title": "The role's identity policy allows s3:GetObject on payroll/*", "body": "<p>Attached to the user, group or role making the call.</p>", "show": ["req", "dec", "scp", "id"], "flow": [["id", "dec", "#3b82f6", "Allow"]], "metrics": {"check": ["identity policy"], "result": ["allow"]}}, {"short": "Resource", "tag": "Resource policy", "title": "The bucket policy also matters, especially cross-account", "body": "<p>Same account: either identity or resource policy can allow. Cross-account: both sides must allow.</p>", "show": ["req", "dec", "scp", "id", "res"], "flow": [["res", "dec", "#a855f7", "no deny"]], "metrics": {"check": ["resource policy"], "result": ["ok"]}}, {"short": "Bound", "tag": "Limits", "title": "Permission boundaries and session policies cap what the role can do", "body": "<p>The effective permission is the intersection: identity ∩ boundary ∩ session ∩ SCP.</p>", "show": ["req", "dec", "scp", "id", "res", "pb"], "flow": [["pb", "dec", "#f59e0b", "within cap"]], "metrics": {"check": ["boundaries"], "result": ["within limits"]}}, {"short": "Cond", "tag": "Conditions", "title": "Conditions add context: MFA present, source VPC, tags match", "body": "<p>\"Allow only if aws:PrincipalTag/team == resource tag team\" (attribute-based access).</p>", "metrics": {"check": ["conditions"], "result": ["MFA ✓, tag match ✓"]}}, {"short": "Allow", "tag": "Decision", "title": "All checks pass → Allow", "body": "<p>And the call is logged in CloudTrail with the principal, role session and source.</p>", "set": {"dec": {"badge": "ALLOW"}}, "metrics": {"result": ["allow", "good"]}}, {"short": "Debug", "tag": "Debugging", "title": "AccessDenied? Check in this order", "body": "<p>Explicit denies (SCP, boundary, resource) → missing allow → cross-account resource policy → conditions → KMS key policy for encrypted objects. Policy simulators and access analysers help.</p>", "note": {"kind": "key", "text": "Explicit deny wins; otherwise an allow is needed, and it must survive SCPs, boundaries, session policies and conditions. Cross-account needs both sides to allow."}}]}

## The leaver who still had access

> [!STORY] An engineer leaves a company. HR updates its system; IT disables the main account. Six months later an audit finds that their personal access key to the production cloud account still works, they're still an owner of two SaaS tools that weren't connected to single sign-on, and a service account they created has admin rights with a password nobody remembers. Identity and access management is about getting identities, permissions and their lifecycle right *everywhere*, because attackers increasingly log in rather than break in.

## Identities

- **Workforce identities** employees and contractors.
- **Customer identities (CIAM)** users of your product (Security chapter 3 covers login methods).
- **Workload identities** services, CI pipelines, scripts, containers.
- **Devices** laptops and phones whose health can be part of access decisions.

The **identity provider (IdP)** Microsoft Entra ID, Okta, Google, Ping, or Keycloak, is the source of truth, often synced from an HR system.

## Authentication and federation

- **SSO** lets users authenticate once at the IdP and access many apps through **SAML 2.0** (XML assertions, common in enterprise SaaS) or **OpenID Connect** (OAuth 2.0-based, JSON tokens, common for modern apps).
- **MFA** prefer phishing-resistant methods (passkeys, FIDO2 security keys) over SMS and push-approval, which suffer from SIM swapping and MFA-fatigue attacks.
- **Conditional access** policies that consider user, group, device compliance, location, risk score and application sensitivity: "admins must use a compliant device and a security key".

## Authorisation models

RBAC, ABAC and relationship-based access (Security chapter 4) decide *what* each identity may do. In practice: roles for broad job functions, attributes and conditions for context, and fine-grained sharing inside applications.

## The identity lifecycle: joiner, mover, leaver

1. **Joiner** HR creates the person; the IdP creates the account and **provisions** access to apps automatically via **SCIM** based on department and role.
2. **Mover** changing team should *remove* old access, not just add new access. Accumulated permissions ("privilege creep") are a top audit finding.
3. **Leaver** disable the account, revoke sessions and tokens, deprovision from apps via SCIM, transfer ownership of resources, rotate shared secrets they knew.

**Access reviews** (certifications) periodically ask managers and resource owners to confirm each user still needs each access, with automatic removal if not confirmed.

## Cloud IAM

Cloud providers have their own IAM systems. In AWS:

- **Principals:** users (avoid for humans), **roles** (assumed for temporary credentials), federated identities.
- **Policies:** identity-based, resource-based (bucket, queue, KMS key), **SCPs** at the organisation level, **permission boundaries** session policies.
- **Evaluation:** explicit Deny wins; otherwise an Allow is needed and must survive SCPs, boundaries and session policies; cross-account access needs both sides (see lesson).
- **Conditions:** MFA, source IP/VPC, tags (ABAC), time.

Azure uses role assignments at management group/subscription/resource-group scopes; GCP binds roles to principals on resources in a hierarchy. Same ideas, different shapes.

### Workload identity without secrets

Long-lived access keys leak (Cloud chapter 11). Instead:

- VMs and functions get **instance roles**; Kubernetes pods get identities via service-account federation (IRSA, Workload Identity).
- CI pipelines use **OIDC federation**: the CI provider issues a signed token per job, and the cloud exchanges it for short-lived credentials restricted to that repository and branch.
- Service-to-service calls inside a mesh use **mTLS identities** (SPIFFE).

## Privileged access management (PAM)

Admin rights are the attacker's goal. Controls:

- **Separate admin accounts** from daily accounts.
- **Just-in-time (JIT)** elevation, request admin for 1 hour with a reason and approval, instead of standing admin.
- **Vaulted credentials** for shared and break-glass accounts, rotated after each use.
- **Session recording** for privileged sessions.
- **Break-glass accounts** for when the IdP is down, few, monitored, tested.

## Detecting identity attacks

Identity threat detection watches for: impossible travel, MFA fatigue, new MFA device registration followed by sensitive actions, consent grants to malicious OAuth apps, token theft and replay, Kerberoasting and other Active Directory attacks, and dormant accounts suddenly active. These signals feed the SIEM (chapter 11).

> [!RECAP]
> - Identities: workforce, customers, workloads, devices; the **IdP** is the source of truth.
> - **SSO** via SAML/OIDC, phishing-resistant **MFA** **conditional access** on device and risk.
> - **Joiner–mover–leaver** with SCIM provisioning and regular **access reviews**.
> - Cloud IAM: roles over users; explicit deny wins; SCPs and boundaries cap permissions; conditions add context.
> - Workloads use **federated, short-lived credentials** not keys.
> - **PAM**: separate admin accounts, just-in-time elevation, vaulting, recording, tested break-glass.

> [!INTERVIEW] "How does AWS policy evaluation work?", "SAML vs OIDC?", "How do you handle leavers across 200 SaaS apps?", "How would you give CI access to the cloud without secrets?", "What is just-in-time access?", "How do you detect account takeover?"

::quiz {"q": "In AWS, an identity policy allows an action but an SCP denies it. Result?", "options": ["Allowed", "Denied, explicit deny wins and SCPs cap permissions", "Depends on region", "Asks the user"], "answer": 1, "explain": "Deny beats allow."}

::quiz {"q": "Which protocol automates creating and removing user accounts in SaaS apps?", "options": ["SAML", "SCIM", "OIDC", "LDAP bind"], "answer": 1, "explain": "SCIM handles provisioning and deprovisioning."}

::quiz {"q": "Best way for a CI pipeline to access a cloud account?", "options": ["Store an admin access key in CI secrets", "OIDC federation exchanging a per-job token for short-lived, scoped credentials", "Share a developer's password", "Make resources public"], "answer": 1, "explain": "No long-lived secret to leak."}
