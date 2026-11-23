---
title: How Browsers Render a Page: From Bytes to Pixels
summary: What happens between receiving HTML and seeing pixels: parsing into the DOM and CSSOM, render-blocking CSS and scripts, building the render tree, layout, paint and compositing, and how to keep each step cheap so pages load fast and animations stay smooth.
---

::widget Scene {"title": "The critical rendering path", "sub": "one HTML response becomes pixels, every stage the browser runs", "nodes": [{"id": "net", "kind": "cloud", "label": "Network: index.html", "x": 3.72, "y": 3.72}, {"id": "dom", "kind": "doc", "label": "DOM tree", "x": 4.62, "y": -3.38, "color": "blue"}, {"id": "cssom", "kind": "doc", "label": "CSSOM", "x": 10.82, "y": 2.82, "color": "purple"}, {"id": "js", "kind": "cpu", "label": "JavaScript", "x": 9.3, "y": 9.3, "color": "orange"}, {"id": "rt", "kind": "cube", "label": "Render tree", "x": 11.72, "y": -4.28, "color": "teal"}, {"id": "lay", "kind": "cube", "label": "Layout", "x": 15.32, "y": -7.88, "color": "green"}, {"id": "paint", "kind": "cube", "label": "Paint", "x": 18.92, "y": -11.48, "color": "pink"}, {"id": "comp", "kind": "blocks", "label": "Composite (GPU)", "x": 22.52, "y": -15.08, "count": 4, "color": "dark"}], "links": [["net", "dom"], ["net", "cssom"], ["js", "dom", {"dashed": true}], ["dom", "rt"], ["cssom", "rt"], ["rt", "lay"], ["lay", "paint"], ["paint", "comp"]], "metrics": [["stage", "Stage"], ["blocks", "Blocks rendering?"], ["time", "Typical cost"]], "steps": [{"short": "Bytes", "tag": "Network", "title": "HTML arrives as bytes", "body": "<p>The browser decodes them (UTF-8) and starts parsing immediately, it does not wait for the whole file.</p>", "show": ["net"], "metrics": {"stage": ["download"], "blocks": ["-"], "time": ["network RTTs"]}}, {"short": "DOM", "tag": "Parse HTML", "title": "The HTML parser builds the DOM", "body": "<p>Tags become nodes in a tree: html → body → header, main, img… JavaScript will later read and change this tree.</p>", "show": ["net", "dom"], "flow": [["net", "dom", "#3b82f6", "tokens → nodes"]], "metrics": {"stage": ["DOM construction"]}}, {"short": "CSS", "tag": "Parse CSS", "title": "A &lt;link rel=stylesheet&gt; is found: fetch and parse CSS into the CSSOM", "body": "<p>CSS is render-blocking: the browser will not paint until it knows the styles, otherwise you would see a flash of unstyled content.</p>", "show": ["net", "dom", "cssom"], "flow": [["net", "cssom", "#a855f7", "style.css"]], "metrics": {"stage": ["CSSOM"], "blocks": ["yes, rendering", "bad"]}}, {"short": "Script", "tag": "JavaScript", "title": "A plain &lt;script src&gt; stops the HTML parser", "body": "<p>The script might call document.write or read styles, so the parser waits for it to download AND run. Big scripts in &lt;head&gt; delay everything.</p>", "show": ["net", "dom", "cssom", "js"], "flow": [["js", "dom", "#f59e0b", "parser paused"]], "set": {"dom": {"badge": "paused"}}, "metrics": {"stage": ["script"], "blocks": ["yes, parsing", "bad"]}}, {"short": "Defer", "tag": "Fix", "title": "Use defer (or type=module): download in parallel, run after parsing", "body": "<p>async also downloads in parallel but runs as soon as it arrives, in any order, good for independent scripts like analytics.</p>", "set": {"dom": {"badge": null}}, "metrics": {"blocks": ["no (defer)", "good"]}}, {"short": "Render tree", "tag": "Combine", "title": "DOM + CSSOM → render tree", "body": "<p>Only visible things: elements with display:none are left out; ::before content is added. Each node now knows its computed style.</p>", "show": ["net", "dom", "cssom", "js", "rt"], "flow": [["dom", "rt", "#14b8a6", ""], ["cssom", "rt", "#14b8a6", ""]], "metrics": {"stage": ["render tree"], "blocks": ["-"]}}, {"short": "Layout", "tag": "Layout", "title": "Layout (reflow): compute every box's size and position", "body": "<p>Widths depend on parents, heights on content and fonts. Changing one element's width can move everything after it.</p>", "show": ["net", "dom", "cssom", "js", "rt", "lay"], "flow": [["rt", "lay", "#22c55e", "geometry"]], "metrics": {"stage": ["layout"], "time": ["ms per change, grows with DOM size"]}}, {"short": "Paint", "tag": "Paint", "title": "Paint: turn boxes into drawing commands", "body": "<p>Text, colours, borders, shadows, images, recorded per layer.</p>", "show": ["net", "dom", "cssom", "js", "rt", "lay", "paint"], "flow": [["lay", "paint", "#ec4899", "draw lists"]], "metrics": {"stage": ["paint"]}}, {"short": "Composite", "tag": "Composite", "title": "Composite: the GPU stacks layers into the final frame", "body": "<p>Elements animated with transform or opacity get their own layer, so the GPU can move them without layout or paint, that is why those properties animate smoothly.</p>", "show": ["net", "dom", "cssom", "js", "rt", "lay", "paint", "comp"], "flow": [["paint", "comp", "#3b82f6", "layers"]], "metrics": {"stage": ["composite"], "time": ["cheapest step", "good"]}}, {"short": "Frame", "tag": "Budget", "title": "Each frame has ~16 ms at 60 fps", "body": "<p>JavaScript + style + layout + paint + composite must fit. Animating width or top forces layout every frame and janks; animating transform only composites.</p>", "note": {"kind": "key", "text": "Bytes → DOM + CSSOM → render tree → layout → paint → composite. Keep CSS lean, defer scripts, and animate only transform and opacity."}}]}

## The 3-second blank screen

> [!STORY] A team ships a redesign and the home page now shows a white screen for three seconds on mid-range phones, even though the server answers in 80 ms. The culprit isn't the network or the backend: a 400 KB analytics bundle sits in a plain `<script>` tag at the top of `<head>`, and a large CSS file with styles for every page of the site has to download before anything can be drawn. Moving the script to `defer` and splitting the CSS cuts the first paint to under a second. Understanding how a browser turns bytes into pixels is what makes fixes like this obvious.

When people say "the page is slow", they usually mean one of two things: it took long to *appear* (loading), or it *stutters* when you scroll and interact (rendering). Both come down to the same pipeline the browser runs for every page.

## Step 1: parsing HTML into the DOM

The browser receives HTML as a stream of bytes and parses it **incrementally** it doesn't wait for the whole document. The parser turns tags into a tree of nodes called the **DOM** (Document Object Model). This tree is what JavaScript reads and modifies with `document.querySelector`, `appendChild` and friends.

While parsing, the browser's **preload scanner** looks ahead for resources, stylesheets, scripts, images, fonts, and starts downloading them early, in parallel.

> [!ANALOGY] Think of a builder reading a blueprint line by line and starting construction as they go, while an assistant reads ahead and orders materials before they're needed.

## Step 2: CSS is render-blocking

Every stylesheet is parsed into the **CSSOM** a tree of style rules. The browser refuses to paint until it has the CSSOM for the stylesheets in the document, because painting first and restyling later would cause a jarring flash of unstyled content.

Practical consequences:

- **Big CSS files delay the first paint.** Ship the CSS needed for the first screen first ("critical CSS"), and load the rest later or per route.
- `media` attributes help: `<link rel="stylesheet" href="print.css" media="print">` doesn't block screen rendering.
- `@import` inside CSS creates a waterfall of sequential downloads. Avoid it.

## Step 3: JavaScript can block the parser

A classic `<script src="app.js">` **stops HTML parsing** until the file has downloaded *and* executed, because the script might modify the document being parsed. Scripts also wait for preceding CSS, since they might read computed styles.

| Attribute | Downloads | Runs | Order kept? | Use for |
|---|---|---|---|---|
| none | blocking | immediately, parser paused | yes | almost never |
| `async` | in parallel | as soon as downloaded | no | independent scripts (analytics) |
| `defer` | in parallel | after parsing finishes | yes | your app code |
| `type="module"` | in parallel | deferred by default | yes | modern bundles |

> [!WARN] A synchronous third-party script (chat widget, A/B testing tool) in `<head>` puts that vendor's server on your critical path. If it's slow, your page is blank.

## Step 4: the render tree, layout and paint

Once the DOM and CSSOM are ready, the browser combines them into the **render tree**: only the nodes that will actually be shown, each with its computed style. `display: none` elements are left out; `visibility: hidden` ones stay (they still take space).

Then come three stages that also re-run whenever the page changes:

1. **Layout (reflow)** compute the exact size and position of every box. Layout is global-ish: changing one element's width can shift everything after it.
2. **Paint** record drawing commands for text, colours, borders, shadows and images.
3. **Composite** the page is split into layers; the GPU stacks them into the final image.

### What triggers which stage

- Changing `width`, `height`, `top`, `margin`, font size or DOM structure → **layout + paint + composite** (most expensive).
- Changing `color`, `background`, `box-shadow` → **paint + composite**.
- Changing `transform` or `opacity` on an element with its own layer → **composite only** (cheapest).

That is why smooth animations use `transform: translateX(...)` instead of `left`, and `opacity` instead of toggling `visibility` through layout.

## Layout thrashing

Reading a layout property (`offsetHeight`, `getBoundingClientRect()`) forces the browser to finish any pending layout. Interleaving reads and writes in a loop forces layout again and again:

```js
// Bad: read → write → read → write … forces a layout on every iteration
for (const el of items) {
  el.style.width = el.parentNode.offsetWidth / 2 + 'px'
}

// Good: batch all reads, then all writes
const widths = items.map(el => el.parentNode.offsetWidth)
items.forEach((el, i) => { el.style.width = widths[i] / 2 + 'px' })
```

For animation work, schedule writes with `requestAnimationFrame`, which runs your callback just before the next frame is drawn.

## The frame budget

At 60 frames per second each frame has about **16.7 ms**. In that time the browser must run your JavaScript, recalculate styles, lay out, paint and composite. Long JavaScript tasks (over 50 ms) block all of this, which shows up as scroll jank and slow responses to clicks.

> [!EXAMPLE] **A smooth sidebar.** Animating a sidebar's `left` from −300px to 0 triggers layout every frame and stutters on phones. Animating `transform: translateX(-300px)` to `0` instead, with `will-change: transform` hinting a separate layer, runs entirely on the compositor at 60 fps.

> [!RECAP]
> - Pipeline: **bytes → DOM + CSSOM → render tree → layout → paint → composite**.
> - **CSS blocks rendering**; plain **scripts block parsing**. Use `defer`/`module`, `async` for independent scripts, and ship critical CSS first.
> - Changes to geometry trigger layout; colours trigger paint; **transform and opacity** only composite.
> - Avoid layout thrashing by batching reads and writes; animate with `requestAnimationFrame`.
> - Each frame has ~16 ms; long tasks cause jank.

> [!INTERVIEW] "What happens after you type a URL?" continues past the network into this pipeline. Also expect: "Why is my animation janky?", "async vs defer?", "What is reflow vs repaint?", and "How would you speed up first paint?"

::quiz {"q": "Why does a plain <script src> in the <head> delay the page?", "options": ["It blocks CSS downloads", "The HTML parser stops until the script downloads and runs", "Scripts are always downloaded last", "It disables the GPU"], "answer": 1, "explain": "The script might change the document, so parsing waits. Use defer or type=module."}

::quiz {"q": "Which CSS change is cheapest to animate?", "options": ["width", "top", "transform", "margin-left"], "answer": 2, "explain": "transform (and opacity) can be handled by the compositor without layout or paint."}

::quiz {"q": "What is layout thrashing?", "options": ["Too many CSS files", "Repeatedly interleaving layout reads and style writes, forcing layout many times", "A GPU crash", "Downloading fonts twice"], "answer": 1, "explain": "Batch reads, then writes."}
