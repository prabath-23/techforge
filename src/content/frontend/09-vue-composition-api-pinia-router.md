---
title: Vue Composition API in Practice: Composables, provide/inject, Pinia and Vue Router
summary: Structuring real Vue applications: why the Composition API, writing composables that accept refs and getters and clean up after themselves, provide/inject with typed keys, Pinia stores (setup stores, getters, actions, storeToRefs, SSR safety), Vue Router (nested routes, params, guards, lazy loading, scroll behaviour), forms, error handling, testing with Vitest and Vue Test Utils, and folder structure.
---

::widget Scene {"title": "A composable, a store and a route guard together", "sub": "useFetch + Pinia auth store + router guard on an orders page", "nodes": [{"id": "router", "kind": "router", "label": "Vue Router", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "guard", "kind": "cube", "label": "beforeEach guard", "x": 1.83, "y": -6.17, "color": "red"}, {"id": "auth", "kind": "db", "label": "Pinia: useAuthStore", "x": 6.33, "y": -10.67, "color": "orange"}, {"id": "page", "kind": "cube", "label": "OrdersPage.vue", "x": 7.72, "y": -0.28, "color": "green"}, {"id": "comp", "kind": "cpu", "label": "useFetch(url) composable", "x": 12.22, "y": -4.78, "color": "purple"}, {"id": "api", "kind": "server", "label": "API", "x": 16.72, "y": -9.28, "color": "teal"}], "links": [["router", "guard"], ["guard", "auth"], ["router", "page"], ["page", "comp"], ["comp", "api"], ["page", "auth", {"dashed": true}]], "metrics": [["step", "Step"], ["where", "Code lives in"]], "steps": [{"short": "Nav", "tag": "Router", "title": "User navigates to /orders?status=open", "body": "<p>Routes map paths to components; the route is lazy-loaded: component: () => import(\"./OrdersPage.vue\").</p>", "show": ["router"], "metrics": {"step": ["navigate"], "where": ["router/index.ts"]}}, {"short": "Guard", "tag": "Guard", "title": "A global beforeEach guard checks route.meta.requiresAuth", "body": "<p>Not logged in → return { name: \"login\", query: { redirect: to.fullPath } }.</p>", "show": ["router", "guard", "auth"], "flow": [["guard", "auth", "#ef4444", "isLoggedIn?"]], "metrics": {"step": ["guard"], "where": ["router guard"]}}, {"short": "Store", "tag": "Pinia", "title": "The auth store holds the user and token", "body": "<p>A setup store: refs are state, computed are getters, functions are actions. One instance shared app-wide.</p>", "set": {"auth": {"badge": "user: Asha ✓"}}, "metrics": {"where": ["stores/auth.ts"]}}, {"short": "Page", "tag": "Page", "title": "OrdersPage mounts and reads route.query.status", "body": "<p>Treat the URL as state for filters and pagination, shareable and survives refresh.</p>", "show": ["router", "guard", "auth", "page"], "flow": [["router", "page", "#3b82f6", "query.status"]], "metrics": {"step": ["render page"], "where": ["pages/OrdersPage.vue"]}}, {"short": "Composable", "tag": "Composable", "title": "const { data, error, loading } = useFetch(() => `/api/orders?status=${status.value}`)", "body": "<p>The composable accepts a getter (toValue), so it refetches when status changes; returns refs.</p>", "show": ["router", "guard", "auth", "page", "comp"], "flow": [["page", "comp", "#a855f7", "getter"]], "metrics": {"step": ["composable"], "where": ["composables/useFetch.ts"]}}, {"short": "Fetch", "tag": "Fetch", "title": "It watches the URL, aborts the previous request, fetches the new one", "body": "<p>onWatcherCleanup / AbortController prevent out-of-order results; it stops automatically when the component unmounts.</p>", "show": ["router", "guard", "auth", "page", "comp", "api"], "flow": [["comp", "api", "#14b8a6", "GET /api/orders"]]}, {"short": "Token", "tag": "Shared state", "title": "The request adds the token from the auth store", "body": "<p>Composables can use stores; components stay thin.</p>", "flow": [["page", "auth", "#f59e0b", "token"]]}, {"short": "Change", "tag": "Reactive", "title": "User switches the filter to \"shipped\": router.push({ query: { status: \"shipped\" } })", "body": "<p>The route changes → the getter changes → the composable refetches. No manual wiring.</p>", "flow": [["router", "page", "#3b82f6", "shipped"], ["comp", "api", "#14b8a6", "refetch"]], "metrics": {"step": ["reactive refetch", "good"]}}, {"short": "Layers", "tag": "Structure", "title": "Components render; composables hold reusable logic; stores hold shared state; the router owns URL state", "body": "<p>Each layer is testable on its own.</p>", "note": {"kind": "key", "text": "Composables = reusable stateful logic returning refs; Pinia = shared app state; Router = URL state + guards + lazy routes. Keep components thin."}}]}

## From Options API to composition

> [!STORY] A large Vue 2 codebase has a 1,400-line component where the logic for search, pagination, selection and polling is spread across `data`, `computed`, `watch`, `methods` and `mounted`, and copied into three other components through mixins that silently clash on property names. The Composition API exists to fix exactly this: group logic by feature, extract it into composables, and reuse it without mixins' name collisions and hidden sources.

## Why the Composition API

- **Organise by feature** instead of by option type.
- **Reuse logic** with composables (plain functions), explicit inputs and outputs, no naming collisions, full TypeScript inference.
- Better **tree-shaking** and smaller bundles.

The Options API is still supported and fine for simple components; most new Vue 3 code uses `<script setup>` with the Composition API.

## Writing good composables

```ts
// composables/useFetch.ts
import { ref, shallowRef, watchEffect, toValue, onWatcherCleanup, type MaybeRefOrGetter } from 'vue'

export function useFetch<T>(url: MaybeRefOrGetter<string>) {
  const data = shallowRef<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  watchEffect(async () => {
    const ctrl = new AbortController()
    onWatcherCleanup(() => ctrl.abort())       // cancel stale requests (Vue 3.5+)
    loading.value = true; error.value = null
    try {
      const res = await fetch(toValue(url), { signal: ctrl.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      data.value = await res.json()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error.value = e as Error
    } finally { loading.value = false }
  })

  return { data, error, loading }
}
```

Conventions:

- Name them `useX`; call them **synchronously** at the top of `setup`/`<script setup>` so lifecycle hooks and watchers attach to the component.
- Accept refs, getters or plain values (`MaybeRefOrGetter`) and read with `toValue()`.
- Return an object of refs (destructuring stays reactive).
- **Clean up** side effects: event listeners in `onUnmounted`, watchers stop automatically, use `effectScope` for composables used outside components.
- VueUse provides hundreds of well-built composables (`useEventListener`, `useLocalStorage`, `useDebounceFn`, `useIntersectionObserver`).

## provide / inject

Pass data to deep descendants without prop drilling, great for component libraries (a `<Tabs>` providing state to its `<Tab>` children) and app-wide services.

```ts
// keys.ts
export const ThemeKey: InjectionKey<Ref<'light' | 'dark'>> = Symbol('theme')
// ancestor
provide(ThemeKey, theme)
// descendant
const theme = inject(ThemeKey, ref('light'))
```

Provide refs (or readonly refs plus update functions) so consumers stay reactive and changes flow through the owner.

## Pinia: shared state

```ts
// stores/cart.ts
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const total = computed(() => items.value.reduce((s, i) => s + i.price * i.qty, 0))
  function add(product: Product) {
    const line = items.value.find(i => i.id === product.id)
    line ? line.qty++ : items.value.push({ ...product, qty: 1 })
  }
  return { items, total, add }
})

// in a component
const cart = useCartStore()
const { items, total } = storeToRefs(cart)   // keep reactivity when destructuring state/getters
cart.add(product)                             // actions can be destructured directly
```

- **Setup stores** (above) or option stores (`state`, `getters`, `actions`).
- `storeToRefs` for destructuring state and getters.
- Devtools integration, plugins (persistence), `$reset` (option stores), `$subscribe`.
- **What belongs in a store:** state shared across distant components (auth user, cart, feature flags, UI preferences). Server data is often better in a data-fetching layer with caching (e.g. TanStack Query for Vue) than hand-written stores.
- In **SSR** never create state at module level outside a store, it would be shared between requests/users.

## Vue Router

```ts
const routes = [
  { path: '/', component: Home },
  { path: '/orders', component: () => import('./pages/Orders.vue'), meta: { requiresAuth: true },
    children: [{ path: ':id', name: 'order', component: () => import('./pages/OrderDetail.vue'), props: true }] },
  { path: '/:pathMatch(.*)*', component: NotFound },
]
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'login', query: { redirect: to.fullPath } }
})
```

- **Dynamic params** (`/orders/:id`), **query** for filters, **nested routes** with `<RouterView>`, named routes.
- **Guards:** global `beforeEach`, per-route `beforeEnter`, in-component `onBeforeRouteLeave` (unsaved changes) and `onBeforeRouteUpdate` (same component, new params).
- **Lazy loading** with dynamic `import()` → separate chunks per page.
- `props: true` passes params as props, components don't depend on the router directly.
- **Scroll behaviour** and route-level `<KeepAlive>` for preserving list state.

> [!WARN] When only the params change (`/orders/1` → `/orders/2`), the same component instance is reused, `onMounted` doesn't run again. Watch the param (or use a `:key` on `<RouterView>`).

## Forms and validation

`v-model` with modifiers, computed validity, and a schema validator (zod/valibot with VeeValidate or similar) for complex forms. Keep form state local; submit through a store action or API call; show server errors per field.

## Error handling

`onErrorCaptured` in boundary components, `app.config.errorHandler` for global reporting (send to Sentry etc.), and explicit error states in composables (`error` ref) rather than silent failures.

## Testing

- **Vitest** for unit tests (fast, Vite-native).
- **Vue Test Utils** (`mount`, `wrapper.find`, `trigger`, `setProps`) or Testing Library (`render`, user-centred queries).
- Test composables directly (wrap in a host component or `effectScope` if they use lifecycle hooks).
- Pinia testing helpers (`createTestingPinia`) to stub actions.
- Playwright/Cypress for end-to-end journeys.

## A folder structure that scales

```
src/
  components/      # reusable UI (BaseButton, DataTable)
  features/orders/ # feature modules: components, composables, store, api
  composables/     # cross-feature composables
  stores/          # Pinia stores for app-wide state
  pages/           # route components
  router/          # routes + guards
  api/             # typed API client
```

> [!RECAP]
> - Composition API groups logic by feature; composables replace mixins.
> - Composables: `useX`, called synchronously, accept refs/getters via `toValue`, return refs, clean up.
> - provide/inject with typed `InjectionKey`s for deep trees and libraries.
> - Pinia setup stores; `storeToRefs`; keep server-cache data in a fetching layer; avoid module-level state in SSR.
> - Vue Router: lazy routes, guards, params as props, watch param changes on reused components.
> - Test with Vitest + Vue Test Utils/Testing Library; organise by feature.

> [!INTERVIEW] "Options vs Composition API?", "How do you write a reusable composable?", "Mixins vs composables?", "When do you use Pinia vs provide/inject vs props?", "How do route guards work?", "Why didn't my component reload when the route param changed?"

::quiz {"q": "Why are composables preferred over mixins?", "options": ["They are faster", "Explicit inputs/outputs, no hidden name collisions, and full type inference", "Mixins are removed in Vue 3", "They avoid reactivity"], "answer": 1, "explain": "You can see where every property comes from."}

::quiz {"q": "How do you destructure state from a Pinia store without losing reactivity?", "options": ["const { items } = store", "const { items } = storeToRefs(store)", "JSON.parse(store)", "toRaw(store)"], "answer": 1, "explain": "Actions can be destructured directly; state and getters need storeToRefs."}

::quiz {"q": "/orders/1 → /orders/2 reuses the component. How do you load the new order?", "options": ["onMounted runs again", "Watch the route param (or key the RouterView)", "Reload the page", "Use v-show"], "answer": 1, "explain": "Same instance, new params."}
