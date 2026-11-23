---
title: How React Renders: State, Re-renders, Reconciliation and Hooks
summary: What actually happens when you call setState: render phase vs commit phase, why a parent re-render re-renders every child, keys and reconciliation, the rules of hooks, useEffect and stale closures, memoization that helps vs hurts, and where state should live.
---

::widget Scene {"title": "One setState, step by step", "sub": "a counter click through render, diff and commit", "nodes": [{"id": "btn", "kind": "user", "label": "Click \"+1\"", "x": 3.72, "y": 3.72}, {"id": "st", "kind": "cube", "label": "State: count 2 → 3", "x": 7.72, "y": -0.28, "color": "orange"}, {"id": "app", "kind": "cube", "label": "<App>", "x": 8.0, "y": -8.0, "color": "blue"}, {"id": "ctr", "kind": "cube", "label": "<Counter>", "x": 11.72, "y": -4.28, "color": "blue"}, {"id": "list", "kind": "cube", "label": "<BigList> (memo)", "x": 15.44, "y": -0.56, "color": "purple"}, {"id": "vd", "kind": "doc", "label": "New element tree", "x": 15.72, "y": -8.28, "color": "teal"}, {"id": "dom", "kind": "doc", "label": "Real DOM", "x": 19.72, "y": -12.28, "color": "green"}], "links": [["btn", "st"], ["st", "ctr"], ["app", "ctr"], ["app", "list"], ["ctr", "vd"], ["vd", "dom"]], "metrics": [["phase", "Phase"], ["renders", "Components rendered"], ["dom", "DOM changes"]], "steps": [{"short": "Click", "tag": "Event", "title": "The user clicks +1; the handler calls setCount(c => c + 1)", "body": "<p>setState doesn't change anything immediately. It schedules an update.</p>", "show": ["btn", "st"], "flow": [["btn", "st", "#f59e0b", "setCount"]], "metrics": {"phase": ["event"], "renders": ["0"], "dom": ["0"]}}, {"short": "Batch", "tag": "Batching", "title": "Updates in the same event are batched", "body": "<p>Three setState calls in one handler → one re-render, not three.</p>", "set": {"st": {"badge": "queued update"}}}, {"short": "Render", "tag": "Render phase", "title": "React calls Counter() again with the new state", "body": "<p>\"Render\" means calling your component function to get a description of the UI (elements). No DOM is touched yet. It must be pure, same inputs, same output, no side effects.</p>", "show": ["btn", "st", "app", "ctr"], "flow": [["st", "ctr", "#3b82f6", "count = 3"]], "metrics": {"phase": ["render"], "renders": ["Counter"]}}, {"short": "Children", "tag": "Render phase", "title": "Every child of a re-rendered component re-renders too", "body": "<p>By default, regardless of whether its props changed. That's usually fine, rendering is cheap; DOM updates are not.</p>", "show": ["btn", "st", "app", "ctr", "list"]}, {"short": "Memo", "tag": "Skip", "title": "React.memo(BigList) skips it when its props are equal", "body": "<p>Shallow comparison: a new object or arrow function created every render breaks it, hence useMemo / useCallback for props passed to memoised children.</p>", "set": {"list": {"badge": "skipped (props same)"}}, "metrics": {"renders": ["Counter only"]}}, {"short": "Diff", "tag": "Reconcile", "title": "Compare the new element tree with the previous one", "body": "<p>Same type at the same position → update props. Different type → throw away the subtree and rebuild. In lists, keys identify which item is which.</p>", "show": ["btn", "st", "app", "ctr", "list", "vd"], "flow": [["ctr", "vd", "#14b8a6", "diff"]], "metrics": {"phase": ["reconciliation"]}}, {"short": "Commit", "tag": "Commit phase", "title": "Commit: apply the minimal DOM changes", "body": "<p>Only the text node \"2\" becomes \"3\". Then the browser lays out and paints.</p>", "show": ["btn", "st", "app", "ctr", "list", "vd", "dom"], "flow": [["vd", "dom", "#22c55e", "textContent = 3"]], "metrics": {"phase": ["commit"], "dom": ["1 text change", "good"]}}, {"short": "Effects", "tag": "Effects", "title": "After paint, useEffect callbacks run", "body": "<p>Cleanup from the previous effect runs first. useLayoutEffect runs before paint (for measuring) and blocks it.</p>", "metrics": {"phase": ["effects"]}}, {"short": "Keys", "tag": "Pitfall", "title": "Using the array index as a key for a reorderable list", "body": "<p>Delete item 0 and React thinks every item changed identity by one, inputs keep the wrong text. Use stable IDs.</p>", "note": {"kind": "warn", "text": "key={index} is only safe for lists that never reorder, insert or delete."}}, {"short": "Model", "tag": "Summary", "title": "UI = f(state)", "body": "<p>Update state → React re-runs the functions → diffs → commits the minimum. Your job: keep renders pure, state minimal, and keys stable.</p>", "note": {"kind": "key", "text": "setState schedules; render calls components; reconciliation diffs; commit touches the DOM; effects run after paint."}}]}

## The input that lost its text

> [!STORY] A to-do app lets you edit items inline. A user types a note into item 3, then deletes item 1, and their note jumps to a different item. Nothing is wrong with the state; it holds the right text in the right place. The bug is one innocent line: `items.map((item, i) => <Row key={i} … />)`. To understand why the index key moved the text, you need to know what React actually does when state changes.

## UI as a function of state

React's core idea: you describe what the UI *should look like* for the current state, and React works out how to update the real DOM. Components are functions that return **elements** plain objects describing what to show.

```jsx
function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>Clicked {count} times</button>
}
```

## What "re-render" means

When state changes, React **re-renders** it calls your component function again to get a new description. Three triggers:

1. The component's own state changes (`useState`, `useReducer`).
2. Its parent re-renders.
3. A context it reads changes.

Note the second rule: **when a parent re-renders, all its children re-render by default** whether or not their props changed. Rendering is usually cheap, because rendering isn't DOM work, it's just calling functions.

## Render phase and commit phase

- **Render phase:** call components, build the new element tree, compare it with the old one (**reconciliation**). Must be **pure**: no network calls, no DOM mutations, no subscriptions. React may call your component more than once (Strict Mode deliberately does in development).
- **Commit phase:** apply the minimal set of DOM changes, then run effects.

Updates triggered in the same event are **batched** into one render.

## Reconciliation and keys

Comparing two arbitrary trees is expensive, so React uses two simple rules:

1. Elements of a **different type** (e.g. `<div>` vs `<span>`, `<Login>` vs `<Profile>`) produce different trees, the old subtree is unmounted, its state destroyed.
2. Among siblings in a list, **keys** tell React which item is which across renders.

With `key={index}`, deleting the first item makes every remaining item shift down one index, so React matches item 2's data to item 1's component instance, including its internal state, like an input's text. Use a stable ID: `key={item.id}`.

> [!ANALOGY] Keys are name badges at a conference. If you identify people by "the third person in the queue", someone leaving the queue makes you greet everyone by the wrong name.

## Hooks and their rules

Hooks store state *by call order*. React keeps a list of hook slots per component instance and walks it in order every render. Hence the rules:

- Call hooks only at the top level, not inside conditions or loops.
- Call them only from components or custom hooks.

### useEffect and stale closures

Effects synchronise your component with something outside React: subscriptions, timers, network requests, non-React widgets.

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000)  // updater: always fresh
  return () => clearInterval(id)                               // cleanup
}, [])
```

Each render has its own props and state, captured in closures. An interval that reads `count` directly with an empty dependency array sees `count` from the first render forever, a **stale closure**. Use the updater form, or list the value as a dependency.

> [!WARN] Many effects shouldn't exist. Values derived from props/state should be computed during render (`const total = items.reduce(...)`), not copied into state with an effect. Data fetching is better handled by a framework or a library like React Query that deals with caching, races and cancellation.

## Performance: what actually helps

1. **Measure first** with the React DevTools Profiler.
2. **Move state down** so fewer components re-render when it changes; or **lift content up** by passing children as props.
3. `React.memo` a genuinely expensive child, and stabilise its props with `useMemo` / `useCallback`. Memoising everything adds comparison cost and noise.
4. **Virtualise long lists** (only render visible rows).
5. For slow updates that can wait, mark them as **transitions** (`useTransition`) so typing stays responsive.

## Where state should live

- **Local UI state** (open/closed, input text): `useState` in the component.
- **Shared UI state**: lift to the closest common parent, or context for widely used values that change rarely (theme, current user).
- **Server data** (lists, profiles): a server-cache library or framework loaders, not global state.
- **URL state** (filters, page, tab): the URL itself, so it survives refresh and is shareable.

> [!RECAP]
> - setState schedules a re-render; updates in one event are batched.
> - Re-render = call the component; children re-render by default.
> - Render (pure, may repeat) → reconcile → **commit** minimal DOM changes → effects.
> - Different element type = remount; **keys** identify list items, never use the index for dynamic lists.
> - Hooks depend on call order; effects can capture stale values.
> - Optimise by measuring, moving state down, memoising expensive parts, and virtualising lists.

> [!INTERVIEW] Common questions: "What triggers a re-render?", "Why are keys needed?", "useEffect vs useLayoutEffect?", "What is a stale closure?", "When would you use React.memo?", "Controlled vs uncontrolled inputs?", and "How would you structure state for this app?"

::quiz {"q": "A parent re-renders. What happens to its children by default?", "options": ["Nothing", "They re-render too, even if props are unchanged", "They unmount", "Only children with state re-render"], "answer": 1, "explain": "Use React.memo to skip children whose props are equal."}

::quiz {"q": "Why is key={index} risky for a list where items can be deleted?", "options": ["Indexes are slow", "Items shift positions, so state gets matched to the wrong item", "React forbids numbers as keys", "It disables batching"], "answer": 1, "explain": "Keys must identify items, not positions."}

::quiz {"q": "An interval callback always logs the initial count. Why?", "options": ["setInterval is broken", "It captured count from the first render in a stale closure", "State updates are async", "React blocks timers"], "answer": 1, "explain": "Use the updater form or add count to dependencies."}
