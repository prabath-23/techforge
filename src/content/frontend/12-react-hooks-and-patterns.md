---
title: React Hooks and Patterns: Effects, Memoisation, Refs, Reducers, Custom Hooks and Data Fetching
summary: Using hooks well: when you need useEffect (and when you don't), dependency arrays and cleanup, useMemo and useCallback with React.memo, useRef for DOM and mutable values, useReducer for complex state, custom hooks, data fetching with TanStack Query, Suspense and transitions, error boundaries, server components in Next.js, and state-management choices.
---

::widget Scene {"title": "A search box done right with hooks", "sub": "debounce, fetch, cancel stale requests, and avoid infinite loops", "nodes": [{"id": "in", "kind": "laptop", "label": "Input: query", "x": 3.72, "y": 3.72}, {"id": "deb", "kind": "cpu", "label": "useDebounce(query, 300)", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "eff", "kind": "cube", "label": "useEffect([debounced])", "x": 12.72, "y": -5.28, "color": "orange"}, {"id": "api", "kind": "server", "label": "Search API", "x": 17.22, "y": -9.78, "color": "teal"}, {"id": "res", "kind": "doc", "label": "results state", "x": 18.92, "y": 0.92, "color": "green"}], "links": [["in", "deb"], ["deb", "eff"], ["eff", "api"], ["api", "res", {"dashed": true}]], "metrics": [["requests", "Requests sent"], ["issue", "Issue"]], "steps": [{"short": "Type", "tag": "Input", "title": "The user types \"laptop\", 6 keystrokes, 6 renders", "body": "<p>Fetching on every keystroke would send 6 requests.</p>", "show": ["in"], "metrics": {"requests": ["-"], "issue": ["-"]}}, {"short": "Debounce", "tag": "Custom hook", "title": "A custom hook returns the value only after 300 ms of quiet", "body": "<p>Inside: useEffect sets a timeout, and its cleanup clears the previous one.</p>", "show": ["in", "deb"], "flow": [["in", "deb", "#a855f7", "l, la, lap…"]], "metrics": {"requests": ["0 so far"]}}, {"short": "Effect", "tag": "Effect", "title": "useEffect(() => { …fetch… }, [debounced])", "body": "<p>Runs after render when debounced changes, synchronising with an external system (the network).</p>", "show": ["in", "deb", "eff"], "flow": [["deb", "eff", "#f59e0b", "\"laptop\""]], "metrics": {"requests": ["1", "good"]}}, {"short": "Race", "tag": "Race", "title": "Fast typing: response for \"lap\" arrives AFTER \"laptop\"", "body": "<p>Without cleanup, stale results overwrite fresh ones.</p>", "show": ["in", "deb", "eff", "api", "res"], "flow": [["eff", "api", "#14b8a6", "lap"], ["eff", "api", "#14b8a6", "laptop"], ["api", "res", "#ef4444", "lap (late!)"]], "metrics": {"issue": ["out-of-order results", "bad"]}}, {"short": "Cleanup", "tag": "Cleanup", "title": "Return a cleanup that aborts the previous request", "body": "<p>const c = new AbortController(); fetch(url, { signal: c.signal }); return () => c.abort().</p>", "flow": [["api", "res", "#22c55e", "laptop only"]], "metrics": {"issue": ["fixed", "good"]}}, {"short": "Loop", "tag": "Pitfall", "title": "Putting an object created in render into the deps → infinite loop", "body": "<p>{ page: 1 } is a new object every render, so the effect runs every render and setState re-renders… Use primitives or useMemo.</p>", "set": {"eff": {"badge": "deps: [filters] ✗"}}}, {"short": "Query", "tag": "Better", "title": "Better still: a data-fetching library (TanStack Query)", "body": "<p>useQuery({ queryKey: [\"search\", debounced], queryFn }), caching, deduping, cancellation, retries, loading and error states built in.</p>", "set": {"eff": {"label": "useQuery([\"search\", q])", "badge": null}}}, {"short": "Rule", "tag": "Rule", "title": "Effects are for syncing with external systems", "body": "<p>Derived values → compute in render. User events → handle in the event handler. Fetching → a library or framework loader.</p>", "note": {"kind": "key", "text": "Custom hooks bundle logic; effects need correct dependencies and cleanup; avoid unstable deps; prefer data libraries over hand-written fetch effects."}}]}

## You might not need an effect

> [!STORY] A React codebase has a `useEffect` that copies `props.items` into state, another that filters that state into a second state, and a third that saves it to local storage. Each causes an extra render, and one occasionally loops forever. Replacing the first two with a plain calculation during render deletes 30 lines and two bugs. React's hooks are simple to call and easy to misuse; knowing when *not* to use them is half the skill.

## Rules of hooks

Call hooks at the top level of components or custom hooks, never in conditions, loops or nested functions, because React matches hook state by **call order**. The ESLint plugin enforces this and checks effect dependencies.

## useEffect: synchronising with the outside world

```jsx
useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)          // cleanup before re-run and on unmount
}, [tick])
```

- Runs **after** the commit (paint). `useLayoutEffect` runs before paint, only for measuring layout.
- **Dependencies:** every reactive value used inside (props, state, functions defined in the component). `[]` = run once after mount; no array = after every render.
- **Cleanup** runs before the next effect and on unmount: unsubscribe, clear timers, abort fetches.
- In development, Strict Mode mounts, unmounts and remounts components to expose missing cleanups.

When **not** to use an effect:

| Situation | Do instead |
|---|---|
| derive a value from props/state | compute during render (`useMemo` if expensive) |
| respond to a user action | put the logic in the event handler |
| reset state when a prop changes | give the component a `key` |
| fetch data | TanStack Query / SWR / framework loaders |
| notify parent of a change | call the callback in the event handler |

## useMemo, useCallback and React.memo

- `useMemo(() => compute(a, b), [a, b])` caches a value between renders.
- `useCallback(fn, deps)` caches a function identity.
- `React.memo(Component)` skips re-rendering when props are shallow-equal.

They work **together**: memoising a child is useless if the parent passes a new object or function each render. Use them for genuinely expensive computations, for stable dependencies of effects, and for props of memoised children, not everywhere. The **React Compiler** (React 19 era) can insert much of this memoisation automatically.

## useRef

- A **mutable box** that persists across renders without causing re-renders: timers, previous values, latest callback.
- **DOM access:** `const input = useRef(null); <input ref={input} />; input.current.focus()`.
- Don't read or write `ref.current` during rendering (except lazy initialisation).

## useReducer for complex state

```jsx
function cartReducer(state, action) {
  switch (action.type) {
    case 'add': return { ...state, items: [...state.items, action.item] }
    case 'remove': return { ...state, items: state.items.filter(i => i.id !== action.id) }
    default: return state
  }
}
const [cart, dispatch] = useReducer(cartReducer, { items: [] })
dispatch({ type: 'add', item })
```

Good when several values change together or the next state depends on the previous in many ways. Easy to unit-test (pure function).

## Custom hooks

Extract reusable stateful logic, the equivalent of Vue composables:

```jsx
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
```

Each component calling a hook gets its **own** state; hooks share logic, not state.

## Data fetching

Hand-written fetch effects need loading, error, cancellation, caching, deduplication, refetching and race handling. Use **TanStack Query** (`useQuery`, `useMutation` with cache invalidation and optimistic updates), SWR, or framework data loading (Next.js server components, React Router loaders).

## Suspense, transitions and error boundaries

- **Suspense** shows a fallback while children wait for code (`lazy()`) or data (with Suspense-enabled libraries).
- **`useTransition` / `useDeferredValue`** mark updates as non-urgent so typing stays responsive while a heavy list re-renders.
- **Error boundaries** (a class component or a library like `react-error-boundary`) catch render errors in a subtree and show fallback UI.

## Server components (Next.js App Router)

**React Server Components** run on the server only: they can query databases directly and send rendered output without shipping their JavaScript to the browser. Interactive parts are **client components** (`'use client'`). Server actions handle form submissions. It reduces bundle size and data waterfalls, at the cost of a new mental model about what runs where.

## State management choices

- Local `useState`/`useReducer` first.
- Context for rarely changing global values (theme, user).
- **Server state** in TanStack Query.
- A store for complex shared client state: **Zustand** (small), **Redux Toolkit** (structured, devtools), **Jotai** (atoms).
- URL state for filters and pagination.

> [!RECAP]
> - Hooks depend on call order; follow the rules.
> - `useEffect` only to sync with external systems, with complete dependencies and cleanup; derive in render otherwise.
> - `useMemo`/`useCallback` + `React.memo` together, where measured.
> - `useRef` for DOM and mutable values; `useReducer` for complex state.
> - Custom hooks share logic; data libraries handle fetching.
> - Suspense, transitions, error boundaries; server components in Next.js.

> [!INTERVIEW] "useEffect vs useLayoutEffect?", "What causes an infinite effect loop?", "useMemo vs useCallback?", "When is React.memo useless?", "How do you avoid race conditions when fetching?", "What are server components?", "Custom hook vs component?"

::quiz {"q": "Which belongs in an event handler rather than useEffect?", "options": ["Subscribing to a WebSocket", "Sending an analytics event when the user clicks Buy", "Syncing with a chart library", "Setting document.title from state"], "answer": 1, "explain": "Responses to user actions go in handlers."}

::quiz {"q": "An effect depends on `filters = { page: 1 }` created during render and calls setState. Result?", "options": ["Runs once", "An infinite loop, a new object every render changes the dependency", "A compile error", "Nothing renders"], "answer": 1, "explain": "Use primitives or useMemo for stable deps."}

::quiz {"q": "Two components call the same custom hook. Do they share state?", "options": ["Yes", "No, each call has its own state", "Only in Strict Mode", "Only with context"], "answer": 1, "explain": "Hooks share logic, not state."}
