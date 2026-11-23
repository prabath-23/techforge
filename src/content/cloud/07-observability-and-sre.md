---
title: Observability and SRE — Knowing What Your System Is Doing, and Keeping It Reliable
summary: How engineers see inside running systems — metrics, logs and traces, and when to use each — plus Google's Site Reliability Engineering practices: error budgets, alerts that wake you only when it matters, running an incident calmly, and blameless postmortems.
---

## Flying blind

> [!STORY] At 2:14 am, customers start tweeting that checkout is broken. The on-call engineer wakes up and opens the dashboards. CPU looks normal. Memory looks normal. The servers are up. Yet 8% of payments are failing — but which ones, and why? Is it one region? One payment provider? A deploy from yesterday? Without the right information, the next hour is guesswork. With it, the answer is on screen in two minutes: payments over ₹50,000 routed to one provider started timing out after that provider changed something at 2:10.

**Observability** is the ability to answer **new** questions about what your system is doing from the outside, without shipping new code to find out. In large systems, failures are usually unique combinations nobody predicted, so you can't just set up a dashboard for every possible problem in advance.

> [!ANALOGY] A car's dashboard shows speed, fuel and engine temperature — fixed questions (that's **monitoring**). A mechanic's diagnostic computer can answer questions nobody planned for: "what was the fuel mixture in cylinder 3 during that stutter at 2,000 rpm?" (that's **observability**).

## The three main signals

| Signal | What it is | Great for | Weakness |
|---|---|---|---|
| **Metrics** | Numbers over time: requests per second, error rate, latency, CPU | Dashboards, alerts, trends; cheap to keep | No detail about individual requests |
| **Logs** | Text records of events: "payment 98123 failed: card declined" | Detailed debugging of specific events | Expensive at volume; hard to summarize |
| **Traces** | The journey of one request through every service, with timings | Finding which service made a request slow | Usually sampled; needs instrumentation |

Most investigations use all three: a **metric** alert says something's wrong, a **trace** shows where, and **logs** explain why.

## Metrics: what to measure

Three well-known checklists:

- **The four golden signals** (from Google's SRE book): **latency** (how long requests take), **traffic** (how many), **errors** (how many fail), **saturation** (how full the system is — CPU, memory, queue length).
- **RED**, for services: **R**ate, **E**rrors, **D**uration.
- **USE**, for resources like CPUs and disks: **U**tilization, **S**aturation, **E**rrors.

Don't forget **business metrics**: orders per minute, sign-ups, successful payments. They often reveal problems faster than any technical metric — if orders per minute suddenly halve, something's wrong even if every server looks healthy.

### Averages lie; use percentiles

If 99 requests take 50 ms and one takes 10 seconds, the average is about 150 ms — which describes nobody's experience. Instead, track **percentiles**:

- **p50** (median): half of requests are faster than this.
- **p99**: 99% are faster; 1 in 100 users waits longer.

At scale, 1% is a lot of people — and your most active users make the most requests, so they're the most likely to hit the slow ones.

```promql
# 99th-percentile latency per endpoint over the last 5 minutes (Prometheus query language)
histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))
```

> [!WARN] **Cardinality.** Every unique combination of a metric's labels is stored as a separate series. Labels like `route` and `status_code` are fine. Adding `user_id` creates a series per user — millions of them — and can overwhelm the monitoring system and the bill. Put per-user or per-request details in logs and traces, not metric labels.

Common tools: **Prometheus** and **Grafana** (open source), Datadog, New Relic, and each cloud's own monitoring.

## Logs: make them searchable

Write **structured logs** — JSON with consistent fields — instead of free-form text:

```json
{"time":"2026-11-23T02:14:44Z","level":"error","service":"checkout","version":"1.42.0",
 "trace_id":"4bf92f3577b34da6","user_id":"u_8812","msg":"payment authorization failed",
 "provider":"provider-b","error":"timeout","duration_ms":10003}
```

Now you can search "all errors from checkout where provider = provider-b in the last 30 minutes" and count them, instead of scrolling through text.

- Log **events and errors with context**, not every line of code that runs.
- **Never log passwords, tokens, card numbers** or more personal data than necessary.
- Include the **trace ID** in every log line, so logs and traces connect.
- Decide how long to keep logs: they're often the largest part of the monitoring bill.

## Traces: follow one request through every service

A single page load might pass through a gateway, an auth service, a cart service, a pricing service, a database and a payment provider. When it's slow, which one is to blame?

A **distributed trace** records each step as a **span** — a named piece of work with a start time and a duration — and links the spans into a tree. Each service passes a **trace ID** to the next (in a standard HTTP header called `traceparent`), so the pieces can be put back together.

::widget Stepper {"type":"tree","title":"A trace of one slow checkout request","what":"One request, broken into spans. Each box is a piece of work and how long it took; boxes below a box were called by it.","steps":["Click the root, then work downward.","Find the span that accounts for most of the 1.8 seconds.","Notice how quickly the trace points to the culprit compared with reading logs."],"nodes":[["GET /checkout — 1,840 ms","The whole request, as seen by the API gateway."],["Auth check — 12 ms","Validating the login token. Fast."],["Checkout service — 1,810 ms","The main work. Almost all the time is in here — but where?"],["Session cache — 1 ms","A Redis lookup. Fast."],["Token cache — 2 ms","Fast."],["Inventory check — 95 ms","A call to the inventory service. Acceptable."],["Payment provider — 1,650 ms","The culprit: an external payment provider is responding slowly. Now we know exactly where to look."]]}

**OpenTelemetry** is the vendor-neutral standard for collecting metrics, logs and traces, with libraries for every major language and automatic instrumentation for common frameworks. Collect once, send to whichever tool you use.

## Site Reliability Engineering (SRE)

SRE is the approach Google created around 2003, described as "what happens when you ask a software engineer to design an operations team". Its core ideas spread throughout the industry.

### SLIs, SLOs and the error budget

- An **SLI** (service level indicator) measures what users experience: "the percentage of checkout requests that succeed within 500 ms".
- An **SLO** (service level objective) is the target: "99.9% over any 30 days".
- An **SLA** (service level agreement) is a contract with customers, usually looser than the SLO, with penalties if broken.

The clever part is the **error budget**: if the target is 99.9%, then 0.1% of requests are **allowed** to fail — about 43 minutes of full outage a month.

> [!ANALOGY] A monthly spending allowance. While there's money left, you can spend it on risky but valuable things: shipping new features quickly, experimenting, upgrading infrastructure. When it's used up, you stop spending: no risky releases until reliability recovers. It turns endless arguments between "ship faster!" and "be more careful!" into a simple, shared rule.

And 100% reliability is the wrong goal: users can't tell 99.999% from 100% through their own flaky phone connection, and the last fraction costs enormously.

### Alerts that matter

- **Alert on symptoms users feel** (error rate, slow responses, the SLO being burned quickly), not on causes ("CPU at 90%" isn't an emergency if users are fine — put that on a dashboard).
- **Every alert that wakes someone up must be actionable**, and link to a runbook explaining what to do.
- **Burn-rate alerts:** page someone if the error budget is being used up fast (for example, at this rate the month's budget will be gone in two days); open a ticket if it's being used up slowly.

Too many noisy alerts cause **alert fatigue**: people start ignoring pages, and then miss the one that's real.

### Handling an incident

1. **Detect** — through alerts or user reports.
2. **Declare** an incident and assign roles: an **incident commander** who coordinates (and doesn't debug), people who investigate, and someone who handles communication.
3. **Mitigate first, investigate later.** Restore service as fast as possible: roll back the last deploy, switch off the new feature flag, fail over to another region, add capacity. Finding the root cause comes **after** users are unblocked.
4. **Communicate** regularly — a status page, updates to support and leadership.
5. **Resolve** and hand over.

### Blameless postmortems

After a significant incident, the team writes a **postmortem**: what happened (a timeline), the impact, the causes, what went well, what went badly, where they got lucky — and **action items with owners** so it doesn't happen again.

**Blameless** means assuming everyone acted reasonably with the information they had, and asking "how did our systems allow this mistake?" rather than "who messed up?". If people fear blame, they hide mistakes, and the organization stops learning.

> [!EXAMPLE] Many companies publish their postmortems. Cloudflare, GitLab and Google Cloud have published detailed write-ups of major outages, including mistakes made during the response. Reading them is one of the best ways to learn how real systems fail.

### Reducing toil

**Toil** is repetitive manual work that grows with the system: restarting a stuck job by hand every night, manually rotating certificates. SRE teams cap toil (Google aims for under 50% of an engineer's time) and spend the rest **automating it away**.

> [!RECAP]
> - **Observability** lets you answer new questions about a running system; it uses **metrics**, **logs** and **traces** together.
> - Measure the **golden signals** (latency, traffic, errors, saturation) and business metrics; use **percentiles**, not averages; beware **cardinality**.
> - Write **structured logs** with trace IDs; use **distributed tracing** (OpenTelemetry) to find which service is slow.
> - **SLIs, SLOs and error budgets** turn reliability into a shared, measurable agreement.
> - Alert on **symptoms**, make every page **actionable**, **mitigate first** during incidents, and write **blameless postmortems**.

> [!INTERVIEW] Expect: metrics vs logs vs traces and when to use each; why p99 matters; what cardinality is; how a trace ID connects services; SLI vs SLO vs SLA and error budgets; what makes a good alert; how you'd run an incident. Behavioral rounds often ask about an outage you handled — prepare a story.

::quiz {"q":"Why shouldn't user_id be a label on a metric?","options":["It's personal data","It creates a separate time series per user — millions of them — overwhelming the system","Metrics can't hold strings","It breaks percentiles"],"answer":1,"explain":"Keep high-cardinality details in logs and traces."}

::quiz {"q":"Your SLO is 99.9% availability over 30 days. Roughly how much full downtime is your error budget?","options":["4 minutes","43 minutes","4 hours","1 day"],"answer":1,"explain":"0.1% of 43,200 minutes ≈ 43 minutes."}

::quiz {"q":"During an outage, what comes first?","options":["Finding the root cause","Restoring service — roll back, fail over or switch off the feature","Writing the postmortem","Finding who caused it"],"answer":1,"explain":"Mitigate first; investigate once users are unblocked."}
