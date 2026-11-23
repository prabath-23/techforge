---
title: Vue Reactivity in Depth: Proxies, ref vs reactive, Effects, computed, watch and nextTick
summary: How Vue 3 knows what to re-render: Proxy-based reactive objects, dependency tracking (track) and triggering (trigger), effects and the scheduler, ref vs reactive and why destructuring loses reactivity, computed caching and laziness, watch vs watchEffect with flush timing and cleanup, nextTick and batched DOM updates, shallow and readonly variants, toRaw and markRaw, and the performance pitfalls of deep reactivity.
---

::widget Scene {"title": "How a reactive change reaches the DOM", "sub": "track on read, trigger on write, batched re-render", "nodes": [{"id": "st", "kind": "cube", "label": "state = reactive({ count: 0 })", "x": 3.72, "y": 3.72, "color": "orange"}, {"id": "px", "kind": "cube", "label": "Proxy get/set traps", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "dep", "kind": "doc", "label": "Dep map: state.count → {effects}", "x": 2.02, "y": -6.98, "color": "teal"}, {"id": "eff", "kind": "cpu", "label": "Render effect (component)", "x": 9.62, "y": -8.38, "color": "blue"}, {"id": "cmp", "kind": "cpu", "label": "computed: double", "x": 15.82, "y": -2.18, "color": "green"}, {"id": "q", "kind": "queue", "label": "Scheduler queue (microtask)", "x": 17.22, "y": -9.78, "color": "pink"}, {"id": "dom", "kind": "laptop", "label": "DOM", "x": 21.22, "y": -13.78}], "links": [["st", "px"], ["px", "dep"], ["dep", "eff", {"dashed": true}], ["dep", "cmp", {"dashed": true}], ["eff", "q"], ["q", "dom"]], "metrics": [["phase", "Phase"], ["renders", "Renders"], ["note", "Note"]], "steps": [{"short": "Proxy", "tag": "Wrap", "title": "reactive() wraps the object in a Proxy", "body": "<p>Every property get and set goes through traps. ref() wraps a single value in an object with a .value getter/setter.</p>", "show": ["st", "px"], "metrics": {"phase": ["setup"], "renders": ["0"], "note": ["Proxy-based"]}}, {"short": "Run", "tag": "First render", "title": "The component's render runs inside an effect", "body": "<p>Vue marks \"the currently running effect\" globally while it renders.</p>", "show": ["st", "px", "eff"], "metrics": {"phase": ["initial render"], "renders": ["1"]}}, {"short": "Track", "tag": "Track", "title": "Reading state.count during render calls track()", "body": "<p>Vue records: state.count → this render effect. Only properties actually read are tracked.</p>", "show": ["st", "px", "eff", "dep"], "flow": [["px", "dep", "#14b8a6", "track(count)"]], "set": {"dep": {"badge": "count → [render]"}}}, {"short": "Computed", "tag": "computed", "title": "A computed (double = count × 2) is lazy and cached", "body": "<p>It tracks count when first read and caches the result until count changes.</p>", "show": ["st", "px", "eff", "dep", "cmp"], "set": {"dep": {"badge": "count → [render, double]"}}}, {"short": "Write", "tag": "Trigger", "title": "state.count++ three times in a click handler", "body": "<p>Each set calls trigger(): the computed is marked dirty and the render effect is queued.</p>", "flow": [["st", "px", "#f59e0b", "set ×3"], ["dep", "eff", "#ef4444", "trigger"], ["dep", "cmp", "#ef4444", "dirty"]], "metrics": {"phase": ["writes"]}}, {"short": "Batch", "tag": "Batch", "title": "The scheduler dedupes jobs and flushes once in a microtask", "body": "<p>Three writes → one re-render. The DOM isn't updated synchronously.</p>", "show": ["st", "px", "eff", "dep", "cmp", "q"], "flow": [["eff", "q", "#ec4899", "queue job (deduped)"]], "set": {"q": {"badge": "1 job"}}, "metrics": {"phase": ["scheduled"], "note": ["batched"]}}, {"short": "Patch", "tag": "Patch", "title": "The render runs again, diffs the virtual DOM and patches only what changed", "body": "<p>double recomputes on read during this render.</p>", "show": ["st", "px", "eff", "dep", "cmp", "q", "dom"], "flow": [["q", "dom", "#22c55e", "patch text"]], "metrics": {"phase": ["flush"], "renders": ["2", "good"]}}, {"short": "Tick", "tag": "nextTick", "title": "Need the updated DOM? await nextTick()", "body": "<p>Reading el.offsetHeight right after state.count++ gives the old layout.</p>", "metrics": {"note": ["await nextTick() for new DOM"]}}, {"short": "Lose", "tag": "Pitfall", "title": "const { count } = state, destructuring copies the value; reactivity is lost", "body": "<p>Use toRefs(state), keep state.count, or use ref() for primitives.</p>", "set": {"st": {"badge": "destructured = plain number"}}, "metrics": {"note": ["use toRefs", "bad"]}, "note": {"kind": "key", "text": "Reads track (property → effects); writes trigger; effects are queued, deduped and flushed in a microtask; computed is lazy and cached; nextTick waits for the flush."}}]}

## "I changed it, why didn't it update?"

> [!STORY] A developer stores a user object in `reactive()`, then writes `let { name } = user` to keep the template tidy. Typing in the profile form updates `user.name`, but the header still shows the old name. Another developer reads an element's height right after changing data and gets the old value. Both bugs come from not knowing how Vue's reactivity actually works: what gets tracked, when updates run, and what breaks the connection.

## Proxies: intercepting reads and writes

Vue 3 makes objects reactive with JavaScript **Proxies**. `reactive(obj)` returns a proxy whose `get` trap records who read a property and whose `set` trap notifies them when it changes. Nested objects are wrapped lazily when accessed (deep reactivity). Arrays, `Map` and `Set` are supported too.

`ref(value)` wraps any value, including primitives, which proxies can't wrap, in an object with a reactive `.value`. In templates, top-level refs are unwrapped automatically.

## Track and trigger

Vue keeps a global "currently running effect". While an effect runs (a component render, a computed, a watcher), every reactive read calls **track(target, key)** recording `target.key → effect` in a dependency map. A write calls **trigger(target, key)** which schedules every effect that depends on it.

Consequences:

- **Only what is read is tracked.** A property read only inside a `setTimeout` callback isn't a dependency of the render.
- **Dependencies are re-collected on every run** so conditional branches track exactly what they used this time.

## The scheduler, batching and nextTick

Component re-renders aren't run synchronously on each write. Jobs are queued, **deduplicated** sorted parent-before-child, and flushed together in a microtask. Ten writes in one handler cause one render.

```js
count.value++
console.log(el.value.textContent)   // still the OLD text
await nextTick()
console.log(el.value.textContent)   // updated
```

## ref vs reactive

| | `ref()` | `reactive()` |
|---|---|---|
| Holds | any value (primitives too) | objects, arrays, Map, Set |
| Access | `.value` in script, unwrapped in templates | direct properties |
| Replace whole value | `x.value = newObj` ✓ | reassigning the variable loses reactivity ✗ |
| Destructuring | keep the ref itself | loses reactivity unless `toRefs()` |

The common recommendation: **use `ref()` by default**; it's consistent and survives replacement. Use `reactive()` for a grouped state object you never reassign.

```js
const state = reactive({ name: 'Asha', age: 30 })
const { name } = state            // ✗ plain string, not reactive
const { age } = toRefs(state)     // ✓ ref linked to state.age
```

Passing `state.count` (a number) into a composable passes a value, not a reference, pass the ref, the whole reactive object, or a getter `() => state.count`.

## computed

- **Lazy:** computed only runs when something reads it.
- **Cached:** re-runs only after a dependency changes.
- Should be **pure** no side effects, no async.
- Writable computed with `get`/`set` is possible but rarely needed.
- In 3.4+, a computed that recomputes to the same value doesn't trigger its dependents.

## watch vs watchEffect

```js
watch(userId, async (id, oldId, onCleanup) => {
  const ctrl = new AbortController()
  onCleanup(() => ctrl.abort())          // cancel the stale request when userId changes again
  user.value = await fetchUser(id, { signal: ctrl.signal })
}, { immediate: true })

watchEffect(() => localStorage.setItem('theme', theme.value))   // tracks whatever it reads
```

- `watch`, explicit sources (a ref, a getter, an array of them), gives old and new values, lazy by default (`immediate: true` to run at once).
- Watching a `reactive` object is deep automatically; watching a getter returning an object is shallow unless `deep: true` (expensive on large structures).
- `watchEffect`, runs immediately and tracks whatever it reads; good for simple synchronisation.
- **Flush timing:** default `'pre'` (before the component updates), `'post'` (after DOM update, use to read the new DOM; `watchPostEffect`), `'sync'` (immediately, rarely wise).
- Watchers created synchronously in `setup` stop automatically on unmount; ones created asynchronously must be stopped manually.
- **Cleanup** (`onCleanup` / `onWatcherCleanup` in 3.5) prevents race conditions in async watchers.

## Shallow, readonly and raw

- `shallowRef` / `shallowReactive`, only the top level is reactive. Big immutable data (a 50k-row dataset, a map instance, chart data) should be shallow; replace it to trigger updates (`rows.value = newRows`) or call `triggerRef`.
- `readonly()`, a read-only proxy, e.g. for exposing store state.
- `toRaw()`, the original object (for passing to third-party libraries or comparisons).
- `markRaw()`, never make this object reactive (class instances from libraries, map/editor objects).

> [!WARN] Deep reactivity has a cost: wrapping a huge nested object creates many proxies and tracks many dependencies. Large lists and third-party objects should be `shallowRef` or `markRaw`.

## Common reactivity bugs

1. Destructuring `reactive` objects or props (in versions before 3.5's reactive props destructure).
2. Reassigning a `reactive()` variable (`state = reactive({...})`), the template still holds the old proxy.
3. Comparing a proxy with the raw object (`proxy === raw` is false).
4. Expecting the DOM to update synchronously, use `nextTick`.
5. Async watchers without cleanup, responses arrive out of order.
6. Side effects in computed.

> [!RECAP]
> - **Proxies** intercept get/set; `ref` wraps values in `.value`.
> - **track** on read, **trigger** on write; only read properties are dependencies.
> - Updates are **batched** in a microtask; `nextTick` waits for the DOM.
> - Prefer `ref`; don't destructure `reactive` without `toRefs`.
> - computed: lazy, cached, pure. watch: explicit, old/new values, cleanup, flush timing. watchEffect: auto-tracked.
> - Use `shallowRef`/`markRaw` for large or foreign objects.

> [!INTERVIEW] "How does Vue 3 reactivity work?", "Vue 2 (Object.defineProperty) vs Vue 3 (Proxy)?", "ref vs reactive?", "Why did destructuring break reactivity?", "computed vs watch?", "What is nextTick for?", "How would you handle a 100k-row table reactively?"

::quiz {"q": "What happens with `const { count } = reactive({ count: 0 })`?", "options": ["count stays reactive", "count is a plain number; reactivity is lost", "Vue throws", "count becomes a ref"], "answer": 1, "explain": "Use toRefs() or keep the object."}

::quiz {"q": "You change state three times in one click handler. How many re-renders?", "options": ["Three", "One, jobs are batched and deduped", "None", "Depends on the browser"], "answer": 1, "explain": "The scheduler flushes once in a microtask."}

::quiz {"q": "Which is right for a 50,000-row dataset you replace wholesale?", "options": ["reactive() deeply", "shallowRef() and replace .value", "watch with deep: true", "v-html"], "answer": 1, "explain": "Avoid deep proxies on large data."}
