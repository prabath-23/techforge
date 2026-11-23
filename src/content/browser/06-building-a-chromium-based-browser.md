---
title: Building and Shipping a Chromium-Based Browser
summary: What it takes to ship your own browser on Chromium: checking out and building with depot_tools, GN and Ninja, structuring patches to survive upstream changes, the four-week release cadence and rebasing, branding and features behind flags, signing and installers, auto-updates, crash reporting with Crashpad, telemetry and field trials, and security patch response.
---

::widget Scene {"title": "Rebasing a fork onto a new Chromium milestone", "sub": "from upstream branch cut to a signed release on users' machines", "nodes": [{"id": "up", "kind": "cloud", "label": "Upstream Chromium (M+1)", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "fork", "kind": "cube", "label": "Your fork: ~400 patches", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "ci", "kind": "cpu", "label": "Build farm (GN + Ninja)", "x": 12.72, "y": -5.28, "color": "orange"}, {"id": "test", "kind": "cube", "label": "Tests + canary channel", "x": 13.5, "y": -13.5, "color": "teal"}, {"id": "sign", "kind": "doc", "label": "Signed installers", "x": 20.94, "y": -6.06, "color": "green"}, {"id": "upd", "kind": "router", "label": "Update server", "x": 21.72, "y": -14.28, "color": "pink"}], "links": [["up", "fork"], ["fork", "ci"], ["ci", "test"], ["ci", "sign"], ["sign", "upd"], ["test", "upd", {"dashed": true}]], "metrics": [["stage", "Stage"], ["days", "Days since upstream release"], ["risk", "Risk"]], "steps": [{"short": "Cadence", "tag": "Cadence", "title": "Chromium ships a new milestone every 4 weeks", "body": "<p>Plus weekly security fixes. Each milestone changes thousands of files.</p>", "show": ["up"], "metrics": {"stage": ["upstream"], "days": ["0"], "risk": ["-"]}}, {"short": "Patches", "tag": "Fork", "title": "Your fork carries patches: branding, features, policies, removed services", "body": "<p>Keep them small and isolated: new files under your own directory, minimal hooks into upstream files, features behind build flags or base::Feature.</p>", "show": ["up", "fork"], "metrics": {"stage": ["fork"], "risk": ["patch count = rebase cost"]}}, {"short": "Rebase", "tag": "Rebase", "title": "Rebase onto the new milestone branch", "body": "<p>Most patches apply; some conflict where upstream refactored. Fix them, ideally upstreaming generic changes so the patch disappears.</p>", "flow": [["up", "fork", "#3b82f6", "M+1 branch"]], "set": {"fork": {"badge": "37 conflicts"}}, "metrics": {"stage": ["rebase"], "days": ["~3"]}}, {"short": "Build", "tag": "Build", "title": "Build with GN (configure) + Ninja (compile)", "body": "<p>gn gen out/Release with args (is_official_build, branding, proprietary codecs); tens of thousands of compile steps, distributed builds and caching (Reclient/RBE, ccache) are essential.</p>", "show": ["up", "fork", "ci"], "flow": [["fork", "ci", "#f59e0b", "gn gen + ninja"]], "metrics": {"stage": ["build"]}}, {"short": "Test", "tag": "Test", "title": "Run unit, browser and web-platform tests, then a canary channel", "body": "<p>Canary → dev → beta → stable, with crash rates and key metrics compared at each step.</p>", "show": ["up", "fork", "ci", "test"], "flow": [["ci", "test", "#14b8a6", "tests"]], "set": {"fork": {"badge": null}}, "metrics": {"stage": ["test + canary"], "days": ["~10"]}}, {"short": "Sign", "tag": "Sign", "title": "Sign binaries and installers", "body": "<p>Authenticode on Windows, Apple notarisation on macOS, package signing on Linux. Unsigned browsers are blocked or scary.</p>", "show": ["up", "fork", "ci", "test", "sign"], "flow": [["ci", "sign", "#22c55e", "release build"]], "metrics": {"stage": ["sign"]}}, {"short": "Ship", "tag": "Update", "title": "Roll out through the updater in stages: 1% → 10% → 100%", "body": "<p>Watch crash rates (Crashpad dumps symbolised on your server) and halt if they spike.</p>", "show": ["up", "fork", "ci", "test", "sign", "upd"], "flow": [["sign", "upd", "#ec4899", "staged rollout"]], "metrics": {"stage": ["rollout"], "days": ["~14"]}}, {"short": "Security", "tag": "Security", "title": "Upstream fixes an exploited V8 bug mid-cycle", "body": "<p>Cherry-pick the fix, rebuild, ship within days. Every day behind is a public, exploitable vulnerability for your users.</p>", "set": {"upd": {"badge": "emergency update"}}, "metrics": {"risk": ["n-day exposure", "bad"]}}, {"short": "Goal", "tag": "Goal", "title": "Stay within days of upstream stable", "body": "<p>Fewer patches, upstream what you can, automate rebases and tests.</p>", "note": {"kind": "key", "text": "Small isolated patches → fast rebases every 4 weeks → reproducible GN/Ninja builds → staged channels → signed, auto-updated releases → emergency security cherry-picks."}}]}

## Forking is easy; staying current is the job

> [!STORY] Many companies build browsers on Chromium, Microsoft Edge, Brave, Opera, Vivaldi, Samsung Internet, and a wave of enterprise browsers. Starting a fork takes an afternoon. The real engineering is keeping hundreds of custom changes working while upstream ships a new major version every four weeks and security fixes every week. Teams that let the fork drift end up shipping browsers with publicly known, actively exploited vulnerabilities.

## Getting and building Chromium

- **depot_tools** provides `gclient`, `gn`, `autoninja` and friends. `fetch chromium` checks out the source (tens of GB) and its dependencies listed in `DEPS`.
- **GN** generates build files from `BUILD.gn` declarations; build arguments go in `args.gn`: `is_official_build=true`, `is_debug=false`, `symbol_level`, branding, `proprietary_codecs`, `ffmpeg_branding`, and your own flags.
- **Ninja** runs the build. A full build is tens of thousands of compile actions; use **remote execution** (Reclient/RBE or similar) and caching, or builds take hours.
- Targets: `chrome` (the browser), `unit_tests`, `browser_tests`, `content_shell`, installers (`mini_installer` on Windows).

## Structuring your changes

Chromium is designed to be embedded and customised:

- **Content API** the layer between the browser shell and Blink. Products like Electron and CEF build on `content/`; full browsers build on `chrome/`.
- **Features and flags** `base::Feature` toggles, Finch/field-trial configs, and build flags let you ship code dark and enable it gradually.
- **Branding** product name, icons, strings (GRD/GRDP resource files), update URLs, crash server, privacy-policy URLs.
- **Policies** enterprise policies are declared in YAML definitions and generate ADMX/JSON/plist templates (chapter 7).

### Patch hygiene

1. Put new code in **your own directories**; keep hooks into upstream files tiny.
2. One concern per patch, with a clear description and owner.
3. **Upstream** generally useful fixes, so the patch disappears from your queue.
4. Track patch count and conflict rate per rebase as health metrics.

## The release train

Chromium releases a new **milestone every four weeks**: branch point, then beta, then stable, with weekly stable security updates in between. Forks typically:

1. Rebase onto the new milestone branch early (often during beta).
2. Fix conflicts, rebuild, run tests.
3. Release through their own channels (canary/dev/beta/stable), comparing crash rates and key metrics.
4. **Cherry-pick security fixes** from upstream stable as they land and ship them fast, especially for bugs "exploited in the wild".

## Shipping

- **Signing** Windows Authenticode, macOS code signing + notarisation, Linux package signatures.
- **Installers** per-user and system-level installs, MSI for enterprises, PKG on macOS, DEB/RPM repositories.
- **Auto-update** an Omaha-protocol updater (Google's open-source updater or your own server) checks periodically, downloads **differential updates** and applies them on relaunch. **Component updater** ships data (CRLSets, Safe Browsing lists, Widevine) independently.
- **Staged rollouts** with the ability to halt.

## Knowing what happens in the field

- **Crashpad** writes minidumps; upload them to your crash server, symbolise with your build's symbols, cluster by signature, and track crash-free sessions per version.
- **Telemetry (UMA/UKM-style metrics)** with clear privacy disclosures and enterprise controls to disable it.
- **Field trials** enable features for a percentage of users and compare metrics.

> [!RECAP]
> - depot_tools + **GN** + **Ninja**; remote builds are essential at Chromium's scale.
> - Build on `chrome/` or `content/`; isolate patches, use features/flags, brand via resources.
> - Rebase every **4-week milestone**; cherry-pick security fixes within days.
> - Sign, ship via an updater with staged rollouts and component updates.
> - Crashpad + telemetry + field trials to see real-world quality.

> [!INTERVIEW] For browser teams: "How do you manage a large patch set on Chromium?", "How do you handle an upstream zero-day fix?", "How would you roll out a risky feature?", "How do you debug a crash that only happens on 0.1% of machines?"

::quiz {"q": "Why must a Chromium fork rebase and ship security fixes quickly?", "options": ["To get new emojis", "Upstream fixes reveal vulnerabilities that attackers can exploit in browsers that haven't updated", "Chromium requires it legally", "Builds expire"], "answer": 1, "explain": "Delays expose users to n-day exploits."}

::quiz {"q": "What does GN do in Chromium's build?", "options": ["Compiles C++ directly", "Generates Ninja build files from BUILD.gn and args", "Signs binaries", "Uploads crashes"], "answer": 1, "explain": "Ninja then executes the build."}

::quiz {"q": "Which practice reduces rebase pain most?", "options": ["Editing many upstream files directly", "Keeping patches small, isolated in your own directories, and upstreaming general fixes", "Rebasing once a year", "Disabling tests"], "answer": 1, "explain": "Fewer touched lines → fewer conflicts."}
