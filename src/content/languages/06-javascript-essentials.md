---
title: JavaScript Essentials: Values, Functions, Objects, Arrays, Modules and Async
summary: Modern JavaScript (ES2015+) from the ground up: primitive and reference values, let/const, functions and arrow functions, objects, destructuring and spread, arrays and their methods, Map/Set, classes, modules, error handling, promises and async/await, and the DOM and fetch basics, with a glossary.
---

::widget Scene {"title": "JavaScript in one small program", "sub": "the essentials, one step at a time", "nodes": [{"id": "val", "kind": "doc", "label": "Values & types", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "decl", "kind": "doc", "label": "let / const", "x": 4.2, "y": -4.2, "color": "purple"}, {"id": "fn", "kind": "doc", "label": "Functions & arrows", "x": 8.4, "y": -8.4, "color": "orange"}, {"id": "obj", "kind": "doc", "label": "Objects & destructuring", "x": 12.6, "y": -12.6, "color": "teal"}, {"id": "arr", "kind": "doc", "label": "Arrays", "x": 6.51, "y": 6.51, "color": "green"}, {"id": "coll", "kind": "doc", "label": "Map & Set", "x": 10.71, "y": 2.31, "color": "pink"}, {"id": "cls", "kind": "doc", "label": "Classes & modules", "x": 14.91, "y": -1.89, "color": "blue"}, {"id": "async", "kind": "doc", "label": "Promises & async", "x": 19.11, "y": -6.09, "color": "purple"}, {"id": "err", "kind": "doc", "label": "Errors", "x": 19.01, "y": 6.41, "color": "orange"}], "links": [], "metrics": [["c", "Concept"], ["n", "Progress"]], "steps": [{"short": "Types", "tag": "Types", "title": "Seven primitives plus objects", "body": "<p>string, number, bigint, boolean, undefined, null, symbol, and objects (including arrays and functions). typeof null is \"object\" (a historic bug).</p>", "show": ["val"], "focus": ["val"], "metrics": {"c": ["Values & types"], "n": ["1 of 9"]}}, {"short": "Variables", "tag": "Variables", "title": "const by default, let when reassigning, avoid var", "body": "<p>Block-scoped; const prevents reassignment, not mutation of the object.</p>", "show": ["val", "decl"], "focus": ["decl"], "metrics": {"c": ["let / const"], "n": ["2 of 9"]}}, {"short": "Functions", "tag": "Functions", "title": "Functions are values; arrow functions are short and inherit this", "body": "<p><code>const add = (a, b) => a + b</code>. Default parameters and rest parameters <code>(...args)</code>.</p>", "show": ["val", "decl", "fn"], "focus": ["fn"], "metrics": {"c": ["Functions & arrows"], "n": ["3 of 9"]}}, {"short": "Objects", "tag": "Objects", "title": "Object literals, destructuring and spread", "body": "<p><code>const {id, ...rest} = user</code>; <code>{...defaults, ...overrides}</code> merges (shallow).</p>", "show": ["val", "decl", "fn", "obj"], "focus": ["obj"], "metrics": {"c": ["Objects & destructuring"], "n": ["4 of 9"]}}, {"short": "Arrays", "tag": "Arrays", "title": "map / filter / reduce / find / some / every / flatMap", "body": "<p>Non-mutating methods return new arrays; sort and splice mutate (toSorted/toSpliced don't).</p>", "show": ["val", "decl", "fn", "obj", "arr"], "focus": ["arr"], "metrics": {"c": ["Arrays"], "n": ["5 of 9"]}}, {"short": "Map/Set", "tag": "Collections", "title": "Map for any-key dictionaries, Set for uniqueness", "body": "<p>Map keeps insertion order and allows object keys; plain objects coerce keys to strings.</p>", "show": ["val", "decl", "fn", "obj", "arr", "coll"], "focus": ["coll"], "metrics": {"c": ["Map & Set"], "n": ["6 of 9"]}}, {"short": "Classes", "tag": "Structure", "title": "class syntax over prototypes; ES modules with import/export", "body": "<p>Private fields with #, static members, extends/super.</p>", "show": ["val", "decl", "fn", "obj", "arr", "coll", "cls"], "focus": ["cls"], "metrics": {"c": ["Classes & modules"], "n": ["7 of 9"]}}, {"short": "Async", "tag": "Async", "title": "async/await over promises; fetch for HTTP", "body": "<p><code>const res = await fetch(url); if (!res.ok) throw …; const data = await res.json()</code>.</p>", "show": ["val", "decl", "fn", "obj", "arr", "coll", "cls", "async"], "focus": ["async"], "metrics": {"c": ["Promises & async"], "n": ["8 of 9"]}}, {"short": "Errors", "tag": "Errors", "title": "try/catch/finally, throw Error objects, handle rejections", "body": "<p>Unhandled promise rejections are bugs; always await or .catch().</p>", "show": ["val", "decl", "fn", "obj", "arr", "coll", "cls", "async", "err"], "focus": ["err"], "metrics": {"c": ["Errors"], "n": ["9 of 9"]}, "note": {"kind": "key", "text": "JavaScript = primitives + objects, const/let, first-class functions, destructuring/spread, rich array methods, Map/Set, classes and modules, and promise-based async."}}]}

## The language of the web, and much more

JavaScript runs every web page, Node.js servers, desktop apps (Electron) and tooling. Its quirks are famous, but modern JavaScript (ES2015 onwards) is a pleasant, expressive language. This is the everyday toolkit; the deep-dive chapter covers scope, `this`, prototypes and the event loop in detail.

## Values and types

- **Primitives** (immutable, compared by value): `string`, `number` (64-bit float, `0.1 + 0.2 !== 0.3`), `bigint` (`123n`), `boolean`, `undefined`, `null`, `symbol`.
- **Objects** (compared by reference): plain objects, arrays, functions, `Date`, `Map`, `Set`…
- `typeof x`, `Array.isArray(x)`, `x instanceof Cls`.
- `Number.isInteger`, `Number.MAX_SAFE_INTEGER` (2⁵³ − 1, use bigint beyond), `parseInt(s, 10)`, `Number(s)`.
- Use `===`; `??` (nullish coalescing) gives a default only for `null`/`undefined`; `?.` (optional chaining) stops on null.

```js
const port = config.port ?? 8080          // 0 stays 0, unlike ||
const city = user?.address?.city          // undefined instead of a crash
```

## Variables

`const` by default, `let` when you reassign, avoid `var` (function-scoped, hoisted). Block scoping matters in loops and closures.

## Functions

```js
function area(w, h = w) { return w * h }            // default parameter
const sum = (...nums) => nums.reduce((a, b) => a + b, 0)   // rest parameters
const greet = ({ name, title = 'there' }) => `Hi ${name ?? title}`  // destructured parameter
```

Functions are values: pass them as callbacks, return them (closures). Arrow functions don't have their own `this` or `arguments`.

## Objects, destructuring and spread

```js
const user = { id: 7, name: 'Asha', roles: ['admin'] }
const { id, ...profile } = user                 // pick and collect the rest
const updated = { ...user, name: 'Asha R.' }    // shallow copy with an override
const deep = structuredClone(user)              // deep copy
Object.keys(user), Object.values(user), Object.entries(user)
Object.fromEntries(entries)
```

Spread copies are **shallow**: nested objects are still shared.

## Arrays

```js
const paid = orders.filter(o => o.paid)
const totals = paid.map(o => o.total)
const revenue = totals.reduce((sum, t) => sum + t, 0)
const big = orders.find(o => o.total > 1000)
orders.some(o => o.refunded); orders.every(o => o.total > 0)
const sorted = orders.toSorted((a, b) => a.total - b.total)   // non-mutating
const byCity = Object.groupBy(customers, c => c.city)          // ES2024
```

Mutating methods: `push`, `pop`, `shift` (O(n)), `unshift`, `splice`, `sort`, `reverse`. `sort()` without a comparator sorts **as strings** (`[10, 9, 1].sort()` → `[1, 10, 9]`).

## Map and Set

```js
const counts = new Map()
for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
const unique = [...new Set(ids)]
```

`Map` allows any key type and keeps insertion order; `WeakMap` holds keys weakly (no memory leak for caches keyed by objects).

## Classes and modules

```js
// payment.js
export class Payment {
  #secret                       // private field
  static count = 0
  constructor(amount) { this.amount = amount; Payment.count++ }
  get rupees() { return this.amount / 100 }
}
export default function pay(p) { /* ... */ }

// app.js
import pay, { Payment } from './payment.js'
```

ES modules are static (enable tree-shaking), run once, and are strict mode by default. Node also supports the older CommonJS (`require`).

## Async

```js
async function loadUser(id) {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
const [user, orders] = await Promise.all([loadUser(7), loadOrders(7)])
```

`Promise.all` (fail fast), `allSettled`, `race`, `any`; `AbortController` cancels fetches and timeouts.

## Errors

`throw new Error('message', { cause })`; `try { } catch (e) { } finally { }`. Custom errors extend `Error`. Always handle promise rejections (`await` in try/catch or `.catch`).

## In the browser

`document.querySelector`, `element.addEventListener('click', handler)`, `element.textContent` (safe) vs `innerHTML` (XSS risk), `classList`, `dataset`, `localStorage`, `fetch`. Frameworks (React, Vue) manage most DOM updates for you.

## Glossary

| Term | Meaning |
|---|---|
| hoisting | declarations moved to the top of their scope |
| closure | function + the variables it captured |
| prototype | the object another object inherits from |
| truthy / falsy | values treated as true/false in conditions |
| nullish | `null` or `undefined` |
| promise | object representing a future value |
| event loop | mechanism running tasks and microtasks on one thread |
| ES module | `import`/`export` module system |
| transpile | convert newer syntax to older (Babel, TypeScript) |
| polyfill | code adding a missing feature to older environments |

> [!RECAP]
> - Primitives vs objects; numbers are floats; use `===`, `??`, `?.`.
> - `const`/`let`; arrow functions; default and rest parameters.
> - Destructuring and spread (shallow); `structuredClone` for deep copies.
> - Array methods (and which ones mutate); `sort` needs a comparator for numbers.
> - Map/Set; classes with private fields; ES modules.
> - async/await with `Promise.all`; always handle rejections.

> [!INTERVIEW] "== vs ===?", "?? vs ||?", "Why does [10, 9, 1].sort() give [1, 10, 9]?", "Map vs object?", "Shallow vs deep copy?", "Explain Promise.all vs allSettled".

::quiz {"q": "What does `[10, 9, 1].sort()` return?", "options": ["[1, 9, 10]", "[1, 10, 9]", "[10, 9, 1]", "error"], "answer": 1, "explain": "Default sort compares strings; pass (a, b) => a - b."}

::quiz {"q": "config.port is 0. What is `config.port || 8080` vs `config.port ?? 8080`?", "options": ["8080 and 0", "0 and 8080", "0 and 0", "8080 and 8080"], "answer": 0, "explain": "|| treats 0 as falsy; ?? only replaces null/undefined."}

::quiz {"q": "Does `{...user}` copy nested objects?", "options": ["Yes, deeply", "No, it is a shallow copy; nested objects are shared", "Only arrays", "It throws"], "answer": 1, "explain": "Use structuredClone for a deep copy."}
