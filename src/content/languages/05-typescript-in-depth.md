---
title: TypeScript in Depth — Structural Types, Generics, Narrowing and Type-Level Tools
summary: The TypeScript that senior frontend interviews expect: structural typing, unions and narrowing, discriminated unions with exhaustive checks, generics with constraints, keyof and mapped and conditional types, utility types, unknown vs any, declaration merging, strict mode settings, and how types are erased at runtime so validation still matters.
---

::widget Scene {"title": "Narrowing a discriminated union", "sub": "one API result type, three states, and the compiler catching a missed case", "nodes": [{"id": "t", "kind": "doc", "label": "type Result = Loading | Ok | Err", "x": 3.72, "y": 3.72}, {"id": "sw", "kind": "cpu", "label": "switch (r.status)", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "l", "kind": "cube", "label": "status: \"loading\"", "x": 8.38, "y": -9.62, "color": "blue"}, {"id": "o", "kind": "cube", "label": "status: \"ok\" → data", "x": 12.72, "y": -5.28, "color": "green"}, {"id": "e", "kind": "cube", "label": "status: \"error\" → error", "x": 17.06, "y": -0.94, "color": "red"}, {"id": "nv", "kind": "doc", "label": "default: never", "x": 17.22, "y": -9.78, "color": "orange"}], "links": [["t", "sw"], ["sw", "l"], ["sw", "o"], ["sw", "e"], ["sw", "nv", {"dashed": true}]], "metrics": [["type", "Type of r here"], ["check", "Compiler"]], "steps": [{"short": "Union", "tag": "Model", "title": "Model states as a union with a shared literal field", "body": "<p>{status:\"loading\"} | {status:\"ok\", data: User} | {status:\"error\", error: string}. Impossible combinations (data AND error) can't be expressed.</p>", "show": ["t"], "metrics": {"type": ["Result"], "check": ["—"]}}, {"short": "Switch", "tag": "Narrow", "title": "switch on the discriminant", "body": "<p>Before narrowing, r.data is an error: not every member has data.</p>", "show": ["t", "sw"], "metrics": {"check": ["r.data ✗ not on all members"]}}, {"short": "Ok", "tag": "Narrow", "title": "case \"ok\": the type is narrowed to Ok", "body": "<p>r.data is now typed as User — no casts.</p>", "show": ["t", "sw", "l", "o", "e"], "flow": [["sw", "o", "#22c55e", "narrowed"]], "metrics": {"type": ["Ok"], "check": ["r.data: User ✓", "good"]}}, {"short": "Err", "tag": "Narrow", "title": "case \"error\": narrowed to Err", "body": "<p>r.error is a string.</p>", "flow": [["sw", "e", "#ef4444", "narrowed"]], "metrics": {"type": ["Err"]}}, {"short": "Never", "tag": "Exhaustive", "title": "default: const _x: never = r", "body": "<p>If every case is handled, r has type never here.</p>", "show": ["t", "sw", "l", "o", "e", "nv"], "metrics": {"type": ["never"], "check": ["all cases handled", "good"]}}, {"short": "Add", "tag": "Change", "title": "Someone adds {status: \"empty\"} to Result", "body": "<p>The default branch now receives Empty, which isn't assignable to never — compile error at every switch that forgot it.</p>", "set": {"nv": {"badge": "Empty is not never!"}}, "metrics": {"type": ["Empty"], "check": ["error: unhandled case", "bad"]}}, {"short": "Runtime", "tag": "Erasure", "title": "Types vanish at runtime", "body": "<p>JSON from an API isn't checked by TypeScript. Validate at the boundary (zod, valibot) and derive the type from the schema.</p>", "set": {"nv": {"badge": null}}}, {"short": "Rule", "tag": "Summary", "title": "Make illegal states unrepresentable", "body": "<p>Discriminated unions + narrowing + never exhaustiveness turn whole bug classes into compile errors.</p>", "note": {"kind": "key", "text": "Union of objects with a literal tag → switch narrows each case → never in default makes the compiler enforce completeness."}}]}

## The bug the compiler should have caught

> [!STORY] A dashboard shows a spinner forever for some customers. The API added a new status — `"empty"` for accounts with no data — and the frontend's rendering code only handled `"loading"`, `"ok"` and `"error"`. The type was `status: string`, so TypeScript had nothing to say. With a discriminated union and an exhaustive check, the compiler would have flagged every place that forgot the new case on the day the type changed.

## Structural typing

TypeScript compares types by **shape**, not by name. If an object has the required properties, it fits:

```ts
interface Point { x: number; y: number }
const p = { x: 1, y: 2, label: 'A' }
const q: Point = p          // OK: p has x and y
```

Object literals assigned directly get an **excess property check** (`const q: Point = { x: 1, y: 2, label: 'A' }` is an error) to catch typos.

## any, unknown and never

- **`any`** turns type checking off. It spreads silently.
- **`unknown`** means "could be anything — prove what it is before using it". Use it for untrusted input and `catch` clauses.
- **`never`** is the empty type: functions that never return, impossible branches, exhaustive checks.

## Unions and narrowing

A union `string | number` means either. You **narrow** it with checks the compiler understands: `typeof`, `instanceof`, `in`, equality, `Array.isArray`, truthiness, and your own **type guards**:

```ts
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x
}
```

### Discriminated unions

Give each variant a literal tag and switch on it (see the lesson). Add `const _exhaustive: never = value` in the default branch so adding a variant breaks the build until every switch handles it.

## Generics

Generics let a function or type work over many types while preserving the relationship between them:

```ts
function first<T>(items: T[]): T | undefined { return items[0] }

function pluck<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key] }
pluck({ id: 7, name: 'Asha' }, 'name')    // string
pluck({ id: 7 }, 'email')                 // error: not a key
```

`extends` adds **constraints**; inference usually fills type arguments for you.

## Type-level tools

- **`keyof T`** — union of property names. **`T[K]`** — indexed access.
- **Mapped types** — transform every property: `{ [K in keyof T]?: T[K] }` is how `Partial` works.
- **Conditional types** — `T extends string ? 'text' : 'other'`, with `infer` to extract parts: `type Awaited<T> = T extends Promise<infer U> ? U : T`.
- **Template literal types** — `` `on${Capitalize<Event>}` `` builds `'onClick' | 'onHover'`.
- **Utility types** — `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `ReturnType`, `Parameters`, `NonNullable`.
- **`satisfies`** — check a value against a type while keeping its precise inferred type.
- **`as const`** — make literals readonly and narrow (`['a','b'] as const` is `readonly ['a','b']`).

## interface vs type

Both describe object shapes. `interface` supports **declaration merging** (handy for augmenting library types) and `extends`; `type` can express unions, mapped and conditional types. A common convention: `interface` for object contracts, `type` for everything else.

## Settings that matter

Turn on `strict` (includes `strictNullChecks` and `noImplicitAny`), plus `noUncheckedIndexedAccess` (array/record lookups may be `undefined`) and `exactOptionalPropertyTypes` for stricter models. Prefer `import type` for type-only imports.

## Types are erased

TypeScript compiles to plain JavaScript; types don't exist at runtime. Data crossing a boundary — API responses, `localStorage`, `postMessage`, form input — must be **validated** at runtime. Schema libraries (zod, valibot) validate and let you infer the type from the schema, so there's a single source of truth.

> [!RECAP]
> - Structural typing: shape matters, not names.
> - Prefer `unknown` to `any`; use `never` for exhaustiveness.
> - Narrow unions with typeof/in/instanceof/guards; model state as **discriminated unions**.
> - Generics + `keyof` + constraints keep relationships between types.
> - Mapped, conditional and template literal types build utilities like `Partial` and `ReturnType`.
> - Types are erased: validate external data at runtime.

> [!INTERVIEW] "any vs unknown?", "interface vs type?", "Implement `Partial`/`Pick`/`DeepReadonly`", "What does `keyof` do?", "How do you make a switch exhaustive?", "How do you type an API response safely?"

::quiz {"q": "What should untrusted JSON be typed as before validation?", "options": ["any", "unknown", "never", "object"], "answer": 1, "explain": "unknown forces you to check before use."}

::quiz {"q": "How do you make the compiler complain when a union gains a new variant you didn't handle?", "options": ["Use any", "Assign the value to a never-typed variable in the default branch", "Add a comment", "Use interface merging"], "answer": 1, "explain": "Unhandled variants are not assignable to never."}

::quiz {"q": "Does TypeScript validate API responses at runtime?", "options": ["Yes, automatically", "No — types are erased; validate with a schema library", "Only in strict mode", "Only for interfaces"], "answer": 1, "explain": "Types disappear after compilation."}
