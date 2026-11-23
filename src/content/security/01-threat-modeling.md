---
title: Thinking Like an Attacker — Threat Modeling
summary: How security engineers find weaknesses before attackers do — the attacker's mindset, assets and attack surface, drawing data-flow diagrams with trust boundaries, STRIDE applied to a real feature, attack trees, ranking risks, and turning the results into concrete engineering work.
---

## The feature nobody threat-modeled

> [!STORY] A fintech app ships "Send money to a phone number". The design review covered the UI, the database and performance. Nobody asked how it could be abused. Within a week, fraudsters discover that the endpoint reveals the full name of whoever owns any phone number — perfect for targeted scams — and that there's no limit on how many numbers you can look up. They script it and harvest names for two million numbers. An hour of structured thinking at design time — **threat modeling** — would almost certainly have caught both problems.

## The attacker's mindset

Developers think about how a feature **should** be used. Attackers think about every way it **could** be used.

> [!ANALOGY] A locksmith looks at a front door differently from a homeowner. The homeowner sees a door that locks. The locksmith sees the hinges on the outside, the window beside it, the spare key under the mat, and the delivery person who's let in every Tuesday. Threat modeling is training yourself to see the door the way the locksmith does.

Attackers are usually after something specific: money, data to sell, access to use elsewhere, disruption, or leverage (ransomware). And they take the **easiest path**, not the most interesting one — phishing an employee is often easier than breaking your encryption.

## The four questions

Threat modeling, in its simplest and most widely used form (from Adam Shostack), is four questions:

1. **What are we building?** Draw it.
2. **What can go wrong?** Brainstorm threats systematically.
3. **What are we going to do about it?** Mitigate, accept, transfer or avoid each one.
4. **Did we do a good job?** Review, test and revisit as the system changes.

## Step 1: draw the system with trust boundaries

A **data-flow diagram** shows the people and systems involved, the data stores, and the data moving between them. Then draw **trust boundaries** wherever data crosses from something you trust less to something you trust more.

::widget Architecture {"title":"Send-money-to-phone feature with trust boundaries","what":"The components involved in sending money to a phone number. Each arrow is data crossing between components; every arrow from a less-trusted zone into a more-trusted one is a place to check what's coming in.","steps":["Find the arrows that cross from the internet into your systems.","Click the lookup service — this is where the story's leak happened.","For each arrow, ask: who could fake or tamper with this data?"],"nodes":[{"id":"user","label":"Mobile app","kind":"client","col":0,"row":1,"desc":"Runs on the user's phone. Fully controlled by whoever holds the phone — including attackers who modify the app or call the API directly."},{"id":"gw","label":"API gateway","kind":"gateway","col":1,"row":1,"desc":"The trust boundary between the internet and your network. Authentication and rate limits are enforced here."},{"id":"lookup","label":"Recipient lookup","kind":"service","col":2,"row":0,"desc":"Maps a phone number to an account. Returning the full name to any caller, without limits, is what enabled mass harvesting."},{"id":"pay","label":"Payments service","kind":"service","col":2,"row":2,"desc":"Moves money. Must authorize every transfer and be idempotent."},{"id":"db","label":"Accounts DB","kind":"db","col":3,"row":0,"desc":"Personal data: names, phone numbers, balances."},{"id":"ledger","label":"Ledger","kind":"db","col":3,"row":2,"desc":"The record of every money movement. Must be tamper-evident."},{"id":"bank","label":"Bank partner","kind":"external","col":4,"row":2,"desc":"An external system — another trust boundary in the other direction."}],"edges":[["user","gw","HTTPS"],["gw","lookup","lookup(phone)"],["gw","pay","transfer"],["lookup","db","read"],["pay","ledger","write"],["pay","bank","settle",true]]}

## Step 2: what can go wrong? STRIDE

**STRIDE** (created at Microsoft) is a checklist of six threat types. Walk through each component and each arrow and ask whether each applies.

| Threat | Violates | Question to ask | Example in this feature |
|---|---|---|---|
| **S**poofing | Authentication | Can someone pretend to be another user or system? | Stolen session token used to send money |
| **T**ampering | Integrity | Can data be changed in transit or at rest? | Changing the amount in the request after approval |
| **R**epudiation | Accountability | Can someone deny doing something? | "I never sent that money" — with no audit trail |
| **I**nformation disclosure | Confidentiality | Can data leak to the wrong people? | Lookup reveals full names for any number |
| **D**enial of service | Availability | Can someone overload or break it? | Millions of lookups slow everyone down |
| **E**levation of privilege | Authorization | Can someone do more than they should? | Sending from someone else's account by changing an ID |

### Attack trees

For high-value goals, draw an **attack tree**: the attacker's goal at the top, and the ways to achieve it branching below.

::widget Stepper {"type":"tree","title":"Attack tree: steal money from a user's account","what":"The attacker's goal at the top, and different ways to reach it below. Each branch is a path an attacker might take; the cheapest unprotected path is the one to fix first.","steps":["Click the goal, then explore each branch.","For each leaf, ask: how hard is this for an attacker, and do we have a defense?","Find the branch that doesn't involve breaking any code at all."],"nodes":[["Goal: move money out of a victim's account","The attacker's objective. Everything below is a way to get there."],["Take over the account","Get the victim's credentials or session."],["Abuse the transfer logic","Exploit a flaw in the payments API itself."],["Phish the password and OTP","A fake login page relays credentials and the one-time code in real time. Defense: phishing-resistant passkeys, device binding, alerts on new devices."],["SIM swap","Convince the phone carrier to move the victim's number to a new SIM, receiving their SMS codes. Defense: don't rely on SMS alone; extra checks after a SIM change."],["Change the account ID in the request","Broken access control (IDOR). Defense: the server derives the source account from the session, never from the request."],["Replay or race the request","Send the same approved transfer twice at once. Defense: idempotency keys and atomic balance checks (Databases track, chapter 6)."]]}

## Step 3: decide what to do

For each threat, pick one:

- **Mitigate** — add a control: rate limits, authorization checks, encryption, audit logs.
- **Accept** — the risk is low or the fix costs more than it saves; record the decision.
- **Transfer** — insurance, or a provider who carries the risk.
- **Avoid** — don't build that part. (Does the lookup really need to show the full name? Showing "R***** K." might be enough.)

Rank threats by **likelihood × impact** so effort goes to the biggest risks. For the story, the fixes are clear: mask the name, rate-limit lookups per user and device, alert on unusual lookup volumes, and require the sender to be authenticated.

## Step 4: did we do a good job?

Turn each mitigation into a ticket **and a test** — for example, an automated test that user A can't send from user B's account. Revisit the model when the design changes, and feed real incidents and bug-bounty reports back into it.

> [!NOTE] Threat modeling doesn't need to be heavyweight. A 45-minute session with an engineer, a product manager and someone security-minded, a whiteboard diagram, and STRIDE as a checklist finds most important issues. Do it at design time, when fixes are cheapest.

> [!RECAP]
> - Attackers take the **easiest path** to something valuable; learn to see systems as they do.
> - Four questions: **what are we building, what can go wrong, what will we do, did we do a good job?**
> - Draw a **data-flow diagram** and mark **trust boundaries**; validate everything crossing them.
> - Use **STRIDE** per component and data flow; use **attack trees** for high-value goals.
> - **Mitigate, accept, transfer or avoid**, ranked by likelihood × impact; turn mitigations into tickets and tests.

> [!INTERVIEW] Security-minded system design rounds ask "how could this be abused?". Walk through STRIDE on your design, point to trust boundaries, and propose specific mitigations — rate limiting, authorization, audit logs, data minimization.

::quiz {"q":"An attacker changes the account ID in a transfer request to someone else's. Which STRIDE category is this?","options":["Repudiation","Elevation of privilege (broken authorization)","Denial of service","Tampering only"],"answer":1,"explain":"They're doing something they aren't authorized to do."}

::quiz {"q":"What's a trust boundary?","options":["A firewall rule","A point where data passes from a less-trusted component to a more-trusted one, and must be checked","The edge of a cloud region","A password policy"],"answer":1,"explain":"Validation and authorization belong at every trust boundary."}

::quiz {"q":"When is threat modeling cheapest and most effective?","options":["After a breach","During design, before the code is written","During penetration testing","Never — it's too slow"],"answer":1,"explain":"Design changes cost far less than fixing shipped code."}
