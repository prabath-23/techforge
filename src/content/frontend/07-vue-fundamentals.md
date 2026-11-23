---
title: Vue 3 Fundamentals: Templates, Directives, Components, Props, Events and Slots
summary: Everyday Vue 3 done right: single-file components with script setup, template syntax and directives (v-bind, v-on, v-if vs v-show, v-for with keys, v-model), computed vs methods, props with validation and one-way data flow, emits, v-model on components, slots including scoped slots, lifecycle hooks, template refs, attribute fallthrough and the common mistakes.
---

::widget Scene {"title": "A parent–child component conversation", "sub": "props down, events up, v-model and a scoped slot in one TodoList", "nodes": [{"id": "par", "kind": "cube", "label": "TodoPage (parent)", "x": 3.72, "y": 3.72, "color": "green"}, {"id": "list", "kind": "cube", "label": "TodoList (child)", "x": 9.72, "y": -2.28, "color": "blue"}, {"id": "item", "kind": "cube", "label": "slot: #item=\"{ todo }\"", "x": 15.92, "y": 3.92, "color": "purple"}, {"id": "state", "kind": "doc", "label": "todos = ref([...])", "x": -2.48, "y": -2.48, "color": "orange"}, {"id": "dom", "kind": "laptop", "label": "Rendered DOM", "x": 15.72, "y": -8.28}], "links": [["state", "par"], ["par", "list", {"label": "props"}], ["list", "par", {"label": "emits", "dashed": true}], ["list", "item"], ["list", "dom"]], "metrics": [["dir", "Direction"], ["api", "Vue API"]], "steps": [{"short": "SFC", "tag": "SFC", "title": "Each component is a .vue file: <script setup>, <template>, <style scoped>", "body": "<p>script setup is compiled: top-level bindings are available in the template automatically.</p>", "show": ["par", "state"], "metrics": {"dir": ["-"], "api": ["<script setup>"]}}, {"short": "State", "tag": "State", "title": "The parent owns the data: const todos = ref([...])", "body": "<p>The component that owns state is the one that changes it.</p>", "flow": [["state", "par", "#f59e0b", "reactive"]]}, {"short": "Props", "tag": "Props down", "title": "Pass data down: <TodoList :todos=\"todos\" filter=\"open\" />", "body": "<p>The child declares defineProps&lt;{ todos: Todo[]; filter?: string }&gt;(). Props are read-only in the child.</p>", "show": ["par", "state", "list"], "flow": [["par", "list", "#3b82f6", ":todos"]], "metrics": {"dir": ["parent → child"], "api": ["defineProps"]}}, {"short": "Mutate", "tag": "Pitfall", "title": "Never mutate a prop: props.todos.push(...) in the child", "body": "<p>It breaks one-way data flow (and for objects/arrays it silently mutates the parent's state). Emit an event instead.</p>", "set": {"list": {"badge": "✗ props.todos.push"}}}, {"short": "Emit", "tag": "Events up", "title": "The child emits: emit(\"toggle\", todo.id)", "body": "<p>defineEmits&lt;{ toggle: [id: number] }&gt;(). The parent listens with @toggle=\"onToggle\" and updates its own state.</p>", "set": {"list": {"badge": null}}, "flow": [["list", "par", "#ec4899", "toggle(3)"]], "metrics": {"dir": ["child → parent"], "api": ["defineEmits"]}}, {"short": "VModel", "tag": "v-model", "title": "v-model on a component = a prop + an update event", "body": "<p>&lt;FilterBox v-model=\"filter\" /&gt; expands to :modelValue + @update:modelValue. In 3.4+, defineModel() writes both for you.</p>", "metrics": {"api": ["defineModel"]}}, {"short": "Slot", "tag": "Scoped slot", "title": "The parent customises each row with a scoped slot", "body": "<p>The child renders &lt;slot name=\"item\" :todo=\"todo\" /&gt;; the parent writes &lt;template #item=\"{ todo }\"&gt;…&lt;/template&gt;. Data flows child → slot content, markup flows parent → child.</p>", "show": ["par", "state", "list", "item"], "flow": [["list", "item", "#a855f7", "{ todo }"]], "metrics": {"dir": ["child data → parent markup"], "api": ["scoped slots"]}}, {"short": "Render", "tag": "Render", "title": "Vue renders and patches the DOM when todos change", "body": "<p>v-for=\"todo in visible\" :key=\"todo.id\", stable keys let Vue move rows instead of recreating them.</p>", "show": ["par", "state", "list", "item", "dom"], "flow": [["list", "dom", "#22c55e", "patch"]]}, {"short": "Rule", "tag": "Summary", "title": "Props down, events up, slots for customisation", "body": "<p>Shared or global state goes into a store (Pinia) or provide/inject, not into prop drilling through ten levels.</p>", "note": {"kind": "key", "text": "Owner holds state → props down (read-only) → events up (emit) → parent updates → Vue re-renders. v-model is sugar for prop + update event; scoped slots let the parent render child data."}}]}

## The prop that changed by itself

> [!STORY] A filter component receives an array of selected tags as a prop and, for convenience, pushes new tags straight into it. It works, until another screen reuses the component and suddenly its own selection changes too, because both were mutating the same parent array. Vue warns when you reassign a prop, but mutating an object or array prop's contents slips through. Understanding Vue's data flow, props down, events up, prevents an entire category of bugs.

## Single-file components

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import TodoList from './TodoList.vue'

const todos = ref([{ id: 1, text: 'Ship release', done: false }])
const open = computed(() => todos.value.filter(t => !t.done))
function toggle(id: number) {
  const t = todos.value.find(t => t.id === id)
  if (t) t.done = !t.done
}
</script>

<template>
  <h2>{{ open.length }} open</h2>
  <TodoList :todos="todos" @toggle="toggle" />
</template>

<style scoped>
h2 { font-weight: 600; }
</style>
```

- `<script setup>` is compiled: imports and top-level bindings are directly usable in the template, components imported are registered automatically.
- `<style scoped>` adds a data attribute so styles apply only to this component (use `:deep()` to reach into children).

## Template syntax and directives

| Syntax | Meaning |
|---|---|
| `{{ expr }}` | text interpolation (HTML-escaped) |
| `:attr="expr"` (`v-bind`) | bind an attribute or prop; `v-bind="obj"` spreads many |
| `@event="handler"` (`v-on`) | listen; modifiers `.prevent`, `.stop`, `.once`, `.enter` |
| `v-if` / `v-else-if` / `v-else` | conditionally **create/destroy** elements |
| `v-show` | toggle `display`, element stays mounted |
| `v-for="item in items" :key="item.id"` | lists with stable keys |
| `v-model` | two-way binding on inputs and components (`.trim`, `.number`, `.lazy`) |
| `v-html` | raw HTML, XSS risk with user content |
| `ref="el"` | template ref to a DOM element or component |

**v-if vs v-show:** v-if is cheaper when the condition rarely becomes true (nothing rendered); v-show is cheaper when toggled frequently (no re-mount).

> [!WARN] Don't put `v-if` and `v-for` on the same element, in Vue 3, `v-if` runs first and can't see the loop variable. Filter with a computed property instead.

## computed vs methods vs watch

- **computed** derived values, **cached** until dependencies change. Use for anything derived from state (`filteredTodos`, `total`).
- **methods/functions** called on every render if used in the template; use for event handlers and actions.
- **watch/watchEffect** side effects when data changes (fetching, saving to localStorage). Not for derived values. (Details in the reactivity chapter.)

## Props

```ts
const props = withDefaults(defineProps<{
  todos: Todo[]
  filter?: 'all' | 'open' | 'done'
}>(), { filter: 'all' })
```

- **One-way data flow:** parent → child. The child must not modify props. If it needs a local editable copy, copy it into a `ref` (and decide how to sync).
- Props declared in camelCase are passed in kebab-case in templates (`:max-items`).
- In 3.5+, props can be destructured reactively in `<script setup>` (`const { filter = 'all' } = defineProps<…>()`).

## Emits

```ts
const emit = defineEmits<{ toggle: [id: number]; remove: [id: number] }>()
emit('toggle', todo.id)
```

Declaring emits documents the component's API and separates component events from native DOM listeners.

## v-model on components

```vue
<!-- parent -->
<SearchBox v-model="query" v-model:sort="sortKey" />

<!-- SearchBox.vue (Vue 3.4+) -->
<script setup lang="ts">
const query = defineModel<string>({ required: true })
const sort = defineModel<string>('sort')
</script>
<template><input v-model="query" /></template>
```

Under the hood it's `modelValue` + `update:modelValue` (or `sort` + `update:sort`).

## Slots

- **Default slot:** `<slot />` renders content passed between the tags.
- **Named slots:** `<slot name="header" />` filled with `<template #header>`.
- **Scoped slots:** the child passes data up to the slot content: `<slot name="item" :todo="todo" />` and the parent writes `<template #item="{ todo }">`. Ideal for reusable lists, tables and dropdowns where the parent decides how each row looks.
- Fallback content inside `<slot>` shows when nothing is provided.

## Lifecycle hooks

`onMounted` (DOM exists, measure, start libraries), `onUpdated`, `onBeforeUnmount`/`onUnmounted` (clean up timers, listeners, subscriptions), `onActivated`/`onDeactivated` (inside `<KeepAlive>`), `onErrorCaptured`. With the Composition API there's no `created`, code in `<script setup>` runs at that point.

## Template refs and attributes

```vue
<script setup>
import { useTemplateRef, onMounted } from 'vue'
const input = useTemplateRef('search')     // 3.5+; or const search = ref(null)
onMounted(() => input.value?.focus())
</script>
<template><input ref="search" /></template>
```

- **Attribute fallthrough:** attributes not declared as props (`class`, `style`, `id`, listeners) apply to the component's root element. Use `inheritAttrs: false` + `v-bind="$attrs"` to place them elsewhere.
- `defineExpose({ focus })` makes methods available to a parent's template ref (components are closed by default in `<script setup>`).

## Built-in components

`<Transition>`/`<TransitionGroup>` for animations, `<KeepAlive>` to cache component state across toggles, `<Teleport to="body">` for modals and toasts, `<Suspense>` (experimental) for async setup.

> [!RECAP]
> - SFCs with `<script setup>`, `<template>`, `<style scoped>`.
> - Directives: `:`, `@`, `v-if` vs `v-show`, `v-for` with keys, `v-model`; never `v-if` + `v-for` together.
> - computed for derived values (cached), functions for actions, watch for side effects.
> - **Props down (read-only), events up (emit)**; `defineModel` for component v-model.
> - Slots, especially scoped slots, for flexible reusable components.
> - Lifecycle cleanup in `onBeforeUnmount`; template refs; attribute fallthrough; Teleport, KeepAlive, Transition.

> [!INTERVIEW] "v-if vs v-show?", "Why are keys needed in v-for?", "computed vs method vs watch?", "How do parent and child communicate?", "What is a scoped slot?", "How does v-model work on a custom component?", "Why shouldn't a child mutate props?"

::quiz {"q": "A dropdown panel is toggled open and closed many times per minute. Which directive?", "options": ["v-if", "v-show", "v-for", "v-html"], "answer": 1, "explain": "v-show keeps it mounted and just toggles display."}

::quiz {"q": "How should a child ask the parent to change data it received as a prop?", "options": ["Mutate the prop", "Emit an event that the parent handles", "Use v-html", "Reload the page"], "answer": 1, "explain": "Props down, events up."}

::quiz {"q": "What does v-model on a component expand to (Vue 3)?", "options": [":value and @input", ":modelValue and @update:modelValue", "v-bind only", "A watcher"], "answer": 1, "explain": "defineModel writes both for you in 3.4+."}
