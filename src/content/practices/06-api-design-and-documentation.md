---
title: API Design and Documentation — Interfaces People Love to Use
summary: Designing APIs at every level — function signatures, library interfaces and web APIs — so they are easy to use correctly and hard to misuse, plus writing documentation developers actually read: OpenAPI specs, examples-first reference docs, quickstarts, changelogs, SDKs, and measuring developer experience.
---

::widget Scene {"title": "Designing an interface that's hard to misuse", "sub": "redesigning send(msg, true, false, 30) and documenting it", "nodes": [{"id": "bad", "kind": "doc", "label": "send(msg, true, false, 30)", "x": 3.72, "y": 3.72}, {"id": "good", "kind": "doc", "label": "send(msg, urgent=True)", "x": 9.72, "y": -2.28, "color": "green"}, {"id": "docs", "kind": "doc", "label": "Docs: quickstart · how-to · reference · concepts", "x": 15.72, "y": -8.28, "color": "blue"}], "links": [["bad", "good", {"label": "redesign"}], ["good", "docs"]], "metrics": [["issue", "Issue"], ["fix", "Fix"]], "steps": [{"short": "Read", "tag": "Problem", "title": "What does send(msg, true, false, 30) do?", "body": "<p>Nobody can tell without opening the source.</p>", "show": ["bad"], "metrics": {"issue": ["unreadable call"], "fix": ["—"]}}, {"short": "Bool", "tag": "Boolean trap", "title": "Two positional booleans can be swapped silently", "body": "<p>send(msg, false, true, 30) compiles and does something else.</p>", "set": {"bad": {"badge": "which bool is which?"}}, "metrics": {"issue": ["boolean trap", "bad"], "fix": ["keyword args or enums"]}}, {"short": "Units", "tag": "Units", "title": "30 what? Seconds? Milliseconds?", "body": "<p>A unit bug waiting to happen.</p>", "metrics": {"issue": ["unit-less number"], "fix": ["timeout=timedelta(seconds=30)"]}}, {"short": "Defaults", "tag": "Defaults", "title": "Most callers want the same thing", "body": "<p>Safe defaults: retry=True, urgent=False, timeout 30 s. The common call becomes send(msg).</p>", "show": ["bad", "good"], "flow": [["bad", "good", "#22c55e", "redesign"]], "metrics": {"fix": ["sensible defaults", "good"]}}, {"short": "Types", "tag": "Types", "title": "Return a typed DeliveryReceipt; raise specific errors", "body": "<p>RecipientNotFound tells the caller what to do; a generic Exception doesn't.</p>", "set": {"good": {"badge": "-> DeliveryReceipt"}}}, {"short": "Example", "tag": "Design method", "title": "Write the usage example before implementing", "body": "<p>If the example is awkward, the API is awkward.</p>"}, {"short": "Evolve", "tag": "Evolution", "title": "Small surface; add options without breaking callers", "body": "<p>Every public function is a promise. Deprecate with warnings and a timeline.</p>"}, {"short": "Docs", "tag": "Docs", "title": "Four kinds of documentation", "body": "<p>Quickstart (first success in minutes), how-to guides (tasks), reference (generated from the code/OpenAPI), explanation (concepts).</p>", "show": ["bad", "good", "docs"], "flow": [["good", "docs", "#3b82f6", "generate reference"]], "metrics": {"fix": ["tested, generated docs"]}}, {"short": "Test", "tag": "Keep true", "title": "Run doc examples in CI", "body": "<p>Docs that don't compile are worse than none.</p>", "note": {"kind": "key", "text": "Easy to use correctly, hard to misuse: named options, meaningful types, safe defaults, specific errors, small surface — plus docs generated and tested from the source."}}]}


## Ten minutes to the first successful call

> [!STORY] Developers often say Stripe's API is the one they enjoyed integrating most. Not because payments are simple — they're anything but — but because the first successful test payment takes minutes: copy a snippet from the docs (already filled in with your own test key), run it, see the payment appear in the dashboard. Errors tell you exactly what was wrong and link to the docs. Compare that with an API whose documentation is a 200-page PDF last updated two versions ago. The underlying functionality might be identical; the **design and documentation** decide whether developers adopt it or give up.

The System Design track (chapter 10) covers large-scale web API mechanics — pagination, idempotency, versioning. This chapter is about the craft that applies to **every** interface you write — a function, a class, a library, a service — and how to document it.

## Principles of a good interface

> [!ANALOGY] A good API is like a well-designed door. A flat plate means "push"; a handle means "pull". You never need to read a sign, and you can't easily use it wrong. A badly designed API is a door with a handle that you're supposed to push — users make mistakes, and it's not their fault.

1. **Easy to use correctly, hard to use incorrectly.** Make the right thing the default and the dangerous thing explicit.
2. **Consistent.** Same naming, ordering and error style everywhere. If one method is `get_user(id)`, don't name another `fetchOrderById`.
3. **Small surface.** Every public function is a promise you must keep forever. When in doubt, leave it out — adding later is easy; removing is a breaking change.
4. **Clear names** that say what something does and returns; avoid abbreviations users must decode.
5. **Fail loudly and helpfully** with errors that say what went wrong and how to fix it.
6. **Least surprise:** behaviour matches what a reasonable reader expects from the name.

### At the function level

```python
# Hard to use correctly: what do the booleans mean? In what unit is timeout?
send(msg, True, False, 30)

# Better: named, typed, defaults that are safe
def send(message: Message, *, retry: bool = True, urgent: bool = False,
         timeout: timedelta = timedelta(seconds=30)) -> DeliveryReceipt: ...

send(msg, urgent=True)
```

- Avoid **boolean traps** — use keyword arguments or enums (`Priority.URGENT`).
- Use **types that carry meaning**: `timedelta` instead of "seconds as an int", `Money` instead of a float (Architecture track, chapter 1).
- Make illegal states unrepresentable: instead of `status` + `cancelled_at` that can contradict each other, model a state type.
- Prefer returning results to mutating arguments; document ownership and thread safety.

### At the library and service level

- **Progressive disclosure:** simple things simple, advanced things possible. One line for the common case; optional configuration for the rest.
- **Sensible defaults:** secure, safe and reasonable without configuration (timeouts on by default, TLS on by default).
- **Idempotent operations** where retries are likely (System Design track, chapter 10).
- **Stable identifiers** and predictable resource shapes.
- **Design for evolution:** additive changes, optional fields, tolerant readers, explicit deprecation.

### Design reviews for APIs

Write the **usage examples before the implementation** — the code a user would write. If the example is awkward, the API is awkward. Review API changes like database migrations: carefully, with the consumers in mind, because they're hard to undo.

## Documentation developers actually read

Developer documentation has four distinct jobs — the **Diátaxis** framework names them:

::widget Stepper {"type":"hub","title":"The four kinds of documentation","what":"The center is your API's documentation; each box is one kind of document, the question it answers, and a good example. Mixing them is the most common documentation mistake.","steps":["Click the center first.","Click each kind and think of where your own project's docs have one — or don't.","Find which kind a brand-new developer needs first."],"nodes":[["Documentation","Each reader arrives with a different need: learning, doing a task, looking something up, or understanding why. Write separate pages for each instead of one long page that tries to do everything."],["Tutorials (learning)","A guided first experience: 'Accept your first payment in 10 minutes'. Step by step, guaranteed to work, no choices. Gets a newcomer to success and confidence."],["How-to guides (tasks)","Recipes for specific goals: 'Refund a payment', 'Handle webhooks securely', 'Migrate from v1'. Assume basic knowledge; focus on getting the job done."],["Reference (facts)","Complete, accurate, consistently structured descriptions of every endpoint, parameter, field, error and limit. Usually generated from the OpenAPI spec or code. For looking things up, not reading start to finish."],["Explanation (understanding)","Concepts and the reasons behind them: 'How payment states work', 'Why we use idempotency keys'. Builds the mental model that makes everything else make sense."]]}

### Make the reference generated and accurate

Write the API contract as **OpenAPI** (or Protobuf, GraphQL schema) and generate reference docs, client SDKs and mock servers from it, so documentation can't drift from reality.

```yaml
paths:
  /v1/refunds:
    post:
      summary: Refund a payment
      description: |
        Refunds all or part of a successful payment. Refunds are processed
        asynchronously; listen for the `refund.succeeded` webhook.
      parameters:
        - in: header
          name: Idempotency-Key
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [payment_id]
              properties:
                payment_id: { type: string, example: pay_3Lk9… }
                amount:
                  type: integer
                  description: Amount in the smallest currency unit (paise). Defaults to the full payment.
                  example: 49900
      responses:
        '201': { description: Refund created }
        '409': { description: The payment was already fully refunded }
```

### What great docs include

- **A quickstart** that produces a working result in minutes, with copy-paste code in several languages.
- **Runnable examples** for every endpoint, with realistic values — and ideally the reader's own test keys filled in.
- **Every error** listed with its cause and fix.
- **Limits and guarantees:** rate limits, timeouts, size limits, ordering and delivery guarantees, consistency.
- **Authentication** explained step by step.
- **A changelog** with dates, and migration guides for breaking changes.
- **Search** that works, and a way to report a problem on each page.

> [!WARN] Docs rot. Test code samples in CI (run them, or extract and compile them), generate reference docs from the source of truth, and make updating docs part of the definition of done for every API change.

## SDKs and developer experience

- **Client libraries** in popular languages remove boilerplate (auth, retries with backoff, pagination helpers, typed models). Generate them from the spec, then hand-polish the ergonomics.
- **Sandbox/test mode** with test data and simulated failures (declined cards, timeouts) so developers can build error handling.
- **Helpful tooling:** a CLI, request logs in the dashboard showing exactly what was received, webhook testing tools.
- **Measure DX:** time to first successful call, drop-off points in onboarding, support tickets per feature, docs search queries with no results.

## Internal APIs deserve this too

Most APIs are internal: between your team's services, or a library other teams use. The same habits — clear contracts, examples, reference docs generated from schemas, changelogs, deprecation policies — save enormous coordination time inside a company. A README that answers "what is this, how do I use it, who owns it, where do I get help" is the minimum for every repository.

> [!RECAP]
> - Good interfaces are **easy to use correctly and hard to misuse**: consistent, small, clearly named, safe by default, with helpful errors.
> - At the code level: avoid boolean traps, use meaningful types, make illegal states unrepresentable, write usage examples first.
> - Docs have four jobs: **tutorials, how-to guides, reference, explanation** (Diátaxis).
> - Generate reference docs and SDKs from **OpenAPI/Protobuf**; include quickstarts, runnable examples, every error, limits and a changelog; test samples in CI.
> - Measure developer experience; give internal APIs the same care.

> [!INTERVIEW] You may be asked to critique or design an API (a rate limiter library, a payments endpoint). Talk about naming, defaults, error handling, extensibility, versioning and how you'd document it. In behavioral rounds, improving docs or developer experience is a strong ownership story.

::quiz {"q":"What's wrong with send(msg, True, False, 30)?","options":["Nothing","Boolean and unit-less positional arguments make calls unreadable and easy to get wrong; use named options and meaningful types","It's too short","It's not async"],"answer":1,"explain":"Avoid boolean traps and bare numbers with hidden units."}

::quiz {"q":"A new developer wants to make their first successful API call. Which kind of documentation fits?","options":["Reference","Explanation","Tutorial / quickstart","Changelog"],"answer":2,"explain":"A guided path to early success."}

::quiz {"q":"How do you keep reference documentation from drifting out of date?","options":["Review it yearly","Generate it from the API's machine-readable contract (OpenAPI/Protobuf) and test code samples in CI","Write it once carefully","Remove it"],"answer":1,"explain":"Make the contract the single source of truth."}
