---
title: Design Docs and Architecture Decision Records
summary: How senior engineers think on paper before they build — why written design documents save months, what a good design doc contains, writing clearly about trade-offs and alternatives, running a design review, lightweight Architecture Decision Records that explain why the system is the way it is, and RFC processes across teams.
---

::widget Scene {"title": "A design doc before the code", "sub": "a notification-service proposal from first draft to recorded decision", "nodes": [{"id": "doc", "kind": "cells", "label": "sections", "x": 0.0, "y": 0.0, "values": ["Context", "Goals", "Non-goals", "Design", "Options", "Risks"]}, {"id": "rev", "kind": "user", "label": "Reviewers", "x": 8.89, "y": 2.89, "color": "purple"}, {"id": "adr", "kind": "doc", "label": "ADR-0012", "x": 13.89, "y": -2.11, "color": "green"}], "links": [["rev", "adr", {"dashed": true}]], "metrics": [["sec", "Section"], ["content", "Content"], ["why", "Why"]], "steps": [{"short": "When", "tag": "When", "title": "Big, cross-team, hard to reverse → write it down first", "body": "<p>A unified notification service touching 4 teams qualifies.</p>", "metrics": {"sec": ["—"], "content": ["—"], "why": ["cheap to change on paper"]}}, {"short": "Ctx", "tag": "Context", "title": "Context with numbers", "body": "<p>\"4 services send receipts; 0.3% are duplicated; 200 support tickets a month.\"</p>", "set": {"doc": {"marks": {"0": "blue"}, "ptr": {}}}, "metrics": {"sec": ["Context"], "content": ["the problem, measured"]}}, {"short": "Goals", "tag": "Goals", "title": "Goals: measurable outcomes", "body": "<p>\"One service sends all notifications; no duplicates; p99 delay < 30 s.\"</p>", "set": {"doc": {"marks": {"1": "blue"}, "ptr": {}}}, "metrics": {"sec": ["Goals"], "content": ["success criteria"]}}, {"short": "Non", "tag": "Non-goals", "title": "Non-goals: what you won't do", "body": "<p>\"Not marketing campaigns. Not chat. Not replacing the email vendor.\" Stops scope creep and debates.</p>", "set": {"doc": {"marks": {"2": "orange"}, "ptr": {}}}, "metrics": {"sec": ["Non-goals"], "why": ["prevents scope creep", "good"]}}, {"short": "Design", "tag": "Design", "title": "Proposed design with a diagram", "body": "<p>Event in → dedupe by idempotency key → channel workers → provider. Data model, APIs, failure handling.</p>", "set": {"doc": {"marks": {"3": "blue"}, "ptr": {}}}, "metrics": {"sec": ["Design"]}}, {"short": "Opts", "tag": "Alternatives", "title": "Alternatives considered and why not", "body": "<p>\"Extend the email service: rejected, it's single-channel and owned by another team.\"</p>", "set": {"doc": {"marks": {"4": "orange"}, "ptr": {}}}, "metrics": {"sec": ["Alternatives"], "why": ["answers the first question"]}}, {"short": "Risk", "tag": "Risks", "title": "Risks, rollout plan and open questions", "body": "<p>Migration one sender at a time behind flags; what if the queue is down for an hour?</p>", "set": {"doc": {"marks": {"5": "red"}, "ptr": {}}}, "metrics": {"sec": ["Risks"]}}, {"short": "Review", "tag": "Review", "title": "Share at ~70% done; comments async; meet only on disagreements", "body": "<p>Payments engineer asks about duplicate receipts — design updated.</p>", "show": ["doc", "rev"], "set": {"doc": {"marks": {}, "ptr": {}}}, "metrics": {"content": ["approved with changes"]}}, {"short": "ADR", "tag": "Record", "title": "Record the key decision as a short ADR in the repo", "body": "<p>Context, decision, consequences. Superseded later by a new ADR — never deleted.</p>", "show": ["doc", "rev", "adr"], "flow": [["rev", "adr", "#22c55e", "decision"]], "metrics": {"sec": ["ADR"], "why": ["the \"why\" survives", "good"]}, "note": {"kind": "key", "text": "Context → goals → non-goals → design → alternatives → risks/plan. Review early, decide, record the decision in an ADR."}}]}


## The two-week detour that a document would have prevented

> [!STORY] A team spends three weeks building a new notification system on a message queue they're excited about. In the final review, a staff engineer from the payments team asks: "How do you guarantee a payment receipt isn't sent twice, and that it's never lost?" The answer reveals a fundamental gap. Another team mentions they already run a notification service that handles exactly this. The work is mostly thrown away. A **two-page design document**, shared before writing code, would have surfaced both issues in an afternoon of comments.

At companies like Google, Amazon, Uber and Stripe, significant engineering work begins with a written design. Writing forces clear thinking, invites the right people to spot problems early (when changes are cheap), and leaves a record of **why** things were built the way they were.

> [!ANALOGY] An architect draws plans before anyone pours concrete. Moving a wall on paper costs an eraser; moving it after construction costs a demolition crew. A design doc is the plan for software — and code is the concrete.

## When to write one

Write a design doc when work:

- Takes more than a couple of weeks, or involves several engineers or teams.
- Is hard to reverse: data models, public APIs, choosing a database, security architecture.
- Has meaningful trade-offs or open questions.
- Affects reliability, security, privacy or cost significantly.

Don't write one for small, obvious or easily reversible changes — the doc should be cheaper than the mistakes it prevents.

## What goes in a design doc

::widget Stepper {"type":"flow","cols":3,"title":"The sections of a good design document","what":"A common structure for design docs, top to bottom. The most valuable sections are usually goals, non-goals and alternatives considered.","steps":["Press Play and read each section.","Notice that the proposed design comes AFTER the problem and goals are agreed.","Find the section that reviewers often find most useful for judging a design."],"nodes":[["Context and problem","What's happening today and why it's a problem, with data: 'Receipt emails are sent by 4 different services; 0.3% are duplicated and support gets 200 tickets a month.'"],["Goals and non-goals","What success means, measurably ('one service sends all customer notifications; no duplicates; p99 send delay < 30 s'). Non-goals say what you're deliberately NOT solving, preventing scope creep and misunderstandings."],["Proposed design","The architecture, components, data model, APIs and key flows — diagrams welcome. Enough detail that another engineer could build it and a reviewer could spot problems."],["Alternatives considered","Other approaches and why they weren't chosen: 'Extend the existing email service — rejected because…'. Shows the problem was thought through, and answers the reviewer's first question before they ask."],["Cross-cutting concerns","Security and privacy, reliability and failure modes, scalability, observability, cost, migration and rollout, testing."],["Open questions, risks and plan","What's undecided, what could go wrong, milestones, and how you'll know it worked."]]}

### Writing clearly

- **Lead with the summary.** A reader should understand the problem, the proposal and the key trade-off from the first paragraph. Amazon's six-page narrative memos are read silently at the start of meetings for exactly this reason: prose forces complete thoughts in a way bullet-point slides don't.
- **Use numbers,** not adjectives: "p99 latency 420 ms" rather than "slow".
- **State trade-offs explicitly:** "We choose eventual consistency for the feed because it lets us serve reads from replicas; the cost is that new posts may take up to 5 seconds to appear."
- **Diagrams** for architecture and flows; keep them simple and labelled.
- **Be concise.** Two to six pages is typical. Move detail to appendices.
- Write for a smart reader who **doesn't** have your context.

> [!EXAMPLE] **A goals/non-goals section that prevents trouble.**
> *Goals:* All customer notifications (email, SMS, push) go through one service by Q2. No duplicate sends for the same event. Users can opt out per channel.
> *Non-goals:* Marketing campaign tooling (owned by the growth team). Real-time chat messages. Replacing our email provider.
> Each non-goal heads off a likely debate and keeps the project from growing three times larger.

## Running a design review

1. **Share the doc early** — when it's 70% done is ideal, while changes are still cheap. Invite the people whose systems you touch, and someone experienced who isn't invested in the idea.
2. **Collect comments asynchronously** first; resolve straightforward ones in the doc.
3. **Meet only for the real disagreements.** Focus the discussion on trade-offs, risks and assumptions, not wording.
4. **Decide and record** the outcome: approved, approved with changes, or needs another round — and who made the call.
5. **Keep the doc updated** as the implementation diverges, or mark it as historical.

Reviewers should be **constructive and specific**: question assumptions, ask about failure modes ("what happens if the queue is down for an hour?"), and suggest alternatives — the same habits as code review (chapter 3).

> [!NOTE] **Disagree and commit.** Not every decision needs consensus. When reasonable people disagree after a fair discussion, the decision-maker decides, records the reasoning, and everyone commits to making it work — revisiting only if new evidence appears.

## Architecture Decision Records (ADRs)

Design docs are for big pieces of work. Many important decisions are smaller but still worth remembering: "Why PostgreSQL rather than MongoDB?", "Why do we use gRPC internally?", "Why is this service written in Go?". Six months later, nobody remembers, and newcomers either repeat the debate or change things without understanding the reasons.

An **ADR** is a short document — often under a page — recording one decision. Keep them in the repository (e.g. `docs/adr/0007-use-postgres-for-orders.md`), numbered and never deleted.

```markdown
# 7. Use PostgreSQL for the orders service

Status: Accepted (2026-03-14). Supersedes: —

## Context
Orders need multi-row transactions (order, items, payment state), ad-hoc
support queries, and ~500 writes/s at peak, growing 2x/year.

## Decision
Use managed PostgreSQL (Aurora) as the source of truth for orders.

## Consequences
+ Transactions and constraints prevent inconsistent orders.
+ Team already operates Postgres; mature tooling.
- Vertical scaling limits; we'll revisit partitioning above ~5,000 writes/s.
- Analytics queries must use the warehouse, not the primary.

## Alternatives considered
DynamoDB: excellent scale, but multi-item transactions and ad-hoc queries
are harder for our access patterns.
```

When a decision changes, write a **new** ADR that supersedes the old one — the history of reasoning is the point.

## RFCs across an organization

Larger organizations often run an **RFC (request for comments) process** for changes that affect many teams — a new shared library, a company-wide API standard, adopting a new language. The RFC is a design doc with a wider audience and a defined comment period and decision-maker. Open-source projects (Rust, Python's PEPs, Kubernetes KEPs) use the same idea publicly.

> [!RECAP]
> - **Write before building** when work is large, cross-team, risky or hard to reverse — changes on paper are cheap.
> - A design doc covers **context, goals and non-goals, the proposed design, alternatives considered, cross-cutting concerns, and open questions/plan**.
> - Write clearly: summary first, numbers over adjectives, explicit trade-offs, concise.
> - Review early and asynchronously; meet for real disagreements; **record decisions**; disagree and commit.
> - **ADRs** capture individual decisions — context, decision, consequences, alternatives — in the repo; supersede rather than delete.
> - **RFCs** extend the process across teams.

> [!INTERVIEW] Senior interviews often ask: "Tell me about a design you proposed — what alternatives did you consider and how was it reviewed?" or "Describe a technical disagreement and how it was resolved." A clear design-doc story with goals, trade-offs and outcomes is excellent material.

::quiz {"q":"Which section of a design doc helps reviewers most when judging whether the problem was thought through?","options":["The title","Alternatives considered, with reasons for rejecting them","The appendix","The author list"],"answer":1,"explain":"It shows the trade-off space and pre-empts obvious questions."}

::quiz {"q":"What do non-goals prevent?","options":["Bugs","Scope creep and misunderstandings about what the project will do","Code reviews","Deployment"],"answer":1,"explain":"They make boundaries explicit."}

::quiz {"q":"A past architecture decision is reversed. What should happen to its ADR?","options":["Delete it","Write a new ADR that supersedes it, keeping the old one as history","Edit the old one silently","Nothing"],"answer":1,"explain":"The history of reasoning is the value."}
