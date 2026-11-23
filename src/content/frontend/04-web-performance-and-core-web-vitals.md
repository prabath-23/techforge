---
title: Web Performance and Core Web Vitals — Fast to Load, Quick to Respond, Stable to Read
summary: How to measure and fix real-user speed: LCP, INP and CLS explained with causes and fixes, lab vs field data, shipping less JavaScript with code-splitting, images and fonts done right, caching and CDNs, and building a performance budget into CI.
---

::widget Scene {"title": "Fixing a slow product page, metric by metric", "sub": "LCP 4.8 s, INP 450 ms, CLS 0.31 → all green", "nodes": [{"id": "u", "kind": "phone", "label": "Real users (mid-range phones)", "x": 3.72, "y": 3.72}, {"id": "page", "kind": "laptop", "label": "Product page", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "img", "kind": "doc", "label": "Hero image", "x": 9.0, "y": -9.0, "color": "orange"}, {"id": "js", "kind": "cpu", "label": "JS bundle 1.2 MB", "x": 12.72, "y": -5.28, "color": "red"}, {"id": "ad", "kind": "doc", "label": "Late-loading banner", "x": 16.44, "y": -1.56, "color": "purple"}, {"id": "rum", "kind": "cube", "label": "Field data (RUM)", "x": 2.33, "y": -6.67, "color": "teal"}], "links": [["u", "page"], ["page", "img"], ["page", "js"], ["page", "ad"], ["page", "rum", {"dashed": true}]], "metrics": [["lcp", "LCP (loading)"], ["inp", "INP (responsiveness)"], ["cls", "CLS (stability)"]], "steps": [{"short": "Measure", "tag": "Field data", "title": "Measure real users, at the 75th percentile", "body": "<p>Lab tools on a fast laptop lie. Real-user monitoring (or Chrome's field data) shows what mid-range phones on 4G experience.</p>", "show": ["u", "page", "rum"], "flow": [["page", "rum", "#14b8a6", "web-vitals"]], "metrics": {"lcp": ["4.8 s", "bad"], "inp": ["450 ms", "bad"], "cls": ["0.31", "bad"]}}, {"short": "LCP", "tag": "LCP", "title": "LCP: when the biggest visible element (the hero image) finishes drawing", "body": "<p>Good is ≤ 2.5 s. The image is discovered late (set by JavaScript), is 900 KB, and is lazy-loaded.</p>", "show": ["u", "page", "rum", "img"], "set": {"img": {"badge": "900 KB, found late"}}}, {"short": "FixLCP", "tag": "Fix LCP", "title": "Put it in the HTML, preload it, serve AVIF at the right size, never lazy-load it", "body": "<p>fetchpriority=\"high\", responsive srcset, served from a CDN. Plus: render the page server-side so it doesn't wait for JavaScript.</p>", "flow": [["page", "img", "#22c55e", "preload, 120 KB"]], "set": {"img": {"badge": "120 KB, early"}}, "metrics": {"lcp": ["2.1 s", "good"]}}, {"short": "INP", "tag": "INP", "title": "INP: delay from a tap to the next frame showing the result", "body": "<p>Good is ≤ 200 ms. Tapping \"Add to cart\" waits behind a 400 ms long task from hydrating a 1.2 MB bundle.</p>", "show": ["u", "page", "rum", "img", "js"], "set": {"js": {"badge": "long tasks"}}}, {"short": "FixINP", "tag": "Fix INP", "title": "Ship less JavaScript and break up long tasks", "body": "<p>Code-split by route, drop unused libraries, load third parties later, yield inside heavy handlers, show feedback before doing slow work.</p>", "set": {"js": {"badge": "350 KB, split"}}, "metrics": {"inp": ["140 ms", "good"]}}, {"short": "CLS", "tag": "CLS", "title": "CLS: unexpected layout shifts while reading", "body": "<p>Good is ≤ 0.1. A promo banner loads late and pushes the \"Buy\" button down — users tap the wrong thing.</p>", "show": ["u", "page", "rum", "img", "js", "ad"], "set": {"ad": {"badge": "pushes content"}}}, {"short": "FixCLS", "tag": "Fix CLS", "title": "Reserve space: width/height or aspect-ratio on images, min-height for banners", "body": "<p>Use font-display with metric-matched fallback fonts so text doesn't jump when web fonts load.</p>", "set": {"ad": {"badge": "space reserved"}}, "metrics": {"cls": ["0.02", "good"]}}, {"short": "Cache", "tag": "Repeat visits", "title": "Cache aggressively", "body": "<p>Hashed filenames + Cache-Control: max-age=31536000, immutable for assets; short caching or revalidation for HTML; a CDN close to users.</p>"}, {"short": "Budget", "tag": "Keep it", "title": "Add a performance budget to CI", "body": "<p>Fail the build if the JS bundle grows past 250 KB or Lighthouse LCP regresses. Keep watching field data after each release.</p>", "note": {"kind": "key", "text": "LCP = loading the main content, INP = responding to input, CLS = layout stability. Measure in the field at p75; fix the specific cause of each."}}]}

## Every 100 milliseconds

> [!STORY] Retailers have repeatedly found that small speed changes move revenue: faster pages convert better, and slow mobile pages lose users before they even see a product. One e-commerce team discovers its product page looks fine on developers' MacBooks but takes nearly five seconds to show the main image on the mid-range Android phones most of its customers use. "It's fast for me" is the most expensive sentence in web performance.

## Measure what users experience

Two kinds of data:

- **Lab data** — Lighthouse or WebPageTest in a controlled environment. Repeatable and great for debugging, but it isn't your users.
- **Field data** (real-user monitoring, RUM) — collected from actual visitors with the `web-vitals` library or Chrome's user experience report. This is the truth.

Google's **Core Web Vitals** summarise user experience in three numbers, judged at the **75th percentile** of page loads:

| Metric | Measures | Good | Poor |
|---|---|---|---|
| **LCP** — Largest Contentful Paint | when the main content appears | ≤ 2.5 s | > 4 s |
| **INP** — Interaction to Next Paint | how quickly the page responds to taps, clicks and keys | ≤ 200 ms | > 500 ms |
| **CLS** — Cumulative Layout Shift | how much content jumps around unexpectedly | ≤ 0.1 | > 0.25 |

## LCP: loading the main content

LCP is usually a hero image, a video poster or a big block of text. Break it down into four parts and fix the largest:

1. **Time to first byte** — server and CDN speed. Cache HTML at the edge where possible.
2. **Resource load delay** — how late the browser *discovers* the LCP resource. Images set by JavaScript or CSS backgrounds are found late; put the `<img>` in the HTML and add `fetchpriority="high"` or a `<link rel="preload">`.
3. **Resource load time** — bytes. Use modern formats (AVIF, WebP), responsive `srcset` so phones don't download desktop-sized images, and compression.
4. **Render delay** — render-blocking CSS and JavaScript, or client-side rendering that waits for a bundle before showing anything. Server-side rendering or static generation helps.

> [!WARN] Never `loading="lazy"` the LCP image. Lazy loading is for images below the fold.

## INP: responding to input

INP measures the delay from an interaction to the next frame that shows its result, and reports roughly the worst interaction on the page. The cause is almost always **long tasks on the main thread** (Frontend chapter 2).

- **Ship less JavaScript.** Code-split by route and by feature (`import()` on demand), remove unused dependencies, prefer smaller libraries.
- **Delay third-party scripts** (chat widgets, tag managers) until after load or user interaction.
- **Yield inside heavy handlers**: update the UI to show feedback first, then do the slow work in chunks.
- **Avoid huge DOMs** — style and layout cost grows with element count; virtualise long lists.
- **Hydration cost** in server-rendered apps can block interaction; partial or progressive hydration and server components reduce it.

## CLS: visual stability

A layout shift happens when visible content moves without user input. Common causes and fixes:

- Images and videos without dimensions → always set `width`/`height` or `aspect-ratio`.
- Ads, banners and embeds injected late → reserve space with `min-height`.
- Web fonts swapping in with different metrics → `font-display: optional`/`swap` with a size-adjusted fallback font.
- Content inserted above existing content → insert below, or only after user action.

Animate with `transform` rather than changing layout properties; transforms don't count as layout shifts.

## Load less, load it smarter

- **Compression:** Brotli for text assets.
- **Caching:** fingerprinted assets (`app.3f9c2.js`) with `Cache-Control: max-age=31536000, immutable`; HTML revalidated or cached briefly.
- **CDN** close to users; HTTP/2 or HTTP/3.
- **Preconnect** to critical third-party origins; **prefetch** likely next pages.
- **Fonts:** subset them, self-host, preload the one or two used above the fold.

## Keeping it fast

Performance decays one commit at a time. Defend it:

- **Budgets in CI** — maximum bundle sizes, Lighthouse score thresholds.
- **Field dashboards** for LCP, INP and CLS at p75, split by device type and page.
- **Release reviews** — compare vitals before and after each deploy.

> [!EXAMPLE] **A sequence that worked.** Product page p75 on mobile: LCP 4.8 s → preload hero + AVIF + SSR → 2.1 s. INP 450 ms → route splitting and deferring two third-party scripts → 140 ms. CLS 0.31 → reserved banner space and image dimensions → 0.02.

> [!RECAP]
> - Measure real users at **p75**; use lab tools to debug.
> - **LCP** ≤ 2.5 s: discover the hero early, make it small, avoid render-blocking work.
> - **INP** ≤ 200 ms: less JavaScript, shorter tasks, delay third parties.
> - **CLS** ≤ 0.1: reserve space for images, ads and fonts.
> - Cache with fingerprinted assets, use a CDN, and enforce budgets in CI.

> [!INTERVIEW] "This page is slow — how would you investigate?" Start with field data, identify which vital is poor, use the Performance panel to find the cause, fix, and re-measure. Know what each vital measures and two fixes for each.

::quiz {"q": "Which metric measures how quickly a page responds to a tap?", "options": ["LCP", "CLS", "INP", "TTFB"], "answer": 2, "explain": "Interaction to Next Paint."}

::quiz {"q": "The hero image is lazy-loaded and set by JavaScript. Which metric suffers most?", "options": ["CLS", "LCP", "INP", "None"], "answer": 1, "explain": "The largest element is discovered and loaded late."}

::quiz {"q": "How do you prevent layout shift from images?", "options": ["Lazy-load all images", "Set width/height or aspect-ratio so space is reserved", "Use PNG", "Load images with JavaScript"], "answer": 1, "explain": "The browser can reserve the box before the image arrives."}
