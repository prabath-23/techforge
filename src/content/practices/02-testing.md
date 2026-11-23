---
title: Testing — Changing Code Without Fear
summary: Why tests are what let teams move fast, the test pyramid from unit to end-to-end, writing tests that are clear and trustworthy, when to use mocks and fakes, test-driven development, flaky tests, and testing techniques beyond examples like property-based testing.
---

## The Friday deploy

> [!STORY] Two teams each need to upgrade a library used everywhere in their code. Team A has no automated tests. They change it, click around the app for an hour, deploy nervously, and spend the weekend fixing three things customers found. Team B has 4,000 tests that run in six minutes. They change it, see 11 failures, fix them, see green, and deploy before lunch. Team B isn't more careful — they have a **safety net**.

Tests aren't mainly about catching bugs today. They're what let you **change code tomorrow** with confidence: refactor, upgrade, add features, and know immediately if you broke something.

## The test pyramid

::widget Stepper {"type":"layers","title":"The test pyramid: many fast tests at the bottom, a few slow ones at the top","what":"The four main kinds of tests, from the slowest and fewest at the top to the fastest and most numerous at the bottom.","steps":["Press Play from the top down.","For each layer, ask: how fast is it, and what kind of bug does it catch?","Decide where a test for 'a 10% discount is applied to orders over ₹1,000' belongs."],"nodes":[["End-to-end tests (few)","Drive the real app through its UI or public API, like a user would (Playwright, Cypress). The most realistic, but slow and fragile. Keep them for critical journeys: sign up, log in, checkout."],["Contract tests","Check that a service still provides what each of its consumers expects, so separate teams' services can be deployed independently (Pact)."],["Integration tests","Run your code with real dependencies — a real database, a real message queue — often in throwaway containers (Testcontainers). Catch wrong SQL, configuration and wiring mistakes."],["Unit tests (many)","Test one function or class on its own, in milliseconds. Business rules like pricing, parsing and validation belong here — thousands of them can run on every save."]]}

> [!NOTE] Some teams prefer a "testing trophy" with more integration tests, because modern tools make them fast and they catch more real bugs. The principle is the same: lots of fast tests, a few realistic slow ones, and each test at the lowest level that can catch the bug.

## Writing a good test

A good test reads like a specification. A common structure is **Arrange, Act, Assert**:

```js
test('applies a 10% discount to orders over ₹1,000', () => {
  // Arrange: set up the situation
  const order = makeOrder({ items: [{ price: 1200, qty: 1 }] })

  // Act: do the one thing being tested
  const total = calculateTotal(order)

  // Assert: check the result
  expect(total).toBe(1080)
})

test('does not discount orders of exactly ₹1,000', () => {
  const order = makeOrder({ items: [{ price: 1000, qty: 1 }] })
  expect(calculateTotal(order)).toBe(1000)
})
```

Qualities of good tests:

- **The name describes the behavior**, so a failure tells you what broke.
- **Test behavior, not implementation.** Check the output, not which private methods were called — otherwise every refactor breaks the tests.
- **One reason to fail** per test.
- **Fast and independent:** tests shouldn't depend on each other's order or leftover data.
- **Cover the edges:** empty lists, zero, negative numbers, exactly-on-the-boundary values, very large inputs, unicode, time zones.

## Mocks, stubs and fakes

Sometimes the code under test talks to something slow, expensive or unpredictable: a payment provider, the clock, email. **Test doubles** stand in for it:

- **Stub:** returns canned answers ("the payment API always says approved").
- **Mock:** also records how it was called, so you can check ("was `sendEmail` called once with this address?").
- **Fake:** a simple working implementation — an in-memory database instead of a real one.

> [!ANALOGY] A flight simulator. Pilots practise engine failures without crashing real planes. Test doubles let you practise "the payment provider times out" without a real outage.

> [!WARN] **Over-mocking** is a common trap. If a test mocks everything, it only proves your code calls the mocks the way you told it to — it can pass while the real system is broken. Mock at the edges of your system (external APIs, the clock), and use real objects inside.

## Test-driven development (TDD)

**TDD** flips the order: write a failing test first, then the code.

1. **Red:** write a small test for the next bit of behavior. Watch it fail.
2. **Green:** write the simplest code that makes it pass.
3. **Refactor:** clean up, with the tests keeping you safe.

Benefits: you only write code you need, the design becomes easier to test (and usually simpler), and you end up with tests for everything. It works especially well for logic with clear rules. Not every team uses strict TDD, but writing a failing test **before fixing a bug** is good practice everywhere — it proves the bug exists and that your fix works.

## Flaky tests

A **flaky** test sometimes passes and sometimes fails without any code change. Common causes: timing (`sleep(100)` and hoping), shared state between tests, depending on the current date or random values, and network calls.

They're poison: once people learn that failures are "probably just flaky", they ignore real failures too. Fix them quickly, or quarantine them while you do.

## Beyond examples

- **Property-based testing:** instead of a few hand-picked examples, state a rule that should always hold — "sorting a list keeps its length and gives ascending order" — and let a tool generate hundreds of random inputs, including nasty ones you'd never think of (Hypothesis, fast-check).
- **Snapshot tests:** save the output (e.g. rendered UI) and alert on any change. Handy, but easy to blindly update.
- **Mutation testing:** deliberately introduce small bugs into your code and see if the tests catch them — a measure of how good your tests really are.
- **Load and chaos testing:** how does the system behave under 10× traffic, or when a dependency dies?

> [!NOTE] **Code coverage** shows which lines ran during tests. Low coverage reveals untested areas, but high coverage doesn't prove the tests check anything meaningful. Treat it as a flashlight, not a goal.

> [!RECAP]
> - Tests are the **safety net** that lets you change code confidently.
> - The **pyramid**: many fast unit tests, some integration and contract tests, a few end-to-end tests.
> - Good tests describe behavior, use **Arrange-Act-Assert**, test behavior not implementation, and cover edge cases.
> - Use **test doubles** at the edges; avoid over-mocking.
> - **TDD**: red → green → refactor; always write a failing test before fixing a bug.
> - Fix **flaky** tests fast; consider **property-based** and mutation testing.

> [!INTERVIEW] In coding rounds, mention the test cases you'd write, especially edge cases. In design and behavioral rounds, explain your testing strategy across the pyramid, how you'd test code that calls external services, and how you dealt with flaky tests.

::quiz {"q":"Where should a test for a pricing rule's arithmetic live?","options":["End-to-end tests","Unit tests","Manual testing","Load tests"],"answer":1,"explain":"Pure business logic is fastest and clearest to test in isolation."}

::quiz {"q":"What's the risk of mocking everything in a test?","options":["Tests become too slow","The test proves only that your code calls the mocks, and can pass while the real integration is broken","Mocks are deprecated","It increases coverage too much"],"answer":1,"explain":"Mock at the system's edges; use real objects inside."}

::quiz {"q":"What should you do before fixing a reported bug?","options":["Delete related tests","Write a test that reproduces it and fails","Increase coverage targets","Mark the test as flaky"],"answer":1,"explain":"It proves the bug exists, and that your fix works and stays fixed."}
