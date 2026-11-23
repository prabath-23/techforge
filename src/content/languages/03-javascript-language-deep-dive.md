---
title: JavaScript Under the Hood — Scope, Closures, this, Prototypes and Promises
summary: The JavaScript questions that trip people up: var vs let and hoisting, closures and the loop-variable classic, the four rules for `this`, prototypes behind classes, equality and type coercion, promises, async/await error handling, and how modules and garbage collection work.
---

::widget Scene {"title": "Closures: the classic loop bug", "sub": "why three timers print 3, 3, 3 with var — and 0, 1, 2 with let", "nodes": [{"id": "loop", "kind": "doc", "label": "for (var i = 0; i < 3; i++) setTimeout(() => log(i))", "x": 3.72, "y": 3.72}, {"id": "env", "kind": "cells", "label": "scope with var: one i", "x": 6.0, "y": -6.0, "values": [0]}, {"id": "c1", "kind": "cube", "label": "callback 1", "x": 10.45, "y": -13.55, "color": "blue"}, {"id": "c2", "kind": "cube", "label": "callback 2", "x": 15.72, "y": -8.28, "color": "blue"}, {"id": "c3", "kind": "cube", "label": "callback 3", "x": 20.99, "y": -3.01, "color": "blue"}, {"id": "lets", "kind": "cells", "label": "with let: one i per iteration", "x": 14.37, "y": 2.37, "values": [0, 1, 2]}], "links": [["c1", "env", {"dashed": true}], ["c2", "env", {"dashed": true}], ["c3", "env", {"dashed": true}]], "metrics": [["i", "i"], ["out", "Printed"]], "steps": [{"short": "Closure", "tag": "Idea", "title": "A closure = a function + the variables it can see from where it was created", "body": "<p>Each arrow function keeps a reference to the scope it was defined in — not a copy of the values.</p>", "show": ["loop"], "metrics": {"i": ["—"], "out": ["—"]}}, {"short": "Var", "tag": "var", "title": "var is function-scoped: the whole loop shares ONE i", "body": "<p>Every iteration updates the same variable.</p>", "show": ["loop", "env"], "set": {"env": {"marks": {"0": "orange"}, "ptr": {}, "values": [0]}}, "metrics": {"i": ["0"]}}, {"short": "Schedule", "tag": "Loop", "title": "Three callbacks are created, all closing over that same i", "body": "<p>They don't run yet — timers wait until the loop finishes.</p>", "show": ["loop", "env", "c1", "c2", "c3"], "set": {"env": {"marks": {"0": "orange"}, "ptr": {}, "values": [2]}}, "metrics": {"i": ["0 → 1 → 2"]}}, {"short": "End", "tag": "Loop end", "title": "The loop ends when i becomes 3", "body": "<p>That final value is what every callback will see.</p>", "set": {"env": {"marks": {"0": "red"}, "ptr": {}, "values": [3]}}, "metrics": {"i": ["3"]}}, {"short": "Run", "tag": "Output", "title": "Timers fire: each reads the shared i", "body": "<p>3, 3, 3.</p>", "flow": [["c1", "env", "#ef4444", "i?"], ["c2", "env", "#ef4444", "i?"], ["c3", "env", "#ef4444", "i?"]], "metrics": {"out": ["3, 3, 3", "bad"]}}, {"short": "Let", "tag": "let", "title": "let is block-scoped: each iteration gets a fresh binding", "body": "<p>Each callback closes over its own i.</p>", "show": ["loop", "c1", "c2", "c3", "lets"], "set": {"lets": {"marks": {"0": "green", "1": "green", "2": "green"}, "ptr": {}}}, "metrics": {"out": ["0, 1, 2", "good"]}}, {"short": "Use", "tag": "Uses", "title": "Closures power private state, callbacks and React hooks", "body": "<p>function counter() { let n = 0; return () => ++n } — n is private to the returned function.</p>"}, {"short": "Stale", "tag": "Pitfall", "title": "The same mechanism causes stale values in React effects", "body": "<p>A callback created in render 1 sees render 1's values forever.</p>", "note": {"kind": "key", "text": "Closures capture variables, not values. var shares one binding per function; let creates one per block iteration."}}]}

## Three lines that fail half the interviews

> [!STORY] An interviewer writes `for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0)` and asks what it prints. Many experienced developers say "0, 1, 2". It prints "3, 3, 3". The next question — "how would you fix it?" — opens a conversation about scope, closures, the event loop and `let`. JavaScript's quirks are well known, and interviewers use them to check whether you understand how the language actually works.

## Scope and hoisting

- **`var`** is **function-scoped** and **hoisted**: its declaration moves to the top of the function, initialised to `undefined`.
- **`let` and `const`** are **block-scoped** (`{ }`) and also hoisted, but stay uninitialised until their line runs — the **temporal dead zone**. Accessing them earlier throws.
- **Function declarations** are hoisted completely, so you can call them before they appear.
- `const` prevents reassignment of the binding, not mutation of the object.

```js
console.log(a)   // undefined (var hoisted)
console.log(b)   // ReferenceError (TDZ)
var a = 1; let b = 2
```

Default to `const`, use `let` when reassigning, avoid `var`.

## Closures

A **closure** is a function together with the scope it was created in. Inner functions keep access to outer variables even after the outer function has returned:

```js
function makeCounter() {
  let count = 0
  return { inc: () => ++count, get: () => count }
}
const c = makeCounter(); c.inc(); c.get()   // 1 — count is private
```

Closures capture **variables**, not values — which is exactly why the `var` loop prints `3, 3, 3` and `let` fixes it (a fresh binding per iteration).

## The four rules for `this`

`this` is decided by **how a function is called**, not where it's written (except arrow functions):

1. **`new Foo()`** → the newly created object.
2. **Explicit** `fn.call(obj)`, `fn.apply(obj)`, `fn.bind(obj)` → `obj`.
3. **Method call** `obj.fn()` → `obj`.
4. **Plain call** `fn()` → `undefined` in strict mode (the global object in sloppy mode).

**Arrow functions** have no `this` of their own; they use the `this` of the surrounding scope. That's why they're handy for callbacks inside methods — and wrong as object methods that need `this`.

```js
const user = { name: 'Asha', hi() { return this.name } }
const f = user.hi; f()          // undefined — plain call, rule 4
setTimeout(user.hi, 0)          // same problem; use user.hi.bind(user) or () => user.hi()
```

## Prototypes behind classes

Every object has a hidden link to a **prototype**. Property lookup walks this **prototype chain** until it finds the property or reaches `null`. `class` syntax is sugar over prototypes: methods live on `ClassName.prototype`, shared by all instances.

```js
class Animal { speak() { return 'sound' } }
class Dog extends Animal { speak() { return 'woof' } }
Object.getPrototypeOf(Dog.prototype) === Animal.prototype   // true
```

## Equality and coercion

- **`===`** compares without type conversion — use it.
- **`==`** converts types first: `0 == ''` and `null == undefined` are true, `[] == false` is true. Avoid except for `x == null` (checks both null and undefined).
- `NaN !== NaN`; use `Number.isNaN`. `Object.is` treats `NaN` as equal to itself and `+0`/`-0` as different.
- Objects compare by **reference**: `{} === {}` is false.

## Promises and async/await

A **promise** represents a future value: pending, then fulfilled or rejected. Callbacks attached with `.then` run as microtasks (Frontend chapter 2).

- `Promise.all` — all succeed, or fail fast on the first rejection.
- `Promise.allSettled` — wait for all, report each result.
- `Promise.race` / `Promise.any` — first to settle / first to succeed.

`async/await` makes promise code read sequentially. Two common mistakes:

```js
// 1. Accidental sequential waits — 3 seconds instead of 1
const a = await getA(); const b = await getB(); const c = await getC()
// Run independent work in parallel:
const [a2, b2, c2] = await Promise.all([getA(), getB(), getC()])

// 2. Unhandled rejections — always try/catch or .catch()
try { await save() } catch (e) { showError(e) }
```

`forEach` doesn't wait for async callbacks; use `for…of` with `await` (sequential) or `Promise.all(items.map(...))` (parallel).

## Modules and memory

- **ES modules** (`import`/`export`) are static, so bundlers can tree-shake unused code; module code runs once and is shared.
- JavaScript is garbage-collected by **reachability** (mark-and-sweep). Leaks come from forgotten event listeners, timers, growing caches and closures holding large objects. Use `WeakMap`/`WeakRef` for caches keyed by objects.

> [!RECAP]
> - `var` function-scoped and hoisted; `let`/`const` block-scoped with a TDZ.
> - Closures capture variables, enabling private state — and the classic loop bug.
> - `this`: new → explicit bind → method call → plain call; arrows inherit `this`.
> - Classes sit on prototypes; lookup walks the prototype chain.
> - Use `===`; objects compare by reference.
> - Promises + async/await: parallelise with `Promise.all`, always handle rejections.

> [!INTERVIEW] Expect output-prediction puzzles (hoisting, closures, `this`, event loop ordering), "implement debounce / Promise.all / bind", "explain prototypal inheritance", and "== vs ===".

::quiz {"q": "What does `for (let i=0;i<3;i++) setTimeout(()=>console.log(i))` print?", "options": ["3 3 3", "0 1 2", "undefined ×3", "2 2 2"], "answer": 1, "explain": "let creates a new binding per iteration."}

::quiz {"q": "const f = obj.method; f() — what is `this` inside (strict mode)?", "options": ["obj", "the global object", "undefined", "f"], "answer": 2, "explain": "It's a plain call, so this is undefined."}

::quiz {"q": "How do you run three independent async calls in parallel?", "options": ["await each one in turn", "await Promise.all([a(), b(), c()])", "Use forEach with await", "Wrap them in setTimeout"], "answer": 1, "explain": "Start them all, then await together."}
