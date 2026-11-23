---
title: Authorization Models: RBAC, ABAC and Relationship-Based Access
summary: Deciding what each user may do, why authorization bugs are the number one web vulnerability, role-based access control and its limits, attribute-based policies, Google Zanzibar-style relationship-based access (how Google Docs sharing works), multi-tenant isolation, and where to put authorization checks in your architecture.
---

::widget Scene {"title": "Who can open this document? RBAC vs ABAC vs ReBAC", "sub": "one question answered three ways", "nodes": [{"id": "u", "kind": "user", "label": "Priya (sales, Bangalore)", "x": 3.72, "y": 3.72}, {"id": "pep", "kind": "server", "label": "Docs API (enforcement)", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "pdp", "kind": "cube", "label": "Policy decision", "x": 12.72, "y": -5.28, "color": "orange"}, {"id": "doc", "kind": "doc", "label": "Q3 forecast (owner: sales team)", "x": 17.22, "y": -9.78}], "links": [["u", "pep"], ["pep", "pdp"], ["pdp", "doc", {"dashed": true}]], "metrics": [["model", "Model"], ["rule", "Rule"], ["ans", "Decision"]], "steps": [{"short": "Ask", "tag": "Question", "title": "Priya opens the Q3 forecast. Allowed?", "body": "<p>Authentication said who she is. Authorization decides what she may do.</p>", "show": ["u", "pep", "doc"], "flow": [["u", "pep", "#3b82f6", "GET /docs/q3"]], "metrics": {"model": ["-"], "rule": ["-"], "ans": ["?"]}}, {"short": "Central", "tag": "Architecture", "title": "The API asks a policy engine instead of hard-coding ifs", "body": "<p>Enforcement point → decision point. Policies change without redeploying every service.</p>", "show": ["u", "pep", "pdp", "doc"], "flow": [["pep", "pdp", "#f59e0b", "can priya read q3?"]]}, {"short": "RBAC", "tag": "RBAC", "title": "RBAC: roles get permissions; users get roles", "body": "<p>Role \"sales\" → can read sales documents. Simple and auditable.</p>", "metrics": {"model": ["RBAC"], "rule": ["sales → read sales docs"], "ans": ["allow"]}}, {"short": "Explode", "tag": "RBAC limits", "title": "But \"sales-Bangalore-Q3-readers\"…", "body": "<p>Fine-grained needs make roles explode.</p>", "metrics": {"ans": ["role explosion", "bad"]}}, {"short": "ABAC", "tag": "ABAC", "title": "ABAC: rules over attributes", "body": "<p>allow if user.department == doc.department and user.region == doc.region and time is business hours.</p>", "metrics": {"model": ["ABAC"], "rule": ["dept + region match"], "ans": ["allow"]}}, {"short": "ReBAC", "tag": "ReBAC", "title": "ReBAC: follow relationships", "body": "<p>Priya ∈ team:sales-blr, team:sales-blr is viewer of folder:forecasts, folder contains doc:q3 → allowed. How Google Docs-style sharing works (Zanzibar).</p>", "metrics": {"model": ["ReBAC"], "rule": ["user → team → folder → doc"], "ans": ["allow"]}}, {"short": "Deny", "tag": "Default", "title": "No rule matches → deny", "body": "<p>Default deny; log the decision.</p>", "flow": [["pdp", "pep", "#22c55e", "allow (via team)"]], "metrics": {"ans": ["allow, logged", "good"]}}, {"short": "IDOR", "tag": "Pitfall", "title": "The classic bug: checking login but not ownership", "body": "<p>GET /docs/124 when you own 123. Check authorization on every object, every time.</p>", "note": {"kind": "key", "text": "RBAC for coarse roles, ABAC for context rules, ReBAC for sharing graphs. Centralise decisions, default deny, check every object access."}}]}

::widget Scene {"title": "Who can open this document? RBAC vs relationships", "sub": "Google Docs-style sharing", "nodes": [{"id": "u", "kind": "user", "label": "Priya", "x": 3.1, "y": 3.1}, {"id": "t", "kind": "cube", "label": "Team A", "x": 7.1, "y": -0.9, "color": "blue"}, {"id": "f", "kind": "cube", "label": "Folder X", "x": 11.1, "y": -4.9, "color": "purple"}, {"id": "d", "kind": "doc", "label": "Doc 9", "x": 15.1, "y": -8.9}], "links": [["u", "t", {"label": "member"}], ["t", "f", {"label": "editor"}], ["f", "d", {"label": "contains"}]], "metrics": [["ans", "Can Priya edit Doc 9?"]], "steps": [{"short": "Roles", "tag": "RBAC", "title": "Roles alone: \"editors can edit documents\"", "body": "<p>Too coarse, which documents?</p>", "metrics": {"ans": ["?"]}}, {"short": "Relations", "tag": "ReBAC", "title": "Follow relationships: Priya → Team A → editor of Folder X → contains Doc 9", "body": "<p>A graph search answers the question (Google Zanzibar, SpiceDB, OpenFGA).</p>", "flow": [[["u", "t", "f", "d"], "#22c55e", "path found"]], "metrics": {"ans": ["yes", "good"]}, "note": {"kind": "key", "text": "Check permission on every object, on the server, every time, broken access control is the #1 web vulnerability."}}]}

## Logged in is not the same as allowed

> [!STORY] A project-management startup builds roles: Admin, Member, Viewer. It works, until customers ask for more. "Contractors should only see the projects they're assigned to." "Managers can approve expenses up to ₹50,000, directors above that." "Share this one document with someone outside the company." Each request adds another special case in another controller. A year later, nobody can say for certain who can see what, and a security researcher reports that any Member can read any other company's invoices by changing an ID. Authorization had grown by accident instead of by design.

**Broken access control** has been the number one risk in the OWASP Top 10 since 2021. Authentication bugs are relatively rare because people use standard libraries; authorization is custom to every app, so that's where the bugs live.

## The question every check answers

Every authorization decision has the same shape:

> **Can this subject perform this action on this resource, in this context?**
> "Can *Priya* *approve* *expense #881* *from this device, now*?"

The models below differ in how they answer it.

::widget Stepper {"type":"flow","cols":3,"title":"Three ways to model permissions","what":"The three main authorization models, each answering 'can this user do this?' differently. Most real systems combine them.","steps":["Press Play and read each model.","For each, try the story's requests: contractors on assigned projects, approval limits, sharing one document.","Find which model Google Docs sharing is built on."],"nodes":[["RBAC: roles","Users get roles; roles carry permissions. 'Editors can edit documents.' Simple to understand and audit. Breaks down when rules depend on WHICH document or on specific values, leading to an explosion of roles like 'Editor-Project-17'."],["ABAC: attributes and policies","Rules written over attributes of the user, resource, action and context: 'managers may approve expenses where amount ≤ their limit and department matches'. Very flexible; harder to answer 'who can access X?'."],["ReBAC: relationships","Permissions follow relationships in a graph: Priya is a member of Team A; Team A is an editor of Folder X; Doc 9 is in Folder X, so Priya can edit Doc 9. Natural for sharing, hierarchies and organizations. Google's Zanzibar powers Docs, Drive and YouTube this way."]]}

## RBAC: role-based access control

```text
roles:        admin → [*]
              editor → [doc:read, doc:write, comment:write]
              viewer → [doc:read]
assignments:  priya → editor, ravi → viewer
```

> [!ANALOGY] Hotel staff key cards by job: housekeeping cards open guest rooms, maintenance cards open plant rooms, the manager's card opens everything. Easy to manage, until the manager wants a housekeeper to clean only floors 3 and 4, and you need a new kind of card for every combination.

Good for coarse, organization-wide permissions. Add **scoping** (roles within a tenant or project) to handle "editor of **this** workspace".

## ABAC: attribute-based policies

Policies are written as rules, often in a dedicated language and evaluated by a **policy engine** like Open Policy Agent (Rego) or AWS Cedar:

```text
// Cedar-style policy
permit (principal, action == Action::"approve", resource in ExpenseReports)
when {
  principal.role == "manager" &&
  resource.amount <= principal.approvalLimit &&
  resource.department == principal.department &&
  resource.submitter != principal            // can't approve your own expense
};
```

Handles business rules, context (time of day, device trust, location) and separation of duties. Cloud IAM policies (Cloud track) are ABAC.

## ReBAC: relationship-based access (Zanzibar)

Store permissions as **relationship tuples**:

```text
doc:9#parent@folder:X
folder:X#editor@team:A#member
team:A#member@user:priya
```

…and define how permissions follow relationships: "a document's editors include its parent folder's editors", "viewers include editors". Then "can Priya edit doc 9?" is a graph search (Algorithms track).

> [!EXAMPLE] **Google Zanzibar.** Google's global authorization system (published in 2019) stores trillions of these tuples and answers millions of checks per second, with consistency guarantees so that removing someone's access and then adding a secret document can't leak it to them. Open-source systems inspired by it include SpiceDB, OpenFGA and Ory Keto.

## Multi-tenancy: the most important boundary

In software sold to many companies (SaaS), the worst authorization bug is one company seeing another's data.

- Derive the **tenant from the authenticated session** never from the request body or URL.
- Scope **every** query by tenant, ideally enforced automatically: an ORM default scope, or the database's own **row-level security**:

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.tenant_id')::bigint);
```

- Test isolation explicitly: automated tests that log in as tenant A and attempt to read tenant B's resources.

## Where to put the checks

- **At the edge (API gateway):** coarse checks, is the token valid, does it have the right scope for this API?
- **In each service, on every request, on every object:** the fine-grained "may this user do this to **this** record?", this is where IDOR bugs are prevented.
- **Centralize the logic, not necessarily the enforcement:** one policy engine or authorization service that every service calls, instead of `if` statements scattered through controllers. Easier to audit, test and change.
- **Deny by default**; log every denial (and important allows) for audit.
- **Hiding buttons in the UI is a convenience, not a control.**

> [!NOTE] **Admin and support access** is a frequent weak spot. Give support staff time-limited, logged, reason-required "break-glass" access instead of standing super-admin powers, and show customers when it's used.

> [!RECAP]
> - Authorization is custom to every app, which is why **broken access control** tops the vulnerability lists.
> - Every check: **subject, action, resource, context**.
> - **RBAC** (roles) is simple but coarse; **ABAC** (attribute policies, OPA/Cedar) handles business rules; **ReBAC** (relationship graphs, Zanzibar) handles sharing and hierarchies. Combine them.
> - Enforce **tenant isolation** from the session, on every query; consider **row-level security**; test it.
> - Coarse checks at the gateway, **object-level checks in services** centralized policy, deny by default, audit logs.

> [!INTERVIEW] "Design permissions for Google Docs / a multi-tenant SaaS" is a strong senior question. Discuss RBAC vs ABAC vs ReBAC, the data model for sharing, how checks are made fast (caching, consistency), tenant isolation and auditing.

::quiz {"q":"Which model fits 'share this one document with an outside collaborator' best?","options":["RBAC with a new role","ReBAC, add a relationship between that user and that document","Firewall rules","IP allowlists"],"answer":1,"explain":"Relationship-based access handles per-object sharing naturally."}

::quiz {"q":"Where should the tenant ID used to scope queries come from?","options":["A URL parameter","The request body","The authenticated session or token","A cookie the client can edit"],"answer":2,"explain":"Never trust the client to say which tenant it belongs to."}

::quiz {"q":"'Managers can approve expenses up to their own limit, but not their own expenses.' Which model expresses this most directly?","options":["RBAC","ABAC policies over user and resource attributes","ReBAC","None"],"answer":1,"explain":"It depends on attribute values and comparisons."}
