---
title: How Vite Works: Native ES Modules, Dependency Pre-bundling, HMR and the Production Build
summary: Why Vite starts instantly: serving source files as native ES modules on demand, pre-bundling dependencies with esbuild, transforming Vue/TS/CSS through plugins, hot module replacement that swaps one component without reloading, the dev proxy, and the production build with Rollup (code splitting, hashing, tree-shaking, CSS extraction), plus how it compares with webpack.
---

::widget Scene {"title": "Vite dev server: from request to hot update", "sub": "no bundling in development, the browser asks for modules one by one", "nodes": [{"id": "br", "kind": "laptop", "label": "Browser", "x": 3.72, "y": 3.72}, {"id": "srv", "kind": "server", "label": "Vite dev server", "x": 8.22, "y": -0.78, "color": "green"}, {"id": "pre", "kind": "cpu", "label": "esbuild pre-bundle (deps)", "x": 6.83, "y": -11.17, "color": "orange"}, {"id": "plug", "kind": "cube", "label": "Plugins: vue, ts, css", "x": 12.72, "y": -5.28, "color": "purple"}, {"id": "src", "kind": "doc", "label": "src/*.vue, *.ts", "x": 17.22, "y": -9.78, "color": "blue"}, {"id": "ws", "kind": "router", "label": "HMR WebSocket", "x": 14.11, "y": 5.11, "color": "pink"}], "links": [["br", "srv", {"both": true}], ["srv", "pre"], ["srv", "plug"], ["plug", "src"], ["srv", "ws"], ["ws", "br", {"dashed": true}]], "metrics": [["req", "Request"], ["work", "Work done"], ["time", "Time"]], "steps": [{"short": "Start", "tag": "Start", "title": "npm run dev: Vite starts a server, without bundling your app", "body": "<p>Old bundlers built the whole app before serving; startup grew with app size. Vite starts in ~300 ms regardless.</p>", "show": ["br", "srv"], "metrics": {"req": ["-"], "work": ["start server"], "time": ["~300 ms", "good"]}}, {"short": "Deps", "tag": "Pre-bundle", "title": "First run: pre-bundle dependencies with esbuild", "body": "<p>vue, lodash-es… become a few ESM files in node_modules/.vite: CommonJS converted to ESM, and hundreds of tiny modules merged so the browser doesn't make 600 requests. Cached until the lockfile changes.</p>", "show": ["br", "srv", "pre"], "flow": [["srv", "pre", "#f59e0b", "esbuild (Go, very fast)"]], "metrics": {"work": ["pre-bundle deps once"]}}, {"short": "HTML", "tag": "Request", "title": "The browser loads index.html, which has <script type=\"module\" src=\"/src/main.ts\">", "body": "<p>Native ES modules: the browser itself follows import statements.</p>", "flow": [["br", "srv", "#3b82f6", "GET /src/main.ts"]], "metrics": {"req": ["/src/main.ts"]}}, {"short": "Transform", "tag": "Transform", "title": "Vite transforms each requested file on demand", "body": "<p>TypeScript stripped by esbuild, .vue compiled by the Vue plugin, CSS turned into a JS module; bare imports rewritten to /node_modules/.vite/deps/vue.js.</p>", "show": ["br", "srv", "pre", "plug", "src"], "flow": [["srv", "plug", "#a855f7", "App.vue"], ["plug", "src", "#3b82f6", "read"]], "metrics": {"req": ["/src/App.vue"], "work": ["compile just this file"]}}, {"short": "Lazy", "tag": "On demand", "title": "Only modules the current page imports are processed", "body": "<p>A route you never visit is never compiled. Responses are cached and revalidated.</p>", "metrics": {"time": ["scales with the page, not the app", "good"]}}, {"short": "Edit", "tag": "HMR", "title": "You edit OrderCard.vue and save", "body": "<p>Vite recompiles that one file and sends an update over a WebSocket.</p>", "show": ["br", "srv", "pre", "plug", "src", "ws"], "flow": [["src", "plug", "#a855f7", "changed"], ["srv", "ws", "#ec4899", "update OrderCard"]], "metrics": {"req": ["HMR update"], "work": ["1 module"]}}, {"short": "Swap", "tag": "HMR", "title": "The browser swaps the module in place, component state is kept", "body": "<p>Style-only changes don't even re-render. If a module can't accept the update, Vite reloads the page.</p>", "flow": [["ws", "br", "#ec4899", "import new OrderCard"]], "metrics": {"time": ["~50 ms", "good"]}}, {"short": "Build", "tag": "Production", "title": "vite build: bundle with Rollup for production", "body": "<p>Tree-shaking, code splitting per dynamic import, minification, hashed filenames (app.3f9c2.js), CSS extraction, asset optimisation. Unbundled ESM is great in dev, but too many requests for production.</p>", "metrics": {"req": ["vite build"], "work": ["full optimised bundle"]}, "note": {"kind": "key", "text": "Dev: native ESM served on demand + esbuild-pre-bundled deps + per-module transforms + HMR over WebSocket. Prod: Rollup bundle with splitting, tree-shaking, hashing."}}]}

## Why the dev server used to be slow

> [!STORY] On a large webpack project, starting the dev server took two minutes and every save took eight seconds to show up, because the bundler rebuilt a dependency graph of thousands of modules before the browser could see anything. Vite's insight was that modern browsers can load **ES modules** natively, so in development there's no need to bundle at all. Start time went from minutes to under a second.

## Two modes, two strategies

| | Development (`vite`) | Production (`vite build`) |
|---|---|---|
| Your code | served as native ES modules, transformed per request | bundled by **Rollup** |
| Dependencies | **pre-bundled** once with esbuild | bundled and tree-shaken |
| Updates | **HMR** over WebSocket | - |
| Goal | instant start, instant feedback | smallest, fastest, cacheable output |

(Newer Vite versions are moving to Rolldown, a Rust port of Rollup, for both.)

## The dev server step by step

1. **Pre-bundling dependencies.** On first run Vite scans your imports and bundles dependencies with **esbuild** (written in Go, 10–100× faster than JS bundlers) into `node_modules/.vite/deps`. This converts CommonJS packages to ESM and merges packages made of many tiny files (lodash-es has 600+). The result is cached until your lockfile or config changes.
2. **Serving `index.html`** the entry point, which loads `/src/main.ts` with `<script type="module">`.
3. **On-demand transforms.** When the browser requests a file, Vite runs it through plugins: esbuild strips TypeScript types, `@vitejs/plugin-vue` compiles `.vue` SFCs into JS (render function + CSS module), CSS/PostCSS/Sass are processed, and bare imports (`'vue'`) are rewritten to their pre-bundled paths.
4. **Caching:** dependency files get strong cache headers; source files use 304 revalidation.

Because only the modules the current page imports are transformed, startup and page loads scale with **what you're looking at** not the size of the app.

> [!NOTE] Vite uses esbuild only to **strip** TypeScript types, not to type-check, that's why `vue-tsc --noEmit` (or your IDE) runs separately, typically in the `build` script and CI.

## Hot Module Replacement

When you save a file, Vite's file watcher notices, recompiles that module, and sends a message over a **WebSocket** to the HMR client in the page. The client re-imports the changed module (with a cache-busting query) and calls the module's **HMR accept handler**:

- For Vue SFCs, the plugin swaps the component's render function or setup while **preserving state** where possible.
- CSS changes swap the stylesheet without re-rendering.
- If no boundary accepts the update (e.g. you changed `main.ts`), Vite does a full reload.

HMR speed stays roughly constant however big the project grows, because only the edited module and its boundary are processed.

## Configuration essentials

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },  // avoid CORS in dev
  },
  build: { sourcemap: true, rollupOptions: { output: { manualChunks: { charts: ['echarts'] } } } },
})
```

- **Proxy** forwards `/api` to your Spring Boot backend in development, so the browser sees one origin (no CORS setup needed locally).
- **Aliases** for clean imports.
- **`base`** when deploying under a sub-path (e.g. GitHub Pages project sites).
- **Modes** (`--mode staging`) select `.env.staging`.

## The production build

`vite build` produces `dist/`:

- **Tree-shaking** removes unused exports (works best with ESM dependencies).
- **Code splitting:** each dynamic `import()` (lazy routes) becomes its own chunk, loaded when needed; shared code goes to common chunks.
- **Hashed filenames** (`index-3f9c2a.js`) so files can be cached for a year and changed files get new names.
- **CSS extraction** per chunk, **asset handling** (small assets inlined, others hashed), **minification** with esbuild.
- **Preload directives** for chunks a page will need.
- `vite preview` serves `dist/` locally to test the real build.

## Plugins

Vite plugins follow the Rollup plugin interface plus Vite-specific hooks (`configureServer`, `transformIndexHtml`, `handleHotUpdate`). Common ones: framework plugins (Vue, React), legacy browser support, PWA, compression, visualiser (inspect bundle size), auto-imports, SVG loaders.

## Vite vs webpack

| | webpack | Vite |
|---|---|---|
| Dev | bundles everything before serving | serves unbundled ESM on demand |
| Start time | grows with app size | near-constant |
| HMR | rebuilds affected chunks | swaps one module |
| Config | powerful, verbose | small, sensible defaults |
| Prod bundler | webpack | Rollup (Rolldown) |

Vite also powers Nuxt, SvelteKit, Astro, Vitest and many others.

> [!RECAP]
> - Dev: **no bundling** native ES modules, transformed on demand per request.
> - Dependencies **pre-bundled with esbuild** (CJS → ESM, fewer requests), cached.
> - Plugins compile `.vue`, strip TS (no type-check), process CSS; bare imports rewritten.
> - **HMR** over WebSocket swaps a single module, keeping state.
> - Prod: **Rollup** with tree-shaking, code splitting, hashing, CSS extraction.
> - Config: plugins, aliases, dev proxy to the backend, base path, modes.

> [!INTERVIEW] "Why is Vite faster than webpack in development?", "What is dependency pre-bundling?", "How does HMR work?", "Why does Vite still bundle for production?", "Does Vite type-check TypeScript?", "How do you avoid CORS in local development?"

::quiz {"q": "Why does Vite's dev server start almost instantly?", "options": ["It caches the whole bundle", "It serves source as native ES modules on demand instead of bundling first", "It skips TypeScript", "It uses a CDN"], "answer": 1, "explain": "The browser requests only the modules it needs."}

::quiz {"q": "What does dependency pre-bundling do?", "options": ["Type-checks code", "Converts dependencies to ESM and merges many small files with esbuild", "Minifies your source", "Uploads to npm"], "answer": 1, "explain": "Fewer requests and CommonJS compatibility."}

::quiz {"q": "Why still bundle for production?", "options": ["Browsers can't run ESM", "Unbundled modules mean too many requests; bundling enables tree-shaking, splitting and minification", "Vite requires it", "To include TypeScript"], "answer": 1, "explain": "Optimised, cacheable output."}
