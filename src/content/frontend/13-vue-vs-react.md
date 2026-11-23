---
title: Vue vs React: Reactivity Models, Rendering, Ecosystems and How to Choose
summary: A side-by-side comparison for engineers who use one and are interviewed on the other: push-based fine-grained reactivity vs re-running component functions, templates vs JSX, mutation vs immutability, update granularity and memoisation, composables vs hooks, state management, SSR frameworks (Nuxt vs Next.js), performance, TypeScript support, and when each fits.
---

::widget Scene {"title": "One state change, two frameworks", "sub": "how Vue and React decide what to re-render after count++", "nodes": [{"id": "vs", "kind": "cube", "label": "Vue: count.value++", "x": 0.0, "y": 0.0, "color": "green"}, {"id": "vd", "kind": "doc", "label": "Dep tracking: count → [Counter]", "x": 4.5, "y": -4.5, "color": "teal"}, {"id": "vc", "kind": "cube", "label": "Re-render Counter only", "x": 9.0, "y": -9.0, "color": "green"}, {"id": "rs", "kind": "cube", "label": "React: setCount(c => c + 1)", "x": 7.44, "y": 7.44, "color": "blue"}, {"id": "rr", "kind": "cube", "label": "Re-run Counter + children", "x": 11.94, "y": 2.94, "color": "blue"}, {"id": "rm", "kind": "doc", "label": "memo / compiler to skip", "x": 16.44, "y": -1.56, "color": "purple"}], "links": [["vs", "vd"], ["vd", "vc"], ["rs", "rr"], ["rr", "rm"]], "metrics": [["vue", "Vue"], ["react", "React"]], "steps": [{"short": "Change", "tag": "Change", "title": "Same feature: a counter inside a page with a heavy chart", "body": "<p>How much work does one click cause?</p>", "show": ["vs", "rs"], "metrics": {"vue": ["mutation of a ref"], "react": ["setState with a new value"]}}, {"short": "VueTrack", "tag": "Vue", "title": "Vue knows exactly which effects read count", "body": "<p>Push-based: the write triggers only dependent component renders.</p>", "show": ["vs", "vd", "rs"], "flow": [["vs", "vd", "#22c55e", "trigger"]], "metrics": {"vue": ["dependency graph"]}}, {"short": "VueRender", "tag": "Vue", "title": "Only Counter re-renders; the chart sibling is untouched", "body": "<p>No memoisation needed for this.</p>", "show": ["vs", "vd", "vc", "rs"], "flow": [["vd", "vc", "#22c55e", "render"]], "metrics": {"vue": ["1 component", "good"]}}, {"short": "ReactRun", "tag": "React", "title": "React re-runs the component that owns the state, and all its children by default", "body": "<p>Pull-based: it calls functions and diffs the output.</p>", "show": ["vs", "vd", "vc", "rs", "rr"], "flow": [["rs", "rr", "#3b82f6", "re-render"]], "metrics": {"react": ["component subtree"]}}, {"short": "ReactMemo", "tag": "React", "title": "Skip the chart with React.memo + stable props (or let the React Compiler do it)", "body": "<p>Explicit control, more to think about.</p>", "show": ["vs", "vd", "vc", "rs", "rr", "rm"], "flow": [["rr", "rm", "#a855f7", "skip chart"]], "metrics": {"react": ["memoised", "good"]}}, {"short": "Trade", "tag": "Trade-off", "title": "Vue: less to optimise manually. React: simpler mental model of \"UI = f(state)\" per render", "body": "<p>Both are fast enough for nearly all apps; architecture matters more.</p>"}, {"short": "Choose", "tag": "Choose", "title": "Choose by team, ecosystem and constraints, not benchmarks", "body": "<p>Existing skills, hiring market, SSR framework needs, component libraries, mobile (React Native).</p>", "note": {"kind": "key", "text": "Vue: fine-grained push reactivity + compiler-optimised templates. React: re-run components with immutable state + explicit or compiled memoisation. Same core ideas, different defaults."}}]}

## Same destination, different roads

Both frameworks render UI from state, use components with props and one-way data flow, diff a virtual DOM, support SSR, and have mature ecosystems. The differences are in **how they detect change** **how you write components** and **what you must optimise yourself**. Interviewers often ask a Vue developer "how would this work in React?", this chapter gives you the mapping.

## Reactivity model

| | Vue 3 | React |
|---|---|---|
| Change detection | **Push:** Proxy-based tracking knows which effects read which data | **Pull:** calling `setState` re-runs the component; React diffs the result |
| State updates | mutate refs/reactive objects | replace values immutably |
| Re-render scope | only components whose render read the changed data | the owner component and its descendants (unless memoised) |
| Derived state | `computed` (cached automatically) | compute in render, `useMemo` for expensive work |
| Side effects | `watch`, `watchEffect` (auto-tracked deps) | `useEffect` (manual dependency arrays) |
| Optimisation | mostly automatic | `React.memo`, `useMemo`, `useCallback`, or the React Compiler |

Vue's model removes whole classes of bugs (stale closures, missing dependencies) but introduces its own (losing reactivity by destructuring, deep proxies on huge data). React's model is explicit and predictable ("each render is a snapshot"), at the cost of manual dependency management.

## Writing components

| | Vue | React |
|---|---|---|
| Markup | HTML-like templates with directives (or JSX) | JSX |
| File | SFC: script + template + scoped style | JS/TS module; styling chosen separately |
| Logic reuse | composables | custom hooks |
| Parent ← child | `emit` / `defineModel` | callback props |
| Content projection | slots, scoped slots | `children`, render props, element props |
| Deep dependency | provide/inject | context |
| Two-way binding | `v-model` | `value` + `onChange` |

Composables and hooks look similar but run differently: a composable's `setup` code runs **once** per component instance; a hook runs on **every render** which is why hooks need dependency arrays and `useCallback` while composables don't.

## Rendering and performance

- Vue's compiler knows which template parts are static and hoists them, flags dynamic bindings, and patches only those.
- React's runtime is more general; the **React Compiler** brings automatic memoisation; **concurrent rendering** (transitions, Suspense) lets React interrupt and prioritise renders.
- Real-world performance depends far more on list virtualisation, bundle size, data fetching and avoiding unnecessary work than on the framework.

## Ecosystem

| Need | Vue | React |
|---|---|---|
| Meta-framework (SSR, routing, data) | **Nuxt** | **Next.js** Remix/React Router |
| State | Pinia | Zustand, Redux Toolkit, Jotai |
| Server data | TanStack Query (Vue), Nuxt `useFetch` | TanStack Query, SWR, RSC |
| UI libraries | Vuetify, PrimeVue, Element Plus, Naive UI | MUI, Chakra, Mantine, shadcn/ui |
| Testing | Vitest + Vue Test Utils | Vitest/Jest + React Testing Library |
| Mobile | (Capacitor, Ionic) | **React Native** |

## TypeScript

Both have excellent TypeScript support today: Vue through `<script setup lang="ts">`, typed `defineProps`/`defineEmits` and Volar tooling; React through typed props and hooks. JSX type-checks naturally; Vue templates are type-checked by Vue's language tools.

## How to choose

- **Team and hiring:** what your engineers know and what you can hire for.
- **Product needs:** React Native for shared mobile code; Nuxt/Next for SEO-heavy sites.
- **Existing code and component libraries.**
- **Preference:** templates and built-in conventions (Vue) vs JavaScript-everything and a larger ecosystem (React).

Either can build anything; consistency and good architecture matter more than the choice.

## Translating your Vue experience in interviews

Describe your work in framework-neutral terms first ("I split the dashboard state into URL state, server cache and a small client store; virtualised the 50k-row table; moved heavy formatting off the main thread"), then the Vue specifics. Be ready to sketch the React equivalent: `computed` → derived values/`useMemo`, `watch` → `useEffect` with cleanup, composable → custom hook, Pinia → Zustand/Redux Toolkit, Nuxt → Next.js.

> [!RECAP]
> - Vue: Proxy-based push reactivity; mutate; computed/watch auto-track; fine-grained re-renders.
> - React: re-run components; immutable updates; dependency arrays; memoise (or compile) to skip work.
> - Templates + SFCs vs JSX; composables (run once) vs hooks (run every render).
> - Nuxt ↔ Next.js, Pinia ↔ Zustand/Redux, slots ↔ children/render props.
> - Choose on team, ecosystem and product needs.

> [!INTERVIEW] "Compare Vue and React reactivity", "Why does React need useCallback but Vue doesn't?", "How would you port this Vue component to React?", "Which would you pick for a new product and why?"

::quiz {"q": "Why do React hooks need dependency arrays while Vue composables usually don't?", "options": ["React is older", "Hooks run on every render, so React must be told when to re-run effects; Vue tracks dependencies automatically and setup runs once", "Vue has no effects", "Dependency arrays are optional in React"], "answer": 1, "explain": "Different execution models."}

::quiz {"q": "Which is the Vue equivalent of React context?", "options": ["Slots", "provide/inject", "v-model", "Pinia only"], "answer": 1, "explain": "Both pass values to deep descendants."}

::quiz {"q": "In Vue, which components re-render when a ref changes?", "options": ["All components", "Only components whose render read that ref", "The root component", "Its whole subtree always"], "answer": 1, "explain": "Fine-grained dependency tracking."}
