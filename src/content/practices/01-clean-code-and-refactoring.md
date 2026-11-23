---
title: Clean Code and Refactoring — Writing Code Other People Can Change
summary: Why readable code matters more than clever code, how to name things, size functions and handle errors, the SOLID ideas in plain words, the "code smells" that signal trouble, and how to refactor safely in small steps — with before-and-after examples.
---

::widget Scene {"title": "Refactoring in small safe steps", "sub": "a 120-line renewal function becomes readable without changing behaviour", "nodes": [{"id": "t", "kind": "cube", "label": "Characterisation tests", "x": 3.72, "y": 3.72, "color": "green"}, {"id": "c", "kind": "doc", "label": "process(u, p, f, x) — 120 lines", "x": 8.22, "y": -0.78}, {"id": "f1", "kind": "doc", "label": "is_eligible_for_renewal()", "x": 9.0, "y": -9.0}, {"id": "f2", "kind": "doc", "label": "calculate_renewal_price()", "x": 12.72, "y": -5.28}, {"id": "f3", "kind": "doc", "label": "send_renewal_receipt()", "x": 16.44, "y": -1.56}], "links": [["t", "c"], ["c", "f1"], ["c", "f2"], ["c", "f3"]], "metrics": [["step", "Refactoring"], ["tests", "Tests"], ["lines", "Longest function"]], "steps": [{"short": "Smell", "tag": "Smells", "title": "Long function, cryptic names, a flag argument, duplicated discount logic", "body": "<p>Nobody dares touch it; bugs hide in it.</p>", "show": ["c"], "metrics": {"step": ["—"], "tests": ["none", "bad"], "lines": ["120"]}}, {"short": "Net", "tag": "Safety net", "title": "First, pin current behaviour with tests", "body": "<p>Characterisation tests record what it does today — even the odd parts.</p>", "show": ["t", "c"], "flow": [["t", "c", "#22c55e", "14 cases"]], "metrics": {"tests": ["14 green", "good"]}}, {"short": "Rename", "tag": "Rename", "title": "Rename: process → renew_subscription, x → is_annual", "body": "<p>Run tests. Commit. Tiny, safe, already clearer.</p>", "set": {"c": {"label": "renew_subscription(user, plan, …)"}}, "metrics": {"step": ["rename"], "tests": ["green"]}}, {"short": "Extract1", "tag": "Extract", "title": "Extract the eligibility checks into is_eligible_for_renewal()", "body": "<p>A name replaces a comment and 25 lines.</p>", "show": ["t", "c", "f1"], "flow": [["c", "f1", "#3b82f6", "extract"]], "metrics": {"step": ["extract function"], "lines": ["95"]}}, {"short": "Extract2", "tag": "Extract", "title": "Extract pricing — and merge the two duplicated discount blocks", "body": "<p>One place to change discount rules.</p>", "show": ["t", "c", "f1", "f2"], "flow": [["c", "f2", "#3b82f6", "extract"]], "metrics": {"step": ["remove duplication"], "lines": ["60"]}}, {"short": "Flag", "tag": "Flag argument", "title": "Replace the boolean flag with two clear call sites", "body": "<p>renew(…, True) becomes renew_annual(…) / renew_monthly(…).</p>", "metrics": {"step": ["remove flag arg"]}}, {"short": "Extract3", "tag": "Extract", "title": "Extract the side effect: send_renewal_receipt()", "body": "<p>Separating calculation from I/O makes pricing trivially unit-testable.</p>", "show": ["t", "c", "f1", "f2", "f3"], "flow": [["c", "f3", "#3b82f6", "extract"]], "metrics": {"lines": ["18"]}}, {"short": "Read", "tag": "Result", "title": "The main function now reads like a story", "body": "<p>if not eligible: return; price = calculate…; charge; send receipt.</p>", "set": {"c": {"badge": "reads top to bottom"}}, "metrics": {"tests": ["green", "good"], "lines": ["18", "good"]}}, {"short": "Rhythm", "tag": "Rhythm", "title": "Each step: change, test, commit", "body": "<p>Never mix refactoring with behaviour changes in one commit, and never do a big-bang rewrite.</p>", "note": {"kind": "key", "text": "Tests first, then tiny behaviour-preserving steps: rename, extract, remove duplication, replace flags, separate logic from I/O. Commit after each."}}]}


## Code is read far more than it's written

> [!STORY] Priya joins a team and gets her first ticket: "Discount isn't applied for students on annual plans." She opens `billing.js` and finds a 600-line function called `process()`, variables named `d`, `tmp2` and `flag`, and a comment saying `// don't touch, works`. The fix turns out to be one line. Finding that line takes her three days, and she's still not sure it didn't break something else.

Code is written once and read dozens of times — by teammates, by reviewers, by you in six months. **Clean code** is code a reasonable colleague can understand and change safely. That's the whole goal; every rule below serves it.

> [!ANALOGY] A well-organized kitchen. Knives in the knife drawer, labels on the jars, spices together. Anyone can walk in and cook. A messy kitchen still works for the person who made the mess — until they go on holiday.

## Names that explain themselves

A good name removes the need for a comment.

```js
// Before
const d = 86400 * 7
function calc(u, p) { /* … */ }
if (flag) { /* … */ }

// After
const SECONDS_PER_WEEK = 86_400 * 7
function calculateRenewalPrice(user, plan) { /* … */ }
if (isEligibleForStudentDiscount) { /* … */ }
```

- Name things after **what they mean**, not how they're stored (`activeUsers`, not `userList2`).
- Booleans read as yes/no questions: `isExpired`, `hasPermission`, `canRetry`.
- Functions are verbs: `sendInvoice`, `parseDate`.
- Longer names for things used far away; short names are fine for a loop counter in three lines.

## Small functions that do one thing

A function should do one thing at one level of detail, so you can read it like a story:

```js
function renewSubscription(user) {
  const plan = findCurrentPlan(user)
  const price = calculateRenewalPrice(user, plan)
  chargeCard(user.paymentMethod, price)
  sendRenewalReceipt(user, price)
}
```

You understand the whole process in four lines, and each step can be read, tested and changed separately. If a function needs a comment like `// step 3: apply discounts`, that section probably wants to be its own function.

## Comments: why, not what

```js
// Bad: repeats the code
i++ // increment i

// Good: explains a decision the code can't
// The payment provider rejects amounts with more than 2 decimals,
// so we round here rather than at display time.
const amount = Math.round(total * 100) / 100
```

## Handling errors honestly

- **Fail loudly and early.** Check inputs at the boundary and throw a clear error rather than passing bad data deep into the system.
- **Never swallow errors** silently (`catch (e) {}`) — you've hidden a bug and lost the evidence.
- **Error messages should help the reader fix it:** "Invalid plan ID 'gold-annul' — expected one of: gold-annual, gold-monthly".
- Separate **expected** failures (a card is declined — handle it) from **bugs** (a null where there should never be one — crash and alert).

## SOLID, in plain words

Five design principles (from Robert C. Martin) for object-oriented code, covered with examples in the LLD track. In one line each:

- **S — Single responsibility:** a class should have one reason to change. An `Invoice` that also emails itself and saves itself to the database has three.
- **O — Open/closed:** add new behavior by adding new code, not editing working code — e.g. a new `UpiPayment` class instead of another `else if` in a giant payment function.
- **L — Liskov substitution:** a subclass must work anywhere its parent does. If `Square extends Rectangle` breaks code that sets width and height separately, the inheritance is wrong.
- **I — Interface segregation:** many small interfaces beat one huge one; don't force a class to implement methods it doesn't need.
- **D — Dependency inversion:** depend on abstractions. Business logic should talk to a `PaymentGateway` interface, not directly to one provider's SDK — which also makes it easy to test.

## Code smells: hints that something's wrong

A **smell** isn't a bug; it's a sign that the code will be hard to change.

| Smell | What it looks like | Usual fix |
|---|---|---|
| **Long function** | Scrolling to read one function | Extract smaller functions |
| **Duplicate code** | The same logic copy-pasted in three places | Extract a shared function |
| **Long parameter list** | `create(a, b, c, d, e, f, g)` | Group into an object |
| **Feature envy** | A method mostly uses another class's data | Move it to that class |
| **Primitive obsession** | Money as a float, phone numbers as plain strings | Small value types (`Money`, `PhoneNumber`) |
| **Shotgun surgery** | One change requires edits in 12 files | Bring related logic together |
| **Magic numbers** | `if (status === 3)` | Named constants or enums |

> [!WARN] Don't over-correct. **DRY** ("don't repeat yourself") is good advice, but merging two pieces of code that merely *look* similar — and will change for different reasons — creates a tangled abstraction that's worse than the duplication. A common rule of thumb: wait until you see the third copy.

## Refactoring: changing structure without changing behavior

**Refactoring** means improving the design of code **without changing what it does**. The safety net is tests: run them, make a small change, run them again.

> [!ANALOGY] Renovating a house while living in it. You don't knock down every wall at once; you redo one room at a time, and the house stays livable throughout.

A safe rhythm:

1. Make sure tests cover the behavior you're about to touch (write them first if needed — "characterization tests" that capture what the code does today).
2. Make **one small** change: rename, extract a function, move a method.
3. Run the tests. Commit.
4. Repeat.

> [!EXAMPLE] **Before and after: replacing a conditional with polymorphism.**
>
> Before, every new shipping method meant editing this function:
>
> ```js
> function shippingCost(order) {
>   if (order.method === 'standard') return 40
>   if (order.method === 'express') return 120 + order.weightKg * 10
>   if (order.method === 'pickup') return 0
> }
> ```
>
> After, each method is its own small object, and adding "same-day" means adding one new entry, without touching the others:
>
> ```js
> const shippingMethods = {
>   standard: { cost: () => 40 },
>   express:  { cost: (order) => 120 + order.weightKg * 10 },
>   pickup:   { cost: () => 0 },
> }
> const shippingCost = (order) => shippingMethods[order.method].cost(order)
> ```

**The boy scout rule:** leave code a little cleaner than you found it — rename one confusing variable, extract one function — as part of your normal work. Big "rewrite everything" projects usually fail; steady small improvements succeed.

> [!RECAP]
> - Clean code is code a colleague can **understand and change safely**.
> - Use **meaningful names**, **small functions** that do one thing, comments that explain **why**, and **honest error handling**.
> - **SOLID** principles keep object-oriented designs flexible.
> - **Code smells** hint at design problems; don't over-apply DRY.
> - **Refactor** in small steps protected by tests; leave code cleaner than you found it.

> [!INTERVIEW] In coding rounds, clear names, small helper functions and handling edge cases are part of the score. Interviewers also ask "how would you improve this code?" — name the smells, propose refactorings, and mention the tests you'd add first.

::quiz {"q":"What's the defining property of a refactoring?","options":["It adds a feature","It changes the code's structure without changing its behavior","It makes code shorter","It rewrites the module from scratch"],"answer":1,"explain":"Tests confirm the behavior stayed the same."}

::quiz {"q":"Which comment is most valuable?","options":["// loop over users","// increment counter","// The provider rejects >2 decimals, so we round here","// TODO"],"answer":2,"explain":"Good comments explain decisions the code can't express."}

::quiz {"q":"Two functions look similar but will change for different business reasons. Should you merge them?","options":["Always — DRY","Usually not — a shared abstraction would couple unrelated changes","Only if they're in the same file","Only in Java"],"answer":1,"explain":"Duplication is cheaper than the wrong abstraction."}
