---
title: Frontend System Design: Designing a News Feed in the Browser
summary: How to run a frontend system design interview: requirements, component architecture, state and data flow, API shape and pagination, rendering strategy (CSR, SSR, streaming), infinite scrolling with virtualisation, optimistic updates, offline and real-time updates, accessibility, performance budgets and observability.
---

::widget Scene {"title": "Designing an infinite news feed", "sub": "from requirements to a fast, accessible, real-time feed", "nodes": [{"id": "u", "kind": "phone", "label": "User", "x": 3.72, "y": 3.72}, {"id": "ui", "kind": "laptop", "label": "Feed UI (virtualised list)", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "store", "kind": "cube", "label": "Client cache / store", "x": 9.0, "y": -9.0, "color": "orange"}, {"id": "api", "kind": "server", "label": "Feed API (cursor pages)", "x": 13.5, "y": -13.5, "color": "purple"}, {"id": "ws", "kind": "router", "label": "Live updates (SSE / WebSocket)", "x": 20.94, "y": -6.06, "color": "teal"}, {"id": "cdn", "kind": "cloud", "label": "CDN (images, JS)", "x": 16.44, "y": -1.56, "color": "green"}], "links": [["u", "ui"], ["ui", "store"], ["store", "api"], ["ws", "store"], ["ui", "cdn"]], "metrics": [["area", "Design area"], ["choice", "Decision"]], "steps": [{"short": "Reqs", "tag": "Requirements", "title": "Clarify: what does the feed do, on which devices, for how many items?", "body": "<p>Scroll posts with text and images, like and comment, new posts appear live, works on slow phones, accessible. Out of scope: composing posts.</p>", "show": ["u"], "metrics": {"area": ["requirements"], "choice": ["feed + like + live"]}}, {"short": "Components", "tag": "Architecture", "title": "Break the UI into components", "body": "<p>FeedPage → FeedList → PostCard (Header, Media, Actions, Comments preview). Keep PostCard dumb: data in via props, events out.</p>", "show": ["u", "ui"], "metrics": {"area": ["components"]}}, {"short": "API", "tag": "Data", "title": "API: GET /feed?cursor=…&limit=20 → {items, nextCursor}", "body": "<p>Cursor pagination, not page numbers, new posts at the top would otherwise shift pages and cause duplicates.</p>", "show": ["u", "ui", "store", "api"], "flow": [["store", "api", "#a855f7", "cursor page"]], "metrics": {"area": ["API"], "choice": ["cursor pagination"]}}, {"short": "Store", "tag": "State", "title": "A normalised client cache: posts by ID, the feed as an ordered list of IDs", "body": "<p>Liking a post updates one record everywhere it appears. Server data lives in a cache layer, not scattered component state.</p>", "set": {"store": {"badge": "posts{id} + feed[ids]"}}, "metrics": {"area": ["state"], "choice": ["normalised cache"]}}, {"short": "Render", "tag": "Rendering", "title": "SSR the first page for fast LCP, then hydrate", "body": "<p>Streaming HTML shows the first posts quickly; later pages load on the client.</p>", "metrics": {"area": ["rendering"], "choice": ["SSR first page + CSR after"]}}, {"short": "Scroll", "tag": "Infinite scroll", "title": "IntersectionObserver on a sentinel near the bottom loads the next page", "body": "<p>Virtualise: only ~20 cards exist in the DOM however far you scroll; measured heights keep the scrollbar honest.</p>", "set": {"ui": {"badge": "~20 DOM cards"}}, "flow": [["ui", "store", "#3b82f6", "load more"]], "metrics": {"area": ["list"], "choice": ["virtualised"]}}, {"short": "Media", "tag": "Images", "title": "Responsive images from a CDN, lazy below the fold, fixed aspect ratios", "body": "<p>No layout shift; phones get small images.</p>", "show": ["u", "ui", "store", "api", "cdn"], "flow": [["ui", "cdn", "#22c55e", "srcset"]]}, {"short": "Like", "tag": "Optimistic", "title": "Like: update the UI instantly, send the request, roll back on failure", "body": "<p>Feels instant; an idempotent API makes retries safe.</p>", "flow": [["ui", "store", "#f59e0b", "like (optimistic)"], ["store", "api", "#f59e0b", "POST like"]], "metrics": {"area": ["mutations"], "choice": ["optimistic + rollback"]}}, {"short": "Live", "tag": "Real-time", "title": "New posts arrive over SSE; show \"5 new posts\" instead of jumping the list", "body": "<p>Never move content under the user's thumb. Reconnect with backoff; fall back to polling.</p>", "show": ["u", "ui", "store", "api", "cdn", "ws"], "flow": [["ws", "store", "#14b8a6", "new post IDs"]], "metrics": {"area": ["real-time"], "choice": ["SSE + \"new posts\" pill"]}}, {"short": "A11y", "tag": "Accessibility", "title": "Accessible by design", "body": "<p>Semantic article elements, real buttons with labels, keyboard focus order, a \"load more\" fallback for screen readers, respects reduced motion.</p>", "metrics": {"area": ["accessibility"]}}, {"short": "Ops", "tag": "Observability", "title": "Budgets and monitoring", "body": "<p>JS budget, field Core Web Vitals, error tracking with source maps, and feature flags for safe rollouts.</p>", "note": {"kind": "key", "text": "Requirements → components → API & pagination → state shape → rendering strategy → list performance → mutations → real-time → accessibility → performance & monitoring."}}]}

## The interview that wasn't about servers

> [!STORY] A candidate preparing for a frontend role spends weeks on load balancers and database sharding. The interviewer asks: "Design the news feed, the part that runs in the browser." Where does the data live? What happens when you scroll past 10,000 posts? What does the user see if liking a post fails? How do new posts appear without the page jumping? Frontend system design is its own discipline, with its own checklist.

## A structure for the interview

Work through these areas, spending most time where the product's difficulty is:

1. **Requirements** features, devices, scale (items, users), offline needs, accessibility, internationalisation.
2. **Architecture** main components and how they communicate.
3. **Data model and API** what the client fetches and how it's shaped.
4. **State management** where each kind of state lives.
5. **Rendering strategy** client, server, static, streaming.
6. **Performance** loading, interaction, large lists, images.
7. **Interactions** optimistic updates, errors, retries.
8. **Real-time and offline.**
9. **Accessibility, security, observability.**

## Requirements and scope

Ask before drawing anything: Is it read-only or interactive? Text, images, video? How many items might a user scroll? Must it work offline? Which browsers and devices? Agreeing on *out of scope* (composing posts, moderation tools) saves time.

## Component architecture

Split by responsibility:

- **Container components** fetch and manage data (`FeedPage`, `FeedList`).
- **Presentational components** render props and emit events (`PostCard`, `LikeButton`).
- Shared primitives come from a design system (buttons, avatars, skeletons).

## API design from the client's view

- **Cursor-based pagination** (`?cursor=abc&limit=20` returning `nextCursor`) handles inserts at the top without duplicates or gaps; offset pagination doesn't.
- Return what the screen needs in one request (author name and avatar with each post), avoid N+1 requests from the browser. GraphQL or a backend-for-frontend (BFF) can shape responses per client.
- Include IDs and timestamps so the client can deduplicate and merge real-time updates.

## State management

Separate kinds of state:

| State | Where it lives |
|---|---|
| Server data (posts, users) | a client cache keyed by ID (React Query, Apollo, a normalised store) |
| UI state (menu open, input text) | the component |
| Shared app state (current user, theme) | context or a small store |
| Navigation state (filters, tab) | the URL |

**Normalise** server data: store each post once by ID; lists hold IDs. Updating a like count then updates every place that post appears.

## Rendering strategy

- **CSR** (client-side rendering): simple hosting, slow first paint on weak devices.
- **SSR** (server-side rendering): HTML arrives ready, good LCP and SEO; needs hydration.
- **SSG** (static generation): fastest for content that rarely changes.
- **Streaming SSR / server components:** send the shell first, stream slower parts as they're ready, ship less JavaScript.

For a feed: SSR or stream the first page, then fetch further pages on the client.

## Infinite scrolling done right

- Detect the end with an `IntersectionObserver` on a sentinel element, not scroll events.
- **Virtualise** the list: render only the visible items plus a buffer, recycling DOM nodes. Variable-height items need measured heights.
- Keep scroll position when navigating to a post and back (store the cursor and offset).
- Provide a "Load more" button as an accessible fallback and for users who want a footer.

## Mutations: optimistic updates

When the user likes a post, update the UI immediately, send the request, and **roll back with a message** if it fails. Make the API idempotent so retries don't double-like. Disable or debounce repeated taps.

## Real-time and offline

- **Server-Sent Events** for one-way updates (new posts, counts); **WebSockets** when the client also sends frequently (chat). Polling is the simple fallback.
- Don't insert new posts above what the user is reading, show a "5 new posts" pill they can tap.
- Offline: cache the app shell and recent data with a **service worker**; queue actions and sync later.

## Accessibility, security and observability

- Semantic HTML (`<article>`, `<button>`), labels, visible focus, keyboard navigation, alt text, reduced-motion support, sufficient contrast.
- Sanitise user-generated content (XSS), use CSP, and keep tokens out of JavaScript-readable storage.
- Track Core Web Vitals, JavaScript errors (with source maps) and key interactions; roll out with feature flags.

> [!RECAP]
> - Follow a checklist: requirements → components → API → state → rendering → performance → interactions → real-time/offline → a11y, security, monitoring.
> - **Cursor pagination** a **normalised cache** and state in the right place.
> - SSR/stream the first view; **virtualise** long lists; reserve space for media.
> - **Optimistic updates** with rollback; real-time via SSE/WebSocket without moving content under the user.

> [!INTERVIEW] Popular prompts: news feed, autocomplete/typeahead, image carousel, chat app, Google Docs-style editor, e-commerce product page, data table with sorting and filtering. Drive the conversation with the checklist and discuss trade-offs out loud.

::quiz {"q": "Why prefer cursor pagination for a live feed?", "options": ["It is shorter to type", "New items at the top don't cause duplicates or skipped items", "Browsers require it", "It removes the need for IDs"], "answer": 1, "explain": "Offsets shift when items are inserted."}

::quiz {"q": "What does virtualising a list do?", "options": ["Moves it to a server", "Renders only the visible items, keeping the DOM small", "Caches images", "Makes the list read-only"], "answer": 1, "explain": "DOM size stays constant however long the list."}

::quiz {"q": "A like request fails after an optimistic update. What should the UI do?", "options": ["Nothing", "Roll back the like and tell the user", "Reload the page", "Retry forever silently"], "answer": 1, "explain": "Revert and inform, optionally offering retry."}
