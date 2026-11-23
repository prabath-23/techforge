---
title: Inside Blink and V8 — Rendering Pipeline, JIT Compilation and Garbage Collection
summary: The engines inside every renderer: Blink's pipeline from DOM to compositor frames (style, layout with LayoutNG, paint, the cc compositor and threaded scrolling), and V8's from source to machine code (parser, Ignition bytecode, Sparkplug, Maglev and TurboFan, hidden classes, inline caches, deoptimisation) and its generational, concurrent garbage collector.
---

::widget Scene {"title": "How V8 makes JavaScript fast", "sub": "one hot function from source to optimised machine code — and back", "nodes": [{"id": "src", "kind": "doc", "label": "function area(p) { return p.w * p.h }", "x": 3.72, "y": 3.72}, {"id": "ig", "kind": "cpu", "label": "Ignition (bytecode interpreter)", "x": 8.22, "y": -0.78, "color": "blue"}, {"id": "ic", "kind": "doc", "label": "Inline caches / feedback", "x": 2.33, "y": -6.67, "color": "orange"}, {"id": "sp", "kind": "cpu", "label": "Sparkplug / Maglev", "x": 12.72, "y": -5.28, "color": "teal"}, {"id": "tf", "kind": "cpu", "label": "TurboFan (optimising)", "x": 17.22, "y": -9.78, "color": "purple"}, {"id": "gc", "kind": "cube", "label": "Orinoco GC", "x": 18.3, "y": 0.3, "color": "green"}], "links": [["src", "ig"], ["ig", "ic"], ["ig", "sp"], ["sp", "tf"], ["tf", "ig", {"dashed": true, "label": "deopt"}]], "metrics": [["tier", "Tier"], ["speed", "Speed"], ["why", "Why"]], "steps": [{"short": "Parse", "tag": "Parse", "title": "V8 parses lazily: only functions that run get fully parsed", "body": "<p>Pre-parsing skims the rest. Code caching saves compiled bytecode for repeat visits.</p>", "show": ["src"], "metrics": {"tier": ["parser"], "speed": ["—"], "why": ["start fast"]}}, {"short": "Ignition", "tag": "Interpreter", "title": "Ignition compiles to compact bytecode and interprets it", "body": "<p>Quick to start, low memory.</p>", "show": ["src", "ig"], "flow": [["src", "ig", "#3b82f6", "bytecode"]], "metrics": {"tier": ["Ignition"], "speed": ["1×"]}}, {"short": "Shapes", "tag": "Hidden classes", "title": "Objects with the same properties in the same order share a hidden class (map)", "body": "<p>{w, h} objects all have map M1, so property w is always at the same offset.</p>", "show": ["src", "ig", "ic"], "set": {"ic": {"badge": "p: map M1"}}, "metrics": {"why": ["predictable layout"]}}, {"short": "IC", "tag": "Inline caches", "title": "Inline caches remember: \"p.w on M1 is at offset 12\"", "body": "<p>Monomorphic (one shape) is fastest; polymorphic (2–4) OK; megamorphic (many) is slow.</p>", "flow": [["ig", "ic", "#f59e0b", "feedback"]]}, {"short": "Baseline", "tag": "Tier up", "title": "Warm function: Sparkplug/Maglev compile quickly to machine code", "body": "<p>Mid-tier compilers trade some speed for very fast compilation.</p>", "show": ["src", "ig", "ic", "sp"], "flow": [["ig", "sp", "#14b8a6", "warm"]], "metrics": {"tier": ["Sparkplug/Maglev"], "speed": ["~3–10×"]}}, {"short": "Turbo", "tag": "Optimise", "title": "Hot function: TurboFan builds optimised code using the feedback", "body": "<p>Inlining, type specialisation, escape analysis — assuming p is always M1 with numbers.</p>", "show": ["src", "ig", "ic", "sp", "tf"], "flow": [["sp", "tf", "#a855f7", "hot"]], "metrics": {"tier": ["TurboFan"], "speed": ["up to ~100×", "good"]}}, {"short": "Deopt", "tag": "Deoptimise", "title": "Pass an object with a different shape (or a string): assumption broken", "body": "<p>V8 deoptimises back to Ignition and may re-optimise later. Frequent deopts hurt.</p>", "flow": [["tf", "ig", "#ef4444", "deopt: new map"]], "metrics": {"tier": ["back to Ignition"], "speed": ["1×", "bad"], "why": ["shape changed"]}}, {"short": "Tips", "tag": "Write fast JS", "title": "Keep shapes stable", "body": "<p>Initialise all properties in constructors in the same order; don't add/delete properties later; keep arrays of one element type.</p>"}, {"short": "GC", "tag": "GC", "title": "Orinoco GC: young generation scavenged often, old generation marked concurrently", "body": "<p>Most work happens on helper threads, keeping main-thread pauses short. Blink's Oilpan collects DOM objects in the same heap tracing.</p>", "show": ["src", "ig", "ic", "sp", "tf", "gc"], "note": {"kind": "key", "text": "Ignition → Sparkplug/Maglev → TurboFan, guided by inline-cache feedback on hidden classes; deopt when assumptions break; generational concurrent GC."}}]}

## Two engines in every tab

Every renderer process contains two large engines: **Blink**, which turns HTML and CSS into pixels, and **V8**, which runs JavaScript. If you've worked on a Chromium-based browser you've probably touched build flags, patches or crash reports from both. This chapter covers how they work.

## Blink's rendering pipeline

Blink runs a pipeline each time something changes (Frontend chapter 1 gives the web-developer view):

1. **Parse** — HTML tokenizer and tree builder create the DOM; CSS parser builds style sheets.
2. **Style** — compute each element's styles (selector matching, cascade, inheritance). Invalidation tracks which elements need recalculating.
3. **Layout** — **LayoutNG** produces an immutable fragment tree with positions and sizes.
4. **Pre-paint / paint** — build property trees (transform, clip, effect, scroll) and record **display items** (draw commands).
5. **Commit to the compositor** — the main thread hands layers and display lists to the compositor thread.

### The compositor (cc) and threaded scrolling

The **compositor thread** in the renderer can scroll and run transform/opacity animations **without the main thread**. That's why a page stays scrollable while JavaScript is busy — unless a non-passive `wheel`/`touch` listener forces scrolling to wait for JavaScript.

Compositor frames are sent to **Viz** in the GPU process, which rasterises tiles (on the GPU, via Skia) and composites surfaces from every renderer and the browser UI into the final screen image.

## V8: from source to machine code

### Parsing and bytecode

V8 parses **lazily**: functions are pre-parsed quickly and fully parsed only when first called. **Ignition** turns code into compact bytecode and interprets it. Compiled bytecode is stored in the **code cache** so repeat visits start faster.

### Tiers

- **Ignition** — interpreter; collects **feedback** about types and object shapes.
- **Sparkplug** — very fast baseline compiler straight from bytecode.
- **Maglev** — mid-tier optimising compiler: good code, quickly.
- **TurboFan** — top-tier optimiser: inlining, type specialisation, escape analysis, bounds-check elimination.

Functions move up tiers as they get hotter.

### Hidden classes and inline caches

JavaScript objects are dynamic, but V8 gives objects with the same properties added in the same order the same **hidden class** (called a *map*). An **inline cache** at each property access remembers which maps it has seen and where the property lives:

- **Monomorphic** (one map) — fastest.
- **Polymorphic** (a few) — fine.
- **Megamorphic** (many) — falls back to slow lookups.

### Deoptimisation

TurboFan code relies on assumptions ("p is always map M1 with number fields"). When one breaks, V8 **deoptimises** — throws the optimised code away and resumes in Ignition. Occasional deopts are normal; deopt loops are a performance bug.

```js
// Shape-stable: every Point has the same map
class Point { constructor(x, y) { this.x = x; this.y = y } }

// Shape-unstable: properties added conditionally, in different orders
const p = {}; if (a) p.y = 1; p.x = 2
```

## Memory: Orinoco and Oilpan

V8's garbage collector (**Orinoco**) is generational:

- **Young generation** — a fast **scavenger** copies survivors; runs often.
- **Old generation** — **mark-compact**, with marking done concurrently and incrementally on helper threads, and parallel compaction.

Blink's C++ DOM objects are managed by **Oilpan**, a garbage collector for C++ that traces together with V8 so cycles between JavaScript wrappers and DOM nodes are collected.

## Security in the engines

V8 is the most attacked component of the browser: type confusion bugs in optimising compilers are classic exploits. Mitigations include the **V8 sandbox** (keeping heap pointers within a cage so memory corruption can't easily reach other memory), pointer compression, control-flow integrity, and fuzzing at enormous scale (ClusterFuzz).

> [!RECAP]
> - Blink: parse → style → LayoutNG → paint (display lists) → commit to compositor → Viz.
> - The compositor thread scrolls and animates transform/opacity independently of JavaScript.
> - V8 tiers: **Ignition → Sparkplug → Maglev → TurboFan**, driven by feedback.
> - **Hidden classes + inline caches** make property access fast; changing shapes causes **deopts**.
> - GC: generational, concurrent (Orinoco) + Oilpan for DOM objects.

> [!INTERVIEW] "How does V8 optimise JavaScript?", "What are hidden classes?", "Why does scrolling stay smooth when the main thread is busy?", "What is deoptimisation?", "How does V8's GC avoid long pauses?"

::quiz {"q": "What makes property access fast in V8?", "options": ["Interpreting every access", "Hidden classes plus inline caches remembering property offsets", "Storing objects as JSON", "Using the GPU"], "answer": 1, "explain": "Same shape → same offset."}

::quiz {"q": "What happens when optimised code's type assumption is broken?", "options": ["A crash", "V8 deoptimises back to the interpreter", "The page reloads", "Nothing"], "answer": 1, "explain": "It may re-optimise later with new feedback."}

::quiz {"q": "Why can a page keep scrolling while JavaScript runs a long task?", "options": ["Scrolling runs on the compositor thread", "JavaScript pauses itself", "The GPU runs JavaScript", "It can't"], "answer": 0, "explain": "Unless non-passive listeners force it to wait."}
