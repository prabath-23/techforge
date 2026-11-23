---
title: Browser Extensions: Manifest V3, Content Scripts, Permissions and Security
summary: How Chromium extensions are built and isolated: the manifest, service-worker background scripts, content scripts in isolated worlds, messaging between parts, permissions and host access, declarativeNetRequest vs webRequest under Manifest V3, extension security risks, and how enterprises allow, block and force-install extensions.
---

::widget Scene {"title": "An extension that highlights prices on shopping pages", "sub": "manifest → content script → messaging → service worker → storage", "nodes": [{"id": "man", "kind": "doc", "label": "manifest.json (MV3)", "x": 3.72, "y": 3.72}, {"id": "cs", "kind": "cube", "label": "Content script (isolated world)", "x": 5.0, "y": -5.0, "color": "blue"}, {"id": "page", "kind": "laptop", "label": "Web page DOM", "x": 10.0, "y": -10.0}, {"id": "sw", "kind": "cpu", "label": "Background service worker", "x": 12.44, "y": 2.44, "color": "purple"}, {"id": "st", "kind": "disk", "label": "chrome.storage", "x": 17.44, "y": -2.56, "color": "green"}, {"id": "dnr", "kind": "cube", "label": "declarativeNetRequest rules", "x": 9.92, "y": 9.92, "color": "orange"}], "links": [["man", "cs"], ["man", "sw"], ["cs", "page"], ["cs", "sw", {"both": true}], ["sw", "st"], ["man", "dnr", {"dashed": true}]], "metrics": [["part", "Part"], ["can", "Can access"]], "steps": [{"short": "Manifest", "tag": "Manifest", "title": "manifest.json declares everything up front", "body": "<p>Name, version, manifest_version 3, permissions, host_permissions, content_scripts, background service worker. Chrome shows the user what the extension can access.</p>", "show": ["man"], "metrics": {"part": ["manifest"], "can": ["declares access"]}}, {"short": "CS", "tag": "Content script", "title": "A content script is injected into matching pages", "body": "<p>It can read and change the page's DOM…</p>", "show": ["man", "cs", "page"], "flow": [["cs", "page", "#3b82f6", "highlight prices"]], "metrics": {"part": ["content script"], "can": ["page DOM"]}}, {"short": "Isolated", "tag": "Isolated world", "title": "…but runs in an isolated world", "body": "<p>Separate JavaScript globals from the page: the page can't see or tamper with the script's variables, and vice versa. They share only the DOM.</p>", "set": {"cs": {"badge": "own JS globals"}}}, {"short": "Msg", "tag": "Messaging", "title": "The content script sends a message to the service worker", "body": "<p>chrome.runtime.sendMessage, content scripts have limited APIs, so privileged work happens in the background.</p>", "show": ["man", "cs", "page", "sw"], "flow": [["cs", "sw", "#a855f7", "{prices: [...]}"]], "metrics": {"part": ["messaging"]}}, {"short": "SW", "tag": "Service worker", "title": "The background service worker handles events, then may be shut down", "body": "<p>MV3 replaced always-on background pages. Keep no state in globals, store it.</p>", "show": ["man", "cs", "page", "sw", "st"], "flow": [["sw", "st", "#22c55e", "save history"]], "metrics": {"part": ["service worker"], "can": ["extension APIs"]}}, {"short": "DNR", "tag": "Network rules", "title": "Blocking or modifying requests uses declarativeNetRequest", "body": "<p>The extension gives rules; the browser applies them, the extension never sees request contents. Safer and faster than MV2's blocking webRequest.</p>", "show": ["man", "cs", "page", "sw", "st", "dnr"], "metrics": {"part": ["DNR rules"], "can": ["rules only, no request data"]}}, {"short": "Risk", "tag": "Risk", "title": "Danger: \"Read and change all your data on all websites\"", "body": "<p>A compromised or sold extension with broad host access can steal sessions and data. Request narrow hosts or activeTab instead.</p>", "set": {"cs": {"badge": "<all_urls> = risky"}}}, {"short": "Ent", "tag": "Enterprise", "title": "Enterprises control extensions by policy", "body": "<p>ExtensionInstallBlocklist \"*\" plus an allowlist, ExtensionInstallForcelist for required tools, and ExtensionSettings to limit permissions and runtime host access.</p>", "note": {"kind": "key", "text": "Manifest declares access; content scripts touch pages in isolated worlds; the service worker does privileged work; DNR applies network rules without exposing data."}}]}

## The extension that was sold

> [!STORY] A popular productivity extension with two million users is quietly sold to a new owner. A week later an update adds code that injects affiliate links and uploads browsing data. Because users had granted it access to "all websites" years earlier, the update needs no new permission prompt. Extensions are powerful code running inside the browser, understanding their architecture explains both their usefulness and their risk.

## Anatomy of an extension

An extension is a package (a `.crx` file, signed) with a **manifest** and some HTML, JavaScript and assets.

```json
{
  "manifest_version": 3,
  "name": "Price Highlighter",
  "version": "1.2.0",
  "permissions": ["storage"],
  "host_permissions": ["https://*.shop.example/*"],
  "background": { "service_worker": "sw.js" },
  "content_scripts": [{ "matches": ["https://*.shop.example/*"], "js": ["content.js"] }],
  "action": { "default_popup": "popup.html" }
}
```

### The parts

- **Background service worker** event-driven (installed, messages, alarms, tab events). Under **Manifest V3** it can be stopped when idle, so state belongs in `chrome.storage`, not globals.
- **Content scripts** injected into matching pages. They can read and modify the DOM, but run in an **isolated world**: their JavaScript variables are separate from the page's, so the page can't tamper with them (and they don't see the page's JS variables).
- **UI pages** popup, options page, side panel.
- **Messaging** `chrome.runtime.sendMessage` / ports between content scripts, the service worker and UI.

Extension pages and workers run in their own sandboxed renderer processes, with origin `chrome-extension://<id>`.

## Permissions

- **API permissions** (`storage`, `tabs`, `downloads`, `cookies`, `scripting`).
- **Host permissions** which sites the extension can read and change. `<all_urls>` triggers the scary "read and change all your data" warning.
- **`activeTab`** temporary access to the current tab only when the user clicks the extension. The least-privilege choice for many tools.
- **Optional permissions** requested at runtime when needed.
- Users can restrict host access to "on click" or specific sites.

## Manifest V3 and network control

MV2's blocking `webRequest` let extensions inspect and modify every request in JavaScript, powerful, slow, and a privacy risk. MV3 replaces it for most extensions with **`declarativeNetRequest` (DNR)**: the extension supplies rules (block, redirect, modify headers), and the browser applies them without exposing request details. Rule-count limits apply; enterprise-installed extensions keep more capabilities in some cases.

## Security risks and defences

- **Over-broad permissions** turn any compromise into total compromise.
- **Ownership changes and supply-chain attacks** (compromised developer accounts).
- **Malicious updates** extensions auto-update silently.
- **Content-script injection bugs** inserting page data as HTML (XSS in the extension's context).
- Defences: Web Store review, CSP for extension pages (no remote code in MV3), minimal permissions, and, in enterprises, **allowlisting**.

## Enterprise extension management

Administrators use policies (see chapter 7):

- `ExtensionInstallBlocklist: ["*"]` + `ExtensionInstallAllowlist`, only approved extensions.
- `ExtensionInstallForcelist`, silently install required extensions (password manager, DLP agent, SSO helper).
- `ExtensionSettings`, per-extension rules: blocked permissions, `runtime_blocked_hosts` (e.g. never on the banking portal), minimum versions, install sources.
- Reports of installed extensions and their permissions across the fleet.

> [!RECAP]
> - MV3 extension = manifest + service worker + content scripts + UI, talking via messages.
> - Content scripts share the DOM but not JavaScript with the page (**isolated worlds**).
> - Ask for the narrowest host access; prefer `activeTab` and optional permissions.
> - **declarativeNetRequest** replaces blocking webRequest for most network control.
> - Enterprises allowlist, force-install and restrict extensions by policy.

> [!INTERVIEW] "What's the difference between a content script and the background script?", "What changed in Manifest V3 and why?", "How would you build an ad blocker in MV3?", "What security risks do extensions pose and how do enterprises manage them?"

::quiz {"q": "Can a web page read variables defined by an extension's content script?", "options": ["Yes, they share globals", "No, content scripts run in an isolated world; only the DOM is shared", "Only in incognito", "Only with CORS"], "answer": 1, "explain": "Isolated worlds separate JavaScript contexts."}

::quiz {"q": "How does an MV3 ad blocker block requests?", "options": ["Blocking webRequest listeners", "declarativeNetRequest rules applied by the browser", "Modifying the network service", "A proxy server"], "answer": 1, "explain": "The browser applies the rules without exposing request data."}

::quiz {"q": "How can an enterprise allow only approved extensions?", "options": ["Ask users nicely", "Blocklist \"*\" and allowlist specific extension IDs by policy", "Disable the Web Store DNS", "Use incognito"], "answer": 1, "explain": "ExtensionInstallBlocklist + ExtensionInstallAllowlist."}
