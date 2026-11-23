---
title: Chromium Architecture: Processes, Mojo IPC, the Sandbox and Site Isolation
summary: Why Chromium splits itself into many processes: the browser process, renderers, GPU, network and utility services; how they talk over Mojo IPC; how the sandbox strips renderers of privileges; site isolation and Spectre; process models and memory trade-offs; and what crashes look like in this design.
---

::widget Scene {"title": "One browser, many processes", "sub": "what runs where when you open three tabs", "nodes": [{"id": "bp", "kind": "server", "label": "Browser process (UI, tabs, profile)", "x": 3.72, "y": 3.72, "color": "purple"}, {"id": "r1", "kind": "laptop", "label": "Renderer: mail.com", "x": 2.71, "y": -8.29, "color": "blue"}, {"id": "r2", "kind": "laptop", "label": "Renderer: news.com", "x": 9.22, "y": -1.78, "color": "blue"}, {"id": "r3", "kind": "laptop", "label": "Renderer: ads.example (iframe)", "x": 15.73, "y": 4.73, "color": "orange"}, {"id": "gpu", "kind": "cpu", "label": "GPU process (Viz)", "x": 8.21, "y": -13.79, "color": "green"}, {"id": "net", "kind": "router", "label": "Network service", "x": 14.72, "y": -7.28, "color": "teal"}, {"id": "util", "kind": "cube", "label": "Utility (audio, storage)", "x": 21.23, "y": -0.77, "color": "dark"}], "links": [["bp", "r1", {"label": "Mojo"}], ["bp", "r2"], ["bp", "r3"], ["bp", "gpu"], ["bp", "net"], ["bp", "util"], ["r1", "gpu", {"dashed": true}], ["r2", "gpu", {"dashed": true}]], "metrics": [["proc", "Process"], ["priv", "Privileges"], ["role", "Job"]], "steps": [{"short": "Why", "tag": "Why", "title": "Old browsers ran everything in one process", "body": "<p>One bad page or plugin crashed every tab, and one exploit owned the whole browser and your files.</p>", "show": ["bp"], "metrics": {"proc": ["-"], "priv": ["-"], "role": ["-"]}}, {"short": "Browser", "tag": "Browser process", "title": "The browser process is the trusted coordinator", "body": "<p>Owns the window, tabs, address bar, profile data (cookies, passwords), permissions and navigation decisions.</p>", "focus": ["bp"], "metrics": {"proc": ["browser"], "priv": ["full user privileges"], "role": ["UI, policy, storage"]}}, {"short": "Renderers", "tag": "Renderers", "title": "Each site gets its own sandboxed renderer process", "body": "<p>Blink (HTML/CSS/DOM) and V8 (JavaScript) run here, the code that handles untrusted web content.</p>", "show": ["bp", "r1", "r2"], "focus": ["r1", "r2"], "metrics": {"proc": ["renderer"], "priv": ["almost none (sandbox)", "good"], "role": ["parse, script, layout, paint"]}}, {"short": "Sandbox", "tag": "Sandbox", "title": "The sandbox removes renderer privileges", "body": "<p>No direct file, network or device access. On Linux: namespaces + seccomp-BPF; Windows: restricted tokens and job objects; macOS: Seatbelt profiles.</p>", "set": {"r1": {"badge": "sandboxed"}, "r2": {"badge": "sandboxed"}}}, {"short": "Mojo", "tag": "IPC", "title": "Everything a renderer needs, it asks for over Mojo IPC", "body": "<p>Typed interfaces defined in .mojom files. The browser process validates each request, a compromised renderer can only ask, not take.</p>", "flow": [["r1", "bp", "#a855f7", "please open file picker"]]}, {"short": "Iframe", "tag": "Site isolation", "title": "A cross-site iframe gets its own renderer process (OOPIF)", "body": "<p>ads.example inside news.com runs in a separate process. Spectre-style attacks can only read memory of their own process, so other sites' data isn't there to steal.</p>", "show": ["bp", "r1", "r2", "r3"], "focus": ["r3"], "set": {"r3": {"badge": "separate process"}}, "metrics": {"proc": ["renderer (OOPIF)"], "role": ["cross-site iframe"]}}, {"short": "Net", "tag": "Services", "title": "Networking runs in the network service", "body": "<p>HTTP, caching, cookies, DNS, QUIC, out of the browser process, so a network-stack bug is contained.</p>", "show": ["bp", "r1", "r2", "r3", "net"], "flow": [["bp", "net", "#14b8a6", "fetch"]], "metrics": {"proc": ["network service"]}}, {"short": "GPU", "tag": "GPU", "title": "The GPU process (Viz) composites every tab's frames", "body": "<p>Renderers send compositor frames; one process talks to the graphics driver, a frequent source of crashes, kept away from everything else.</p>", "show": ["bp", "r1", "r2", "r3", "net", "gpu"], "flow": [["r1", "gpu", "#22c55e", "frames"], ["r2", "gpu", "#22c55e", ""]], "metrics": {"proc": ["GPU"], "role": ["raster + composite"]}}, {"short": "Crash", "tag": "Resilience", "title": "news.com's renderer crashes: only that tab shows \"Aw, Snap!\"", "body": "<p>Utility processes (audio, storage, printing) are likewise isolated and restartable.</p>", "show": ["bp", "r1", "r2", "r3", "net", "gpu", "util"], "set": {"r2": {"dim": true, "badge": "crashed"}}}, {"short": "Cost", "tag": "Trade-off", "title": "The cost is memory", "body": "<p>Each process has overhead; Chromium shares renderers between same-site tabs under memory pressure, discards background tabs, and freezes them.</p>", "set": {"r2": {"dim": false, "badge": null}}, "note": {"kind": "key", "text": "Trusted browser process + sandboxed per-site renderers + service processes (network, GPU, utility), all talking over Mojo. Isolation buys stability and security at a memory cost."}}]}

## One tab crashed, everything survived

> [!STORY] In 2008 Chrome launched with a comic book explaining an unusual idea: every tab would be its own process. Back then, one misbehaving page or plugin could freeze or crash the entire browser, and an exploit in the rendering engine gave the attacker everything the browser could touch. Chromium's multi-process architecture has since become the model every major browser follows. If you've worked on a Chromium fork, this is the map of the house you've been living in.

## The process types

| Process | Trusted? | Runs |
|---|---|---|
| **Browser** | yes | windows, tabs, omnibox, navigation, profile storage (cookies, passwords, history), permissions, policy |
| **Renderer** | no (sandboxed) | Blink (DOM, CSS, layout, paint) and V8 (JavaScript) for one site |
| **GPU (Viz)** | partly | rasterisation and compositing, talking to the graphics driver |
| **Network service** | partly | HTTP stack, cache, cookies jar access, DNS, QUIC |
| **Utility** | sandboxed | audio, storage, data decoding, printing, and other services |
| **Extension renderers** | sandboxed | extension pages and service workers |
| **Crashpad handler** | - | collects crash dumps |

The **browser process** is the trusted coordinator. Everything that processes untrusted content, HTML, JavaScript, images, fonts, happens elsewhere, with as few privileges as possible.

## Mojo IPC

Processes communicate through **Mojo** Chromium's IPC system. Interfaces are defined in `.mojom` files and generated into C++ (and Java/JS) bindings:

```
interface FileChooser {
  OpenFileChooser(FileChooserParams params) => (FileChooserResult? result);
};
```

The rule: a renderer can only **request**; the browser process **validates** every message as if it came from an attacker, check origins, sizes, and that the renderer is allowed to make this call for this frame. Bugs in that validation are some of the most valuable sandbox-escape findings.

> [!ANALOGY] Renderers are workers in a sealed room. They can slide request forms under the door, but a guard outside (the browser process) reads every form and decides whether to act on it.

## The sandbox

Renderers start with privileges and then **drop** them:

- **Windows:** restricted tokens, low integrity level, job objects, win32k lockdown.
- **Linux/ChromeOS:** user and PID namespaces plus **seccomp-BPF** filters that allow only a small set of system calls.
- **macOS:** Seatbelt sandbox profiles.

A renderer can't open files, create sockets or launch processes. To exploit a user fully, an attacker typically needs a **chain**: a renderer bug (often in V8) *plus* a sandbox escape (often a Mojo validation bug or a kernel bug).

## Site isolation

**Site isolation** puts each *site* (scheme + registrable domain, like `https://example.com`) in its own renderer process, including **cross-site iframes** which become out-of-process iframes (OOPIFs). It was turned on by default on desktop in 2018, largely because of **Spectre**: speculative-execution attacks let JavaScript read memory in its own process, so the defence is to make sure other sites' data is never in that process.

Supporting features:

- **CORB/ORB** (cross-origin read blocking) stops a page from pulling sensitive cross-site JSON/HTML into its process via `<img>` or `<script>` tricks.
- **Cross-Origin-Opener-Policy / Embedder-Policy** let pages opt into stronger isolation ("cross-origin isolated"), unlocking `SharedArrayBuffer` and high-resolution timers.

## Process model and memory

More processes = more memory. Chromium balances this:

- Same-site tabs may share a renderer; there's a soft process limit based on device memory.
- **Tab discarding** and **freezing** reclaim memory from background tabs.
- Android uses a lighter model on low-memory devices.

## Crashes in a multi-process world

- A **renderer crash** shows "Aw, Snap!" in one tab; reloading starts a new process.
- A **GPU process crash** usually recovers by restarting it (screens may flicker); repeated crashes fall back to software rendering.
- A **browser process crash** takes down the whole browser, so that code is held to the highest standard.
- **Crashpad** captures minidumps; symbolised stacks are uploaded to a crash server for triage, grouped by signature.

> [!RECAP]
> - Trusted **browser** process; untrusted, **sandboxed renderers** per site; separate **GPU, network and utility** services.
> - **Mojo** IPC with strict validation in the browser process.
> - OS-specific sandboxing; full exploits need a renderer bug + sandbox escape.
> - **Site isolation** (including OOPIFs) defends against Spectre and compromised renderers.
> - Isolation costs memory; Chromium mitigates with process sharing, discarding and freezing.

> [!INTERVIEW] "Why is Chrome multi-process?", "What does the sandbox prevent?", "What is site isolation and why did Spectre matter?", "How do processes communicate?", "What happens when a renderer crashes?"

::quiz {"q": "Which process runs JavaScript for web pages?", "options": ["Browser process", "Renderer process", "GPU process", "Network service"], "answer": 1, "explain": "V8 and Blink run in sandboxed renderers."}

::quiz {"q": "Why did Spectre push browsers toward site isolation?", "options": ["It made networks slower", "Speculative-execution attacks can read memory in the same process, so other sites must live in other processes", "It broke the GPU", "It required HTTPS"], "answer": 1, "explain": "Keep cross-site data out of the attacker's process."}

::quiz {"q": "A compromised renderer wants to read a local file. What stops it?", "options": ["Nothing", "The sandbox forbids direct file access; requests over Mojo are validated by the browser process", "The GPU process", "CORS"], "answer": 1, "explain": "It can only ask, and the browser decides."}
