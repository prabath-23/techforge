---
title: Frontend Application Architecture: Structure, Layers, State and Boundaries for a Large Vue App
summary: How to structure a large single-page application so it stays maintainable: feature-based folders, the layers inside the frontend (UI components, composables, stores, API client, domain types), a typed API layer generated from OpenAPI, where each kind of state lives, a design-system component library, routing and code splitting, error/loading/empty patterns, authentication handling, configuration, testing strategy, and micro-frontends.
---

::widget Scene {"title": "Layers inside a frontend app", "sub": "the orders feature, from button click to API and back", "nodes": [{"id": "page", "kind": "cube", "label": "Page: OrdersPage.vue", "x": 3.72, "y": 3.72, "color": "green"}, {"id": "ui", "kind": "blocks", "label": "Design system (BaseTable, BaseButton)", "x": -2.48, "y": -2.48, "count": 4, "color": "dark"}, {"id": "comp", "kind": "cpu", "label": "Composable: useOrders()", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "store", "kind": "db", "label": "Store: session, prefs", "x": 14.42, "y": 5.42, "color": "orange"}, {"id": "api", "kind": "cube", "label": "API client (typed, from OpenAPI)", "x": 12.72, "y": -5.28, "color": "blue"}, {"id": "be", "kind": "server", "label": "Backend", "x": 17.22, "y": -9.78, "color": "teal"}], "links": [["page", "ui"], ["page", "comp"], ["comp", "api"], ["api", "be"], ["comp", "store", {"dashed": true}]], "metrics": [["layer", "Layer"], ["owns", "Owns"]], "steps": [{"short": "Page", "tag": "Pages", "title": "Pages (route components) compose features, and contain little logic", "body": "<p>They read route params, arrange components and call composables.</p>", "show": ["page"], "metrics": {"layer": ["pages"], "owns": ["layout + wiring"]}}, {"short": "UI", "tag": "Design system", "title": "Presentational components come from a design system", "body": "<p>Buttons, tables, dialogs, form fields: accessible, themed, documented in Storybook. No API calls inside them.</p>", "show": ["page", "ui"], "metrics": {"layer": ["UI kit"], "owns": ["look, accessibility"]}}, {"short": "Comp", "tag": "Logic", "title": "Feature logic lives in composables: useOrders(filters)", "body": "<p>Loading, error, pagination, optimistic updates. Testable without rendering.</p>", "show": ["page", "ui", "comp"], "flow": [["page", "comp", "#a855f7", "filters"]], "metrics": {"layer": ["composables"], "owns": ["feature behaviour"]}}, {"short": "API", "tag": "API layer", "title": "One typed API client generated from the backend's OpenAPI spec", "body": "<p>Base URL, auth header, error mapping and retries in one place. Types stay in sync with the backend.</p>", "show": ["page", "ui", "comp", "api"], "flow": [["comp", "api", "#3b82f6", "listOrders()"]], "metrics": {"layer": ["API client"], "owns": ["HTTP details"]}}, {"short": "BE", "tag": "Backend", "title": "The backend answers; errors are mapped to typed results", "body": "<p>401 → redirect to login; 422 → field errors; 500 → toast + report to monitoring.</p>", "show": ["page", "ui", "comp", "api", "be"], "flow": [["api", "be", "#14b8a6", "GET /orders"], ["be", "api", "#22c55e", "200"]]}, {"short": "State", "tag": "State", "title": "Server data is cached by the data layer; only true client state goes in stores", "body": "<p>Session user, preferences and cross-feature UI state in Pinia; filters in the URL; form state local.</p>", "show": ["page", "ui", "comp", "api", "be", "store"], "flow": [["comp", "store", "#f59e0b", "current user"]], "metrics": {"layer": ["stores"], "owns": ["shared client state"]}}, {"short": "Bounds", "tag": "Boundaries", "title": "Features don't import each other's internals", "body": "<p>features/orders exposes a small public index; lint rules enforce it, the frontend version of modular boundaries.</p>", "note": {"kind": "key", "text": "Pages compose; design-system components render; composables hold behaviour; a typed API client owns HTTP; stores hold only shared client state; features keep boundaries."}}]}

## When the frontend became the bigger codebase

> [!STORY] A dashboard starts as ten components calling `axios` directly. Two years later it has 600 components, three ways of fetching data, five copies of a date picker, API URLs hard-coded in forty places, and a global store holding everything from the logged-in user to the open/closed state of a tooltip. Every change risks breaking something unrelated. The frontend now needs the same architectural care as the backend.

## Organise by feature

```
src/
  app/              # bootstrap: main.ts, router, plugins, global error handling
  pages/            # route components (thin)
  features/
    orders/
      components/   # OrderTable, OrderFilters
      composables/  # useOrders, useOrderMutations
      api.ts        # orders endpoints (wrapping the generated client)
      types.ts
      index.ts      # the feature's public API
    billing/ ...
  shared/
    ui/             # design-system components (BaseButton, BaseDialog)
    composables/    # useDebounce, usePagination
    api/            # generated client, http setup
    utils/
```

Features import from `shared` and from other features' **public index only**. Enforce with ESLint import rules (or tools like eslint-plugin-boundaries) so boundaries don't erode.

## The layers

1. **Pages** route-level containers: read params, compose feature components, set the title.
2. **Feature components** UI tied to one feature.
3. **Shared UI / design system** generic, accessible, themed components; no business logic or API calls. Document them (Storybook) and reuse them everywhere.
4. **Composables** behaviour: data loading, mutations, form logic, permissions. Testable without rendering.
5. **API layer** the only place that knows URLs, headers and HTTP.
6. **Stores** shared client state.
7. **Domain types and utilities** shared types (ideally generated), formatting, validation schemas.

## A typed API layer

Generate a client from the backend's **OpenAPI** spec (openapi-typescript, orval, openapi-generator). Benefits: types match the backend, breaking API changes fail the frontend build, no hand-written URL strings. Wrap it with:

- base URL from runtime config,
- auth token injection and refresh,
- error normalisation (`ApiError` with status, code, field errors),
- request cancellation and retries for idempotent calls,
- tracing headers (correlation IDs) for end-to-end debugging.

## State: put each kind in the right place

| State | Home |
|---|---|
| Server data (orders, users) | a query cache (TanStack Query for Vue, Nuxt `useFetch`) or feature composables with caching |
| Shared client state (session, preferences, feature flags) | Pinia |
| URL state (filters, sort, page, selected tab) | the route query |
| Form state | local to the form component |
| Ephemeral UI state (open/closed) | the component |

Most "global state" pain comes from putting server data and tiny UI state into the global store.

## Routing and code splitting

Lazy-load each page (`() => import('@/pages/OrdersPage.vue')`) and heavy feature parts (charts, editors). Use route `meta` for permissions and layouts; guards for auth. Prefetch likely next routes.

## Consistent UX patterns

Every data view needs the same four states, **loading, error, empty, success** and consistent handling: skeletons, retry buttons, helpful empty states, toasts for background failures. Build them once (`<AsyncView :state>`) instead of re-inventing per page.

## Authentication on the frontend

- Prefer **HttpOnly cookies** set by the backend (or a backend-for-frontend) over storing tokens in localStorage (XSS-readable).
- A route guard checks session state; a 401 from any API call clears the session and redirects to login with a return URL.
- Permission checks in the UI are for UX only, the backend must enforce them.

## Configuration and environments

Build once, deploy everywhere: load environment-specific settings (API URL, feature flags) at runtime from `/config.json` or server-injected HTML, rather than rebuilding per environment. Never ship secrets.

## Testing strategy

- **Unit:** composables, utilities, stores (Vitest).
- **Component:** components with Testing Library, test behaviour users see, mock the API layer (MSW).
- **E2E:** critical flows with Playwright against a real or stubbed backend.
- **Visual/regression:** Storybook + screenshot tests for the design system.

## Micro-frontends (and when not to)

Very large organisations split a frontend into independently deployed parts (module federation, web components, server-side composition). It solves organisational scaling, at real cost in consistency, bundle duplication and complexity. A well-structured modular monolith frontend is enough for most teams.

> [!RECAP]
> - Organise by **feature** with public APIs; enforce boundaries with lint rules.
> - Layers: pages → feature components → design system; composables for behaviour; one API layer; stores for shared client state.
> - Generate a **typed API client** from OpenAPI; normalise errors and auth in one place.
> - Put state where it belongs: query cache, Pinia, URL, local.
> - Lazy routes; consistent loading/error/empty states; cookie-based auth; runtime config.
> - Test composables, components (with MSW) and critical E2E flows.

> [!INTERVIEW] "How would you structure a large Vue app?", "Where does API logic live?", "What belongs in Pinia?", "How do you keep frontend types in sync with the backend?", "How do you handle auth tokens in the browser?", "Micro-frontends, when?"

::quiz {"q": "Where should server data like the orders list primarily live?", "options": ["A global Pinia store", "A query cache / data-fetching layer (or feature composables with caching)", "localStorage", "The design system"], "answer": 1, "explain": "Stores are for shared client state."}

::quiz {"q": "How do you keep frontend types in sync with the backend API?", "options": ["Copy types by hand", "Generate a typed client from the backend's OpenAPI spec", "Use any everywhere", "Avoid TypeScript"], "answer": 1, "explain": "Breaking changes then fail the build."}

::quiz {"q": "Why prefer HttpOnly cookies over localStorage for session tokens?", "options": ["They are faster", "JavaScript (including injected XSS) cannot read them", "They never expire", "They work offline"], "answer": 1, "explain": "Limits token theft via XSS."}
