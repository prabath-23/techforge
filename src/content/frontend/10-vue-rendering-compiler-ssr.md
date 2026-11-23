---
title: How Vue Renders: Virtual DOM, the Compiler's Optimisations, Performance and SSR
summary: What happens between your template and the DOM: compiling templates to render functions, the virtual DOM and patching, compiler-informed optimisations (static hoisting, patch flags, block trees), keyed list diffing, component update granularity, performance techniques (v-memo, v-once, shallowRef, virtual scrolling, async components), and server-side rendering with hydration, Nuxt and hydration mismatches.
---

::widget Scene {"title": "Compiler-informed patching", "sub": "only the dynamic parts of a template are compared on update", "nodes": [{"id": "tpl", "kind": "doc", "label": "<template> with 40 static nodes, 2 dynamic", "x": 3.72, "y": 3.72}, {"id": "cmp", "kind": "cpu", "label": "Template compiler", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "rf", "kind": "doc", "label": "Render fn + patch flags + hoisted statics", "x": 12.72, "y": -5.28, "color": "blue"}, {"id": "vd", "kind": "blocks", "label": "Virtual DOM (block tree)", "x": 14.12, "y": -12.88, "count": 6, "color": "teal"}, {"id": "dom", "kind": "laptop", "label": "Real DOM", "x": 20.63, "y": -6.37}], "links": [["tpl", "cmp"], ["cmp", "rf"], ["rf", "vd"], ["vd", "dom"]], "metrics": [["stage", "Stage"], ["compared", "Nodes compared on update"]], "steps": [{"short": "Compile", "tag": "Compile", "title": "At build time, the SFC compiler turns the template into a render function", "body": "<p>No template parsing in the browser (runtime-only build is smaller).</p>", "show": ["tpl", "cmp"], "flow": [["tpl", "cmp", "#a855f7", "compile"]], "metrics": {"stage": ["build"], "compared": ["-"]}}, {"short": "Hoist", "tag": "Hoist", "title": "Static nodes are hoisted out of the render function", "body": "<p>Created once and reused on every render, never diffed again.</p>", "show": ["tpl", "cmp", "rf"], "set": {"rf": {"badge": "40 static hoisted"}}}, {"short": "Flags", "tag": "Patch flags", "title": "Dynamic nodes get patch flags: TEXT, CLASS, PROPS…", "body": "<p>A node with only dynamic text gets flag TEXT, so updates compare only its text.</p>", "set": {"rf": {"badge": "2 dynamic: TEXT, CLASS"}}}, {"short": "Block", "tag": "Block tree", "title": "Dynamic descendants are collected into a flat array per block", "body": "<p>Updates walk this short list instead of the whole tree. v-if/v-for create new blocks.</p>", "show": ["tpl", "cmp", "rf", "vd"], "flow": [["rf", "vd", "#14b8a6", "vnodes"]], "metrics": {"stage": ["render"]}}, {"short": "Update", "tag": "Update", "title": "count changes: the component re-renders", "body": "<p>Only this component (whose render read count) re-renders, Vue tracks per component, so siblings are untouched.</p>"}, {"short": "Patch", "tag": "Patch", "title": "Patching compares just the 2 dynamic nodes", "body": "<p>Without compiler hints, a generic virtual DOM would compare all 42.</p>", "show": ["tpl", "cmp", "rf", "vd", "dom"], "flow": [["vd", "dom", "#22c55e", "textContent"]], "metrics": {"compared": ["2 of 42", "good"]}}, {"short": "Keys", "tag": "Lists", "title": "For v-for lists, keys drive a diff that moves nodes", "body": "<p>Vue uses the longest increasing subsequence of old positions to minimise DOM moves.</p>"}, {"short": "SSR", "tag": "SSR", "title": "With SSR, the server renders HTML; the client hydrates it", "body": "<p>Hydration attaches listeners and reactivity to existing DOM instead of recreating it. Server and client output must match.</p>", "note": {"kind": "key", "text": "Templates compile to render functions with hoisted statics, patch flags and block trees, so updates touch only dynamic parts, and only components whose dependencies changed."}}]}

## Why Vue is fast by default

Vue combines two ideas: fine-grained **reactivity** decides *which components* re-render (only those whose render read the changed data), and a **compiler-informed virtual DOM** decides *which parts* of a component's DOM to compare. Knowing both helps you write fast apps and debug slow ones.

## From template to render function

Templates are compiled (at build time with Vite) to **render functions** that return **virtual nodes (vnodes)** plain objects describing elements, components and text. On the first render, Vue creates real DOM from vnodes; on updates, it builds new vnodes and **patches** the DOM by comparing with the previous ones.

You can write render functions or JSX yourself (`h('div', { class: 'card' }, children)`), but templates let the compiler optimise.

## Compiler optimisations

- **Static hoisting:** nodes with no dynamic bindings are created once and reused; they're skipped during patching.
- **Patch flags:** each dynamic node records *what* can change (text, class, style, specific props), so the patcher checks only that.
- **Block trees:** dynamic nodes inside a block are tracked in a flat array; the patcher walks that list rather than the full tree. Structural directives (`v-if`, `v-for`) start new blocks.
- **Event handler caching** avoids re-creating inline handlers.

The result: update cost scales with the number of **dynamic** bindings, not the size of the template.

## Keyed list diffing

For `v-for`, Vue matches old and new children by `key`: it patches common prefixes and suffixes, then for the moved middle section computes the **longest increasing subsequence** of old indices, nodes in that subsequence stay put, everything else is moved. Without keys (or with index keys), Vue patches in place, which breaks component state in reordered lists.

## Component update granularity

Each component has its own render effect. A change triggers only components that read the changed data. Passing a whole object as a prop to many children means any change to it re-renders all of them; passing just the needed primitive values narrows updates. Stable props matter: an inline object literal or a new array created in the parent's render is a new prop value every time.

## Performance toolkit

| Problem | Tool |
|---|---|
| huge list in the DOM | virtual scrolling (vue-virtual-scroller, TanStack Virtual) |
| expensive subtree that rarely changes | `v-memo="[deps]"`, `v-once` |
| big data made deeply reactive | `shallowRef`, `markRaw` |
| derived values recomputed in templates | `computed` |
| large initial bundle | lazy routes and `defineAsyncComponent`, code-splitting |
| re-creating heavy components on toggle | `<KeepAlive>` |
| slow mounts | defer non-critical components (`<Suspense>`/lazy hydration in Nuxt) |

Measure with Vue Devtools' performance timeline and the browser Performance panel before optimising.

## Server-side rendering and hydration

With SSR (Nuxt, or Vue's `renderToString`), the server runs your components and sends HTML, fast first paint and SEO. The client then **hydrates**: it renders the same vnodes and attaches them to the existing DOM instead of rebuilding it.

**Hydration mismatches** happen when server and client render different output:

- using `Date.now()`, `Math.random()` or locale-dependent formatting during render,
- reading `window`/`localStorage` during render (doesn't exist on the server),
- invalid HTML nesting (`<div>` inside `<p>`) that the browser "fixes".

Fixes: render client-only parts inside `onMounted` or `<ClientOnly>`, pass server-generated values to the client (Nuxt `useState`, `useAsyncData`), and keep HTML valid. Vue 3.5 adds `data-allow-mismatch` for intentional differences and lazy hydration strategies for async components.

**SSR state safety:** module-level reactive state is shared across all requests on the server, leak risk. Create state per request (Pinia stores, Nuxt `useState`).

## Nuxt in one paragraph

Nuxt adds file-based routing, server routes (API endpoints), data fetching with caching (`useFetch`, `useAsyncData`), SSR/SSG/hybrid rendering per route, auto-imports, and deployment presets. For a Vue developer, it's what Next.js is to React.

> [!RECAP]
> - Templates compile to render functions returning vnodes; patching updates the DOM.
> - Compiler hints, **static hoisting, patch flags, block trees** make updates proportional to dynamic bindings.
> - Keyed diffing uses the longest increasing subsequence to minimise moves.
> - Only components whose dependencies changed re-render; keep props narrow and stable.
> - Performance: virtual scrolling, `v-memo`, shallow refs, lazy components, KeepAlive.
> - SSR renders HTML then hydrates; avoid mismatches and request-shared state.

> [!INTERVIEW] "How does Vue's virtual DOM differ from React's?", "What are patch flags?", "Why are keys important in v-for?", "How would you render 100k rows?", "What causes hydration mismatches?", "What does Nuxt add?"

::quiz {"q": "What do patch flags tell Vue's runtime?", "options": ["Which component to mount", "Which aspects of a dynamic node can change, so only those are compared", "Which CSS to load", "Which routes are lazy"], "answer": 1, "explain": "Compiler hints narrow the diff."}

::quiz {"q": "Which causes a hydration mismatch?", "options": ["Using computed", "Rendering Date.now() during render on both server and client", "Using v-for with keys", "Lazy routes"], "answer": 1, "explain": "Server and client produce different HTML."}

::quiz {"q": "Why can module-level reactive state be dangerous in SSR?", "options": ["It is slower", "It is shared across all users' requests on the server", "It cannot be reactive", "It breaks the router"], "answer": 1, "explain": "Create state per request."}
