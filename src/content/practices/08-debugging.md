---
title: Debugging — A Systematic Method
summary: How expert engineers find bugs reliably instead of guessing — reproducing the problem, observing before theorizing, forming and testing hypotheses, bisecting (in code, data and history), using debuggers, logs and traces well, the classic bug categories (off-by-one, concurrency, state, environment, time), rubber-duck debugging, and writing the regression test.
---

## The bug that only happened on Tuesdays

> [!STORY] A report-generation job fails roughly once a week. Engineers add logging, change timeouts, upgrade a library and restart servers — the failures continue. Finally, someone stops guessing and writes down every failure's exact timestamp. Every one happened on a day whose date didn't exist in the previous month — the 31st after a 30-day month, or the 29th–31st of March. The code computed "same day last month" by subtracting one from the month number, producing dates like 31 November or 30 February, which the database rejected. Hours of guessing; ten minutes of systematic observation.

Debugging is a skill, not luck. Experts follow a **method**, much like the scientific method: observe, hypothesize, test, repeat. The biggest difference between someone who finds bugs fast and someone who doesn't is not cleverness — it's **refusing to guess**.

> [!ANALOGY] A doctor doesn't prescribe medicine because "it might be this". They take a history, examine, form a hypothesis, order a test that would confirm or rule it out, and only then treat. Random changes to code are like prescribing random pills — sometimes the symptom goes away, and you never learn what was wrong.

## The method

::widget Stepper {"type":"cycle","title":"The debugging loop","what":"The repeatable cycle for finding the cause of a bug. Each pass narrows the search space until the cause is certain.","steps":["Press Play and go around the loop.","Notice that 'change the code' only appears after the cause is understood.","Think of the last bug you fixed — which steps did you skip?"],"nodes":[["Reproduce","Find a reliable way to make the bug happen — ideally a failing automated test. Can't reproduce it? Gather exact inputs, environment, timestamps and logs until you can, or until you see a pattern."],["Observe","Look at what actually happens, not what you assume happens: read the full error and stack trace, logs, inputs, state. Measure; don't guess."],["Hypothesize","Form a specific, testable explanation: 'the cache returns stale data after a config reload' — not 'something's wrong with caching'."],["Test the hypothesis","Design a check that would prove it right or wrong: add a log line, set a breakpoint, change one input, write a test. Change ONE thing at a time."],["Narrow down","If wrong, cross it off — you've learned something. If right, confirm the cause, not just a correlation. Keep halving the search space."],["Fix and prevent","Fix the root cause, add a regression test, and ask: where else could this same bug exist?"]]}

### 1. Reproduce reliably

A bug you can trigger on demand is half solved.

- Capture **exact inputs**: request payload, user, data, configuration, version, time.
- Shrink it to a **minimal reproduction**: remove everything not needed to trigger the bug. Often, the process of minimizing reveals the cause.
- Turn it into a **failing test** — it proves the bug exists and proves your fix works.
- For intermittent bugs: record every occurrence with full context and look for patterns (time, data, load, specific machines, versions).

### 2. Read the error message. Really read it.

A surprising number of bugs are explained by the first line of the error and the stack trace — which people skim past. Read the **whole** trace, from your code's frames outward; note the exact exception type, message and line numbers. Search the exact message (in your codebase, issue tracker and online).

### 3. Divide and conquer

The most powerful technique: **binary search** for the cause (Algorithms track).

- **In code:** add a check halfway through the flow. Is the data already wrong there? Then the bug is earlier; otherwise later. Repeat.
- **In history:** `git bisect` finds the exact commit that introduced a regression in ~log₂(n) steps (chapter 3).
- **In data:** the job fails on a 1 million-row file — does it fail on the first half? Keep halving to find the bad row.
- **In configuration and environment:** works in staging, fails in production? List the differences and test them by halves.

### 4. Change one thing at a time

If you change three things and the bug disappears, you don't know which change fixed it — or whether one of them hid it. Keep notes of what you tried and what happened.

## Tools of observation

- **Debuggers** (breakpoints, stepping, inspecting variables, conditional breakpoints, watch expressions) show exactly what the program is doing. Learn your IDE's debugger well — it's faster than print statements for complex state.
- **Logging and print statements** are fine — especially for timing issues and distributed systems where pausing changes behaviour. Log **values**, not just "got here".
- **Structured logs, metrics and traces** in production (Cloud track, chapter 7): find the failing requests, follow one trace across services.
- **Profilers** for performance bugs (chapter 9); **strace/eBPF** to see what a process is doing at the OS level (OS track, chapter 14).
- **Diffing:** compare a working and a failing input, environment, log or output side by side.

## Classic bug categories — check these first

| Category | Typical symptoms | Examples |
|---|---|---|
| **Off-by-one and boundaries** | Wrong at the edges only | `<` vs `<=`; empty lists; the last page; 31st of the month |
| **Null / missing data** | Crashes on some records | Optional fields missing; API returned no results |
| **State and mutation** | Depends on what happened before | Shared mutable default arguments; caches not invalidated; objects modified elsewhere |
| **Concurrency** | Intermittent, load-dependent, "can't reproduce" | Race conditions, deadlocks, lost updates (OS track, chapter 8; Databases track, chapter 6) |
| **Time** | Fails at certain times/dates/zones | Time zones, daylight saving changes, leap years, clock skew between servers |
| **Environment and configuration** | "Works on my machine" | Different versions, missing env vars, feature flags, file paths, locale |
| **Encoding and types** | Garbled text, wrong numbers | UTF-8 vs Latin-1; float rounding; integer overflow (Architecture track, chapter 1) |
| **Caching** | Old values appear | Browser, CDN, DNS, application or ORM caches |
| **Dependencies** | Broke after an upgrade | Changed defaults or behaviour in a library |

> [!WARN] **"It works on my machine"** is a clue, not an excuse. Your machine and production differ in specific, findable ways: versions, configuration, data, permissions, network, load. Containers and infrastructure as code shrink these differences (Cloud track).

## Rubber-duck debugging

Explain the code, line by line, to someone — or to a rubber duck on your desk. Saying "and then this function returns the user's… oh, it returns the **cached** user" surfaces assumptions you didn't know you were making. It works remarkably often, and it's why pairing on hard bugs is so effective.

## When you're stuck

- **Question your assumptions.** List everything you "know" is true and verify each one. The bug is usually hiding in one of them ("this function is definitely called", "this config is definitely loaded").
- **Take a break.** Seriously — fresh eyes find things.
- **Ask for help** with a good summary: what you expected, what happened, how to reproduce, what you've ruled out. Writing it often solves it.
- **Timebox** rabbit holes; if a mitigation exists (roll back, disable a feature), apply it while you keep investigating.

## After the fix

1. **Fix the root cause**, not the symptom. If a null crashes the code, ask why the value was null — maybe a validation is missing upstream.
2. **Add a regression test** that fails without the fix.
3. **Look for siblings:** the same mistake is often copied elsewhere (`grep` for it).
4. **Improve the system:** better error messages, logs or validation so the next bug like this is found in minutes. For significant production bugs, a blameless postmortem (Cloud track, chapter 7).

> [!RECAP]
> - Debug like a scientist: **reproduce → observe → hypothesize → test → narrow → fix and prevent**. Don't guess.
> - Get a **minimal, reliable reproduction**, ideally a failing test; **read the whole error**.
> - **Binary search** the cause in code, commit history (`git bisect`), data and configuration; change **one thing at a time**.
> - Use debuggers, logs, traces, profilers and diffs to observe.
> - Check the classic categories: boundaries, nulls, state, **concurrency**, **time**, environment, encoding, caching, dependencies.
> - Rubber-duck, question assumptions, ask well; fix root causes, add **regression tests**, and look for siblings.

> [!INTERVIEW] "Tell me about the hardest bug you've fixed" is one of the most common behavioral questions. Structure it with this method: symptoms, how you reproduced it, the hypotheses you tested, how you found the root cause, the fix, and what you changed to prevent recurrence.

::quiz {"q":"A regression appeared somewhere in the last 500 commits. What's the most efficient way to find it?","options":["Read all 500 diffs","git bisect — binary search through history (~9 steps)","Revert everything","Ask around"],"answer":1,"explain":"log₂(500) ≈ 9 test runs."}

::quiz {"q":"You change three things and the bug disappears. What's the problem?","options":["Nothing — it's fixed","You don't know which change fixed it, or whether one merely hid it","Too few changes","You need four changes"],"answer":1,"explain":"Change one thing at a time."}

::quiz {"q":"A bug appears only under heavy load and can't be reproduced locally. Which category should you suspect first?","options":["Spelling","Concurrency (races, deadlocks) or resource limits","CSS","Documentation"],"answer":1,"explain":"Load-dependent, intermittent behaviour is a classic concurrency signature."}
