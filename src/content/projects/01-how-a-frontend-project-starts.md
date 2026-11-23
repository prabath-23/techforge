---
title: How a Frontend Project Starts: npm, package.json, node_modules, Lockfiles and Scripts
summary: What happens from "npm create vue@latest" to a running dev server: Node.js and package managers (npm, pnpm, yarn), every important field in package.json, semantic versioning and ranges, lockfiles and reproducible installs, how node_modules and module resolution work, dependencies vs devDependencies, npm scripts and npx, environment variables, and the project files you'll see (tsconfig, eslint, .env).
---

::widget Scene {"title": "From an empty folder to npm run dev", "sub": "scaffold → install → resolve → run", "nodes": [{"id": "cli", "kind": "laptop", "label": "npm create vue@latest", "x": 3.72, "y": 3.72}, {"id": "pkg", "kind": "doc", "label": "package.json", "x": 4.5, "y": -4.5, "color": "blue"}, {"id": "reg", "kind": "cloud", "label": "npm registry", "x": 6.83, "y": -11.17, "color": "orange"}, {"id": "lock", "kind": "doc", "label": "package-lock.json", "x": 11.94, "y": 2.94, "color": "purple"}, {"id": "nm", "kind": "disk", "label": "node_modules", "x": 12.72, "y": -5.28, "color": "teal"}, {"id": "dev", "kind": "server", "label": "Vite dev server :5173", "x": 17.22, "y": -9.78, "color": "green"}], "links": [["cli", "pkg"], ["pkg", "reg"], ["reg", "nm"], ["pkg", "lock"], ["lock", "nm"], ["nm", "dev"]], "metrics": [["cmd", "Command"], ["result", "Result"]], "steps": [{"short": "Create", "tag": "Scaffold", "title": "npm create vue@latest my-app runs a scaffolding package", "body": "<p>It asks questions (TypeScript? Router? Pinia? Vitest?) and writes a starter project: index.html, src/, vite.config.ts, package.json.</p>", "show": ["cli", "pkg"], "flow": [["cli", "pkg", "#3b82f6", "writes files"]], "metrics": {"cmd": ["npm create vue@latest"], "result": ["project files"]}}, {"short": "Pkg", "tag": "package.json", "title": "package.json declares the project", "body": "<p>name, scripts (dev, build, test), dependencies (vue, vue-router, pinia), devDependencies (vite, typescript, eslint), \"type\": \"module\".</p>", "focus": ["pkg"], "metrics": {"result": ["the project manifest"]}}, {"short": "Install", "tag": "Install", "title": "npm install resolves version ranges against the registry", "body": "<p>\"vue\": \"^3.5.0\" means any 3.x ≥ 3.5.0. The package manager picks exact versions for the whole dependency tree.</p>", "show": ["cli", "pkg", "reg"], "flow": [["pkg", "reg", "#f59e0b", "resolve ranges"]], "metrics": {"cmd": ["npm install"]}}, {"short": "Lock", "tag": "Lockfile", "title": "The exact versions are written to package-lock.json", "body": "<p>Commit it. Everyone (and CI) installs the same tree. In CI use npm ci, which installs exactly the lockfile and fails if it's out of sync.</p>", "show": ["cli", "pkg", "reg", "lock"], "flow": [["pkg", "lock", "#a855f7", "exact tree"]], "metrics": {"result": ["reproducible installs", "good"]}}, {"short": "NM", "tag": "node_modules", "title": "Packages are downloaded into node_modules (cached globally)", "body": "<p>Hundreds of packages, mostly transitive dependencies. pnpm stores each version once on disk and links it.</p>", "show": ["cli", "pkg", "reg", "lock", "nm"], "flow": [["reg", "nm", "#14b8a6", "tarballs"], ["lock", "nm", "#14b8a6", ""]]}, {"short": "Resolve", "tag": "Resolution", "title": "import { ref } from \"vue\" → node_modules/vue/package.json → \"exports\"", "body": "<p>Bare imports are looked up in node_modules, walking up parent folders; the package's exports map picks the right file for ESM, CJS, browser or types.</p>"}, {"short": "Run", "tag": "Scripts", "title": "npm run dev runs the \"dev\" script: vite", "body": "<p>Binaries from node_modules/.bin are on PATH for scripts. The dev server starts in milliseconds.</p>", "show": ["cli", "pkg", "reg", "lock", "nm", "dev"], "flow": [["nm", "dev", "#22c55e", "vite"]], "metrics": {"cmd": ["npm run dev"], "result": ["http://localhost:5173", "good"]}}, {"short": "Env", "tag": "Env", "title": "Configuration via .env files: VITE_API_URL=…", "body": "<p>Only VITE_-prefixed variables reach browser code, and everything in the bundle is public. Never put secrets in frontend env vars.</p>", "note": {"kind": "key", "text": "package.json declares, the lockfile pins, node_modules holds, scripts run. Commit the lockfile, use npm ci in CI, and treat all frontend env vars as public."}}]}

## The first command of every project

Every modern frontend, Vue, React, Svelte, Angular, starts the same way: a `package.json`, a package manager, a `node_modules` folder and a dev server. If you've only ever cloned an existing repo and run `npm install`, this chapter explains what actually happens, and what all those files are for.

## Node.js and package managers

**Node.js** runs JavaScript outside the browser; frontend tooling (Vite, TypeScript, ESLint, test runners) runs on it. Use a version manager (nvm, fnm, Volta) and pin the version per project (`.nvmrc` or `"engines"` in package.json).

Package managers install dependencies from the **npm registry**:

- **npm** ships with Node.
- **pnpm** content-addressed store, strict `node_modules`, fast and disk-efficient; great for monorepos.
- **yarn** classic and Berry (Plug'n'Play) variants.
- **bun** runtime + package manager.

Pick one per repo; its lockfile tells others which.

## package.json, field by field

```json
{
  "name": "orders-web",
  "version": "1.4.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint ."
  },
  "dependencies": { "vue": "^3.5.13", "vue-router": "^4.5.0", "pinia": "^3.0.1" },
  "devDependencies": { "vite": "^6.0.0", "@vitejs/plugin-vue": "^5.2.0", "typescript": "~5.7.2", "vitest": "^3.0.0" },
  "engines": { "node": ">=20" }
}
```

- `private: true` prevents accidental publishing.
- `type: "module"` → `.js` files are ES modules.
- **dependencies** needed at runtime (bundled into the app); **devDependencies** build and test tools. (For a bundled frontend the distinction mainly documents intent; for libraries and Node servers it controls what gets installed in production.)
- `peerDependencies`, for libraries: "I need Vue, but use the app's copy".
- Libraries also define `main`/`module`/`exports`/`types` to tell tools which file to load.

## Semantic versioning and ranges

`MAJOR.MINOR.PATCH`: breaking changes bump major, new features minor, fixes patch.

| Range | Allows |
|---|---|
| `^3.5.1` | ≥ 3.5.1 and < 4.0.0 (default) |
| `~3.5.1` | ≥ 3.5.1 and < 3.6.0 |
| `3.5.1` | exactly 3.5.1 |
| `*` / `latest` | anything (avoid) |

For 0.x versions, `^0.4.2` only allows < 0.5.0, minor bumps may break.

## Lockfiles

Ranges mean two installs on different days could get different versions. The **lockfile** (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) records the exact version and integrity hash of every package in the tree.

- **Commit it.**
- **CI uses `npm ci`** (or `pnpm install --frozen-lockfile`): installs exactly what's locked, fails if package.json and lockfile disagree.
- Update deliberately (`npm update`, Renovate/Dependabot PRs) and review the diff.
- Lockfiles + integrity hashes are also a supply-chain defence (Security chapter 7).

## node_modules and module resolution

`import x from 'lodash-es'` is a **bare specifier**. Node and bundlers look in `./node_modules/lodash-es`, then the parent folder's `node_modules`, and so on up. Inside the package, `package.json`'s `"exports"` map chooses the file for the current environment (import vs require, browser vs node, development vs production) and hides private files.

npm flattens (hoists) dependencies, so code can accidentally import packages it never declared ("phantom dependencies"); pnpm's stricter layout prevents that.

## Scripts and npx

- `npm run <name>` runs a script with `node_modules/.bin` on the PATH, that's why `"dev": "vite"` works without a global install.
- `pre`/`post` hooks (`prebuild`) run automatically.
- `npx <tool>` runs a package's binary without adding it permanently (`npx eslint --init`).

## The files in a typical Vue + Vite project

| File | Purpose |
|---|---|
| `index.html` | the entry page; loads `/src/main.ts` as a module |
| `src/main.ts` | creates the app: `createApp(App).use(router).use(pinia).mount('#app')` |
| `vite.config.ts` | plugins (Vue), aliases (`@` → `src`), dev-server proxy, build options |
| `tsconfig.json` | TypeScript settings and path aliases |
| `eslint.config.js`, `.prettierrc` | linting and formatting |
| `.env`, `.env.production` | environment-specific variables (`VITE_` prefix exposed to code) |
| `public/` | files copied as-is (favicon, robots.txt) |
| `.gitignore` | ignores `node_modules`, `dist`, `.env.local` |

## Environment variables

`import.meta.env.VITE_API_URL` is replaced at **build time**. Everything in a frontend bundle can be read by anyone, keep secrets on the server. For one build deployed to several environments, load runtime config from a `/config.json` served by the environment instead.

> [!RECAP]
> - Node runs the tools; a package manager installs dependencies from the registry.
> - package.json: scripts, dependencies vs devDependencies, `type`, `engines`.
> - Semver ranges (`^`, `~`); the **lockfile** pins exact versions, commit it, use `npm ci` in CI.
> - Bare imports resolve through `node_modules` and each package's `exports`.
> - `npm run` puts `node_modules/.bin` on PATH; `npx` runs tools ad hoc.
> - Frontend env vars are build-time and public.

> [!INTERVIEW] "What's the difference between dependencies and devDependencies?", "What does ^ mean in a version?", "Why commit the lockfile?", "npm install vs npm ci?", "Can I put an API secret in a VITE_ variable?"

::quiz {"q": "What does \"^3.5.1\" allow?", "options": ["Exactly 3.5.1", "Any version ≥ 3.5.1 and < 4.0.0", "Any 3.5.x only", "Any version"], "answer": 1, "explain": "Caret allows minor and patch updates."}

::quiz {"q": "Why use npm ci in CI?", "options": ["It is faster to type", "It installs exactly the lockfile's versions and fails if package.json and the lockfile disagree", "It skips devDependencies", "It updates packages"], "answer": 1, "explain": "Reproducible builds."}

::quiz {"q": "Is VITE_STRIPE_SECRET in a .env file safe?", "options": ["Yes, .env is private", "No, VITE_ variables are embedded in the public JavaScript bundle", "Only in production", "Only with HTTPS"], "answer": 1, "explain": "Secrets belong on the server."}
