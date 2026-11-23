---
title: React Fundamentals: JSX, Components, Props, State, Events, Lists and Forms
summary: Everyday React, explained for someone who knows Vue: JSX and how it compiles, function components, props and children, useState and immutable updates, event handling, conditional rendering, lists with keys, controlled forms, lifting state up, composition instead of slots, context, and styling options.
---

::widget Scene {"title": "State lives in one place; data flows down", "sub": "a filterable product list: lifting state up and passing callbacks", "nodes": [{"id": "app", "kind": "cube", "label": "ProductPage (owns query)", "x": 3.72, "y": 3.72, "color": "green"}, {"id": "search", "kind": "cube", "label": "SearchBar", "x": 5.0, "y": -5.0, "color": "blue"}, {"id": "list", "kind": "cube", "label": "ProductList", "x": 12.44, "y": 2.44, "color": "blue"}, {"id": "state", "kind": "doc", "label": "const [query, setQuery] = useState(\"\")", "x": -2.48, "y": -2.48, "color": "orange"}, {"id": "dom", "kind": "laptop", "label": "DOM", "x": 13.72, "y": -6.28}], "links": [["state", "app"], ["app", "search", {"label": "value + onChange"}], ["app", "list", {"label": "filtered items"}], ["list", "dom"], ["search", "dom"]], "metrics": [["flow", "Data flow"], ["api", "React API"]], "steps": [{"short": "JSX", "tag": "JSX", "title": "Components are functions that return JSX", "body": "<p>&lt;SearchBar value={query} /&gt; compiles to a function call creating an element object. JSX is JavaScript: {expressions}, className, onClick.</p>", "show": ["app"], "metrics": {"flow": ["-"], "api": ["function component"]}}, {"short": "State", "tag": "State", "title": "useState gives a value and a setter", "body": "<p>Calling setQuery schedules a re-render with the new value. Never mutate state directly.</p>", "show": ["app", "state"], "flow": [["state", "app", "#f59e0b", "query"]], "metrics": {"api": ["useState"]}}, {"short": "Lift", "tag": "Lift state up", "title": "Both children need query → it lives in their common parent", "body": "<p>SearchBar edits it, ProductList reads it, the parent owns it.</p>", "show": ["app", "state", "search", "list"]}, {"short": "Controlled", "tag": "Controlled input", "title": "SearchBar is controlled: value={query} onChange={e => onChange(e.target.value)}", "body": "<p>The input shows exactly what state says. (Vue's v-model = this pattern built in.)</p>", "flow": [["app", "search", "#3b82f6", "value"]], "metrics": {"flow": ["props down"], "api": ["value + onChange"]}}, {"short": "Event", "tag": "Callback up", "title": "Typing calls the parent's callback, which calls setQuery", "body": "<p>React has no emit, children receive functions as props.</p>", "flow": [["search", "app", "#ec4899", "onChange(\"lap\")"]], "metrics": {"flow": ["callback up"]}}, {"short": "Derive", "tag": "Derive", "title": "The parent derives the filtered list during render", "body": "<p>const visible = products.filter(p => p.name.includes(query)), no extra state, no effect.</p>", "flow": [["app", "list", "#3b82f6", "visible items"]], "metrics": {"api": ["derive in render (useMemo if expensive)"]}}, {"short": "Keys", "tag": "Lists", "title": "ProductList maps items to rows with key={p.id}", "body": "<p>Keys tell React which row is which across renders.</p>", "show": ["app", "state", "search", "list", "dom"], "flow": [["list", "dom", "#22c55e", "rows"]]}, {"short": "Render", "tag": "Re-render", "title": "setQuery re-renders ProductPage and its children", "body": "<p>React re-runs the functions, diffs the result and commits minimal DOM changes.</p>", "note": {"kind": "key", "text": "State in the closest common owner → props down → callbacks up → derive during render → keys for lists. Immutable updates trigger re-renders."}}]}

## React for a Vue developer

React and Vue share most ideas, components, props, one-way data flow, a virtual DOM, but differ in style. Vue gives you templates, directives and automatic dependency tracking; React gives you JavaScript (JSX) everywhere and explicit state updates that re-run component functions. This chapter covers the fundamentals; *How React Renders* and *React Hooks and Patterns* go deeper.

## JSX

```jsx
function ProductCard({ product, onAdd }) {
  return (
    <article className="card">
      <h3>{product.name}</h3>
      {product.stock === 0 ? <span className="badge">Sold out</span> : null}
      <button onClick={() => onAdd(product.id)} disabled={product.stock === 0}>Add</button>
    </article>
  )
}
```

- JSX compiles to function calls (`jsx('article', { className: 'card', children: [...] })`) that create plain element objects.
- `{}` holds any JavaScript expression; attributes use camelCase (`className`, `htmlFor`, `onClick`, `tabIndex`).
- A component returns one root (use `<>…</>` fragments for several).
- Text is escaped by default; `dangerouslySetInnerHTML` is the (named-to-scare-you) equivalent of `v-html`.

## Components, props and children

- Components are functions taking a **props** object; names start with a capital letter.
- Props are read-only. Pass anything: values, objects, **functions** (callbacks), and **JSX** (`children` or other props).
- `children` is React's default slot; "render props" and passing components as props play the role of named and scoped slots.

```jsx
<Modal title="Delete order?" footer={<Button onClick={confirm}>Delete</Button>}>
  This cannot be undone.
</Modal>
```

## State with useState

```jsx
const [items, setItems] = useState([])
setItems(prev => [...prev, newItem])               // add (new array)
setItems(prev => prev.filter(i => i.id !== id))     // remove
setItems(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i))  // update one
```

- State updates are **asynchronous and batched**; the new value appears on the next render.
- Use the **updater form** (`prev => …`) when the new state depends on the old.
- **Immutability matters:** React compares by reference. `items.push(x); setItems(items)` does nothing (same array). This is the biggest mental shift from Vue, where mutation is tracked.

## Events

`onClick={handleClick}` (pass the function, don't call it). Handlers receive synthetic events with the familiar API (`e.preventDefault()`, `e.target.value`). Pass arguments with an arrow: `onClick={() => remove(id)}`.

## Conditional rendering and lists

```jsx
{loading && <Spinner />}
{error ? <ErrorBox error={error} /> : <Results items={items} />}
{items.map(item => <Row key={item.id} item={item} />)}
```

> [!WARN] `{count && <Badge />}` renders the number `0` when count is 0. Use `count > 0 &&` or a ternary.

Keys must be stable and unique among siblings, IDs, not indexes, for lists that change.

## Forms: controlled inputs

```jsx
const [email, setEmail] = useState('')
<input type="email" value={email} onChange={e => setEmail(e.target.value)} />
```

A **controlled** input's value comes from state; every keystroke updates state. Uncontrolled inputs keep their own value (read via a ref or `FormData`), simpler for large forms; libraries like React Hook Form combine both approaches efficiently.

## Lifting state up

When two components need the same state, move it to their closest common parent and pass it down with callbacks to change it (see the lesson). If many distant components need it, use **context** or a store.

## Context

```jsx
const ThemeContext = createContext('light')
<ThemeContext.Provider value={theme}><App /></ThemeContext.Provider>
const theme = useContext(ThemeContext)
```

Equivalent to Vue's provide/inject. Every consumer re-renders when the value changes, split contexts or memoise the value object.

## Styling

CSS Modules, Tailwind, CSS-in-JS libraries, or plain CSS with conventions. Unlike Vue's `<style scoped>`, React has no built-in scoped styles.

## Vue ↔ React quick map

| Vue | React |
|---|---|
| template + directives | JSX + JavaScript |
| `ref`/`reactive`, mutate | `useState`, replace immutably |
| `computed` | compute in render / `useMemo` |
| `watch` | `useEffect` (for synchronising with outside systems) |
| `emit('x')` | callback prop `onX()` |
| `v-model` | `value` + `onChange` |
| slots / scoped slots | `children` / render props / element props |
| `provide/inject` | context |
| `v-if` / `v-for` | `&&`, ternary / `.map()` |
| Pinia | Zustand, Redux Toolkit, Jotai |
| Vue Router | React Router / Next.js routing |
| Nuxt | Next.js |

> [!RECAP]
> - Components are functions returning JSX; props are read-only; `children` is the default slot.
> - `useState` + **immutable updates**; updater form for dependent updates.
> - Callbacks instead of emits; controlled inputs instead of v-model.
> - Derive data during render; keys on lists; beware `0 &&`.
> - Lift state up; context for widely shared values.

> [!INTERVIEW] "Why must React state be updated immutably?", "Controlled vs uncontrolled inputs?", "How do siblings share state?", "What does key do?", "How does React differ from Vue's reactivity?"

::quiz {"q": "Why does `items.push(x); setItems(items)` not re-render?", "options": ["push is async", "It passes the same array reference, so React sees no change", "setItems needs a callback", "Lists cannot re-render"], "answer": 1, "explain": "Create a new array: [...items, x]."}

::quiz {"q": "What renders for `{count && <Badge />}` when count is 0?", "options": ["Nothing", "The number 0", "An empty Badge", "An error"], "answer": 1, "explain": "Use count > 0 && or a ternary."}

::quiz {"q": "React equivalent of Vue's emit(\"save\")?", "options": ["useEmit", "Calling a callback prop like onSave()", "dispatchEvent", "useContext"], "answer": 1, "explain": "Children receive functions as props."}
