---
title: Navigation in Chromium — From the Omnibox to the First Frame
summary: What really happens inside Chromium when you press Enter: omnibox prediction and preconnect, the browser-side NavigationRequest, the network service and HTTP cache, redirects and safe-browsing checks, choosing or creating a renderer, committing the navigation, Blink parsing and V8, the compositor and Viz, plus back/forward cache and prerendering.
---

::widget Scene {"title": "Pressing Enter in the omnibox", "sub": "the life of one navigation across Chromium's processes", "nodes": [{"id": "omni", "kind": "laptop", "label": "Omnibox", "x": 3.72, "y": 3.72}, {"id": "nav", "kind": "cube", "label": "NavigationRequest (browser process)", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "net", "kind": "router", "label": "Network service + HTTP cache", "x": 9.0, "y": -9.0, "color": "teal"}, {"id": "sb", "kind": "cube", "label": "Safe Browsing / policy checks", "x": 16.44, "y": -1.56, "color": "red"}, {"id": "rend", "kind": "laptop", "label": "Renderer (Blink + V8)", "x": 17.22, "y": -9.78, "color": "blue"}, {"id": "viz", "kind": "cpu", "label": "GPU / Viz", "x": 21.72, "y": -14.28, "color": "green"}], "links": [["omni", "nav"], ["nav", "net"], ["nav", "sb"], ["nav", "rend", {"label": "commit"}], ["rend", "viz"]], "metrics": [["stage", "Stage"], ["where", "Process"], ["t", "Elapsed"]], "steps": [{"short": "Type", "tag": "Omnibox", "title": "As you type, the omnibox predicts and may preconnect", "body": "<p>Autocomplete from history and search; for a likely URL it can do DNS + TCP + TLS early, or even prerender the page.</p>", "show": ["omni"], "metrics": {"stage": ["typing"], "where": ["browser"], "t": ["—"]}}, {"short": "Start", "tag": "Navigation", "title": "Enter: the browser process creates a NavigationRequest", "body": "<p>Navigations are driven by the browser process, not the renderer. beforeunload handlers in the current page run first.</p>", "show": ["omni", "nav"], "flow": [["omni", "nav", "#a855f7", "https://news.com"]], "metrics": {"stage": ["navigation start"], "t": ["0 ms"]}}, {"short": "Policy", "tag": "Checks", "title": "Throttles run: enterprise URL blocklists, Safe Browsing, HTTPS-upgrade", "body": "<p>NavigationThrottles can defer, cancel or redirect the navigation.</p>", "show": ["omni", "nav", "sb"], "flow": [["nav", "sb", "#ef4444", "allowed?"]], "metrics": {"stage": ["throttles"]}}, {"short": "Fetch", "tag": "Network", "title": "The network service fetches the main resource", "body": "<p>Checks the HTTP cache, DNS (with DoH if configured), connection pool, TLS, then sends the request with cookies.</p>", "show": ["omni", "nav", "sb", "net"], "flow": [["nav", "net", "#14b8a6", "request"]], "metrics": {"stage": ["request"], "where": ["network service"], "t": ["~120 ms"]}}, {"short": "Redirect", "tag": "Redirects", "title": "A 301 to https://www.news.com restarts the checks for the new URL", "body": "<p>Each redirect is a new hop through throttles.</p>", "flow": [["net", "nav", "#f59e0b", "301 → www"]]}, {"short": "Response", "tag": "Response", "title": "Response headers arrive: decide what to do", "body": "<p>MIME type (render, download, or hand to a plugin), Content-Security-Policy, Cross-Origin-Opener-Policy, and the site — which picks the process.</p>", "flow": [["net", "nav", "#14b8a6", "headers"]], "metrics": {"stage": ["response started"], "t": ["~250 ms"]}}, {"short": "Process", "tag": "Process", "title": "Pick or create a renderer for the site", "body": "<p>Site isolation: www.news.com needs a news.com renderer. A spare renderer may already be warm.</p>", "show": ["omni", "nav", "sb", "net", "rend"], "set": {"rend": {"badge": "news.com"}}, "metrics": {"where": ["renderer"]}}, {"short": "Commit", "tag": "Commit", "title": "Commit: the renderer takes over, the body streams straight to it", "body": "<p>The URL bar updates, history gets the entry; the old page is unloaded or kept in back/forward cache.</p>", "flow": [["nav", "rend", "#3b82f6", "CommitNavigation"], ["net", "rend", "#14b8a6", "body stream"]], "metrics": {"stage": ["commit"], "t": ["~270 ms"]}}, {"short": "Blink", "tag": "Render", "title": "Blink parses HTML, fetches subresources, V8 runs scripts", "body": "<p>DOM, CSSOM, layout, paint (Frontend chapter 1). Subresource requests go back through the network service.</p>", "metrics": {"stage": ["parse + script"], "where": ["renderer"]}}, {"short": "Frame", "tag": "Display", "title": "The compositor sends frames to Viz, which draws them", "body": "<p>First Contentful Paint, then Largest Contentful Paint. The navigation is \"finished\" when load fires.</p>", "show": ["omni", "nav", "sb", "net", "rend", "viz"], "flow": [["rend", "viz", "#22c55e", "compositor frame"]], "metrics": {"stage": ["first paint", "good"], "where": ["GPU"], "t": ["~600 ms"]}}, {"short": "Bfcache", "tag": "Instant back", "title": "Press Back: back/forward cache restores the frozen page instantly", "body": "<p>Pages with unload handlers or certain APIs aren't eligible — a common reason sites miss out.</p>", "note": {"kind": "key", "text": "Omnibox → NavigationRequest in the browser process → throttles → network service → response → choose renderer → commit → Blink/V8 → Viz."}}]}

## "What happens when you type a URL" — the browser engineer's version

The classic interview question usually ends at "DNS, TCP, TLS, HTTP, render". Inside Chromium the story is richer, spans several processes, and is full of hooks that products — especially enterprise browsers — build on.

## Before you press Enter

The **omnibox** combines URL completion, history, bookmarks and search suggestions. When it's confident you'll go to a URL, it can **preconnect** (DNS + TCP + TLS) or even **prerender** the page in a hidden renderer so the navigation is nearly instant. Speculation rules let sites ask for prefetch/prerender of likely next pages too.

## The browser process drives navigation

Pressing Enter creates a **`NavigationRequest`** in the browser process. Navigations are browser-driven ("PlzNavigate") so the trusted process decides where a page loads and which process renders it.

Steps before any bytes are requested:

1. Run the current page's `beforeunload` handler (it can ask "Leave site?").
2. Run **NavigationThrottles** — pluggable checks that can proceed, defer, cancel or block:
   - enterprise **URL allow/blocklists** and policies,
   - **Safe Browsing** reputation checks,
   - HTTPS-First/upgrade logic, mixed-content rules,
   - extension `webRequest`/`declarativeNetRequest` rules.

## The network service

The request goes to the **network service** process:

- **HTTP cache** lookup (fresh → serve; stale → revalidate with `If-None-Match`).
- **DNS** — system resolver or built-in resolver with DNS-over-HTTPS when configured.
- **Socket pools** reuse connections; HTTP/2 and HTTP/3 (QUIC) multiplex requests.
- **TLS** verification with the platform's or Chrome's root store, certificate transparency checks, HSTS.
- **Cookies** attached according to SameSite and partitioning rules.
- **Proxy resolution** — system settings, PAC scripts, or enterprise-configured proxies.

Redirects loop back through the throttles for each new URL.

## Response: choose what and where

When response headers arrive, the browser decides:

- **Is it a page or a download?** Content-Disposition and MIME type decide. Downloads go to the download manager (where enterprises apply scanning and policies).
- **Which process?** Based on the final URL's site and isolation headers (COOP), reuse an existing renderer for that site or create one.
- **Security policy** from headers (CSP, COOP/COEP, frame-ancestors).

## Commit

The browser sends `CommitNavigation` to the renderer; the response body is streamed directly to it. Now the URL bar changes, the history entry is added, and the previous document is either unloaded or frozen into the **back/forward cache (bfcache)** for instant Back.

## In the renderer

**Blink** parses HTML into the DOM, builds styles, lays out and paints; **V8** compiles and runs JavaScript. Subresources (CSS, scripts, images) are fetched through the network service again. The renderer's compositor (cc) produces **compositor frames**, which go to **Viz** in the GPU process to be rasterised and displayed.

## Performance features worth knowing

- **Preconnect / prefetch / prerender** and speculation rules.
- **bfcache** — avoid `unload` handlers and `Cache-Control: no-store` if you want it.
- **Spare renderer** — a pre-launched process to skip start-up cost.
- **Early Hints (103)** — the server tells the browser what to preload while the page is still being generated.

> [!RECAP]
> - The **browser process** owns navigation; throttles apply policy, Safe Browsing and extension rules.
> - The **network service** handles cache, DNS/DoH, sockets, TLS, cookies and proxies.
> - On response: page vs download, choose the **renderer by site**, then **commit**.
> - Renderer: Blink + V8; frames go to **Viz** for display.
> - bfcache and prerendering make navigations feel instant.

> [!INTERVIEW] For browser roles: "Walk through a navigation across Chromium's processes", "Where would you add a URL filtering policy?" (a NavigationThrottle), "Why is navigation browser-driven?", "What prevents a page from entering bfcache?"

::quiz {"q": "Which process decides where a navigation commits?", "options": ["The current renderer", "The browser process (NavigationRequest)", "The GPU process", "The network service"], "answer": 1, "explain": "Browser-driven navigation keeps that decision trusted."}

::quiz {"q": "Where would an enterprise URL-blocking policy hook into navigation?", "options": ["In V8", "A navigation throttle in the browser process", "The GPU process", "The HTTP cache"], "answer": 1, "explain": "Throttles can cancel or block navigations."}

::quiz {"q": "Why might a page not use the back/forward cache?", "options": ["It uses HTTPS", "It has an unload handler or uses certain blocking APIs", "It has images", "It is too fast"], "answer": 1, "explain": "unload handlers are a common blocker."}
