<script setup>
// Isometric, step-through illustrated scene (all SVG).
// Keyboard: ← / → step, Space play/pause, R replay.
//
// props:
//  title, sub                       header text
//  nodes:  [{ id, kind, label, x, y, color, size, count, icon, badge }]
//          kind: slab | blocks | phone | laptop | server | db | router | cube | cache | queue | user | cloud | cpu | doc | disk
//  links:  [[from, to, opts?]]     opts: { dashed, label, both }
//  metrics:[[key, label]]           top strip; values come from steps (carried forward)
//  legend: [[label, color]]
//  steps:  [{ short, title, tag, body (html), note: {kind, text}, changed: [..],
//             show: [ids] (inherited), set: { id: { x, y, count, label, badge, color, dim } } (merged),
//             hot: [[a,b]], flow: [[a, b, color, label?]], metrics: { key: [value, tone?] } }]
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { iconFor } from './diagramIcons.js'
const p = defineProps({ title: String, sub: String, nodes: Array, links: { type: Array, default: () => [] },
  steps: Array, metrics: { type: Array, default: () => [] }, legend: { type: Array, default: () => [] },
  lesson: Boolean, head: Object, nextLink: String, compact: Boolean, autoplay: Boolean })

const uid = 'sc' + Math.random().toString(36).slice(2, 8)
const cur = ref(0), playing = ref(false), root = ref(null), visible = ref(false)
let timer = null, io = null

const U = 34, C = 0.866, CP = 1.12, CW = 0.98
const iso = (x, y, z = 0) => [(x - y) * U * C, (x + y) * U * 0.5 - z * U]
const pts = a => a.map(q => iso(...q).map(v => v.toFixed(1)).join(',')).join(' ')
// Line-art colouring: every object is outlined in its hue (a CSS variable, so light/dark themes
// can tune it) and filled with a faint tint of that hue mixed into the canvas colour.
const HUE_NAMES = ['orange', 'blue', 'green', 'purple', 'red', 'teal', 'yellow', 'pink', 'ink']
const tint = (k, pc) => `color-mix(in srgb, var(--h-${k}) ${pc}%, var(--sc-bg))`
const hue = c => { const k = HUE_NAMES.includes(c) ? c : c === 'dark' ? 'ink' : 'blue'; return [tint(k, 7), tint(k, 15), tint(k, 24), `var(--h-${k})`] }
const HUES = { dark: hue('ink') }

// ----- state for the current step (inherited from earlier steps) -----
const stateAt = i => {
  const nodes = Object.fromEntries(p.nodes.map(n => [n.id, { ...n }]))
  let show = p.nodes.map(n => n.id), metrics = {}
  for (let k = 0; k <= i; k++) {
    const s = p.steps[k] || {}
    if (s.show) show = s.show
    for (const [id, o] of Object.entries(s.set || {})) if (nodes[id]) Object.assign(nodes[id], o)
    Object.assign(metrics, s.metrics || {})
  }
  return { nodes, show: new Set(show), metrics }
}
const st = computed(() => stateAt(cur.value))
const step = computed(() => p.steps[cur.value] || {})

// ----- geometry per node -----
const slabSize = n => n.kind === 'blocks' ? Math.max(2.2, Math.ceil(Math.sqrt(n.count || 1)) * 0.72 + 0.6) : (n.size || 2.6)
const box = (x, y, z, w, d, h) => ({
  top: pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]),
  left: pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]),
  right: pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]),
})
function shapes(n) {
  const s = slabSize(n), out = [], [t, l, r, ink] = hue(n.color), z0 = 0.35, cx = n.x + s / 2, cy = n.y + s / 2
  out.push({ ...box(n.x, n.y, 0, s, s, z0), cls: 'slab' })
  const add = (b, colors = [t, l, r, ink], extra = {}) => out.push({ ...b, fill: colors, ...extra })
  const k = n.kind
  let top = z0
  if (k === 'blocks') {
    const cnt = n.count || 0, per = Math.max(1, Math.ceil(Math.sqrt(cnt))), c = 0.56, g = 0.16
    const span = per * c + (per - 1) * g, ox = cx - span / 2, oy = cy - span / 2
    for (let i = 0; i < cnt; i++) { const a = Math.floor(i / per), b = i % per; add(box(ox + b * (c + g), oy + a * (c + g), z0, c, c, c)) }
    top = z0 + 0.6
  } else if (k === 'phone') { add(box(cx - .32, cy - .14, z0, .64, .28, 1.5)); out.push({ screen: pts([[cx - .24, cy + .15, z0 + .2], [cx + .24, cy + .15, z0 + .2], [cx + .24, cy + .15, z0 + 1.38], [cx - .24, cy + .15, z0 + 1.38]]) })
    for (const dz of [1.15, .95, .75]) out.push({ after: true, poly: pts([[cx - .17, cy + .15, z0 + dz], [cx + .12, cy + .15, z0 + dz]]), ink }); top = z0 + 1.5 }
  else if (k === 'laptop') { const D = (a, b) => out.push({ after: true, poly: pts([a, b]), ink })
    for (let i = 0; i < 3; i++) D([cx - .65, cy - .3 + i * .22, z0 + .1], [cx + .65, cy - .3 + i * .22, z0 + .1])
    out.push({ after: true, poly: pts([[cx - .6, cy - .49, z0 + .85], [cx + .2, cy - .49, z0 + .85]]), ink }, { after: true, poly: pts([[cx - .6, cy - .49, z0 + .65], [cx + .5, cy - .49, z0 + .65]]), ink }, { after: true, poly: pts([[cx - .6, cy - .49, z0 + .45], [cx + .35, cy - .49, z0 + .45]]), ink }); add(box(cx - .85, cy - .5, z0, 1.7, 1.15, .1)); add(box(cx - .85, cy - .58, z0 + .1, 1.7, .08, 1.05)); out.push({ screen: pts([[cx - .75, cy - .49, z0 + .2], [cx + .75, cy - .49, z0 + .2], [cx + .75, cy - .49, z0 + 1.05], [cx - .75, cy - .49, z0 + 1.05]]) }); top = z0 + 1.15 }
  else if (k === 'server') { add(box(cx - .6, cy - .6, z0, 1.2, 1.2, 1.9), [t, l, r, ink], { stripes: [cx, cy, z0], ink })
    for (const dz of [0.25, 0.7, 1.15]) { out.push({ led: iso(cx + .25, cy + .6, z0 + dz + .2), color: ink }); out.push({ poly: pts([[cx - .45, cy + .6, z0 + dz + .2], [cx + .05, cy + .6, z0 + dz + .2]]), ink }) }
    top = z0 + 1.9 }
  else if (k === 'router') { add(box(cx - .8, cy - .55, z0, 1.6, 1.1, .45))
    for (const ox of [-.5, .5]) { const [ax, ay] = iso(cx + ox, cy - .4, z0 + .45), [bx, by] = iso(cx + ox, cy - .4, z0 + 1.35); out.push({ line: [ax, ay, bx, by] }) }
    for (const ox of [-.5, -.2, .1, .4]) out.push({ led: iso(cx + ox, cy + .55, z0 + .22), color: ink })
    top = z0 + 1.2 }
  else if (k === 'db') { out.push({ cyl: [cx, cy, z0, .78, 1.4], fill: [t, l, r, ink] }); top = z0 + 1.4 }
  else if (k === 'queue') { const m = n.count || 4; for (let i = 0; i < m; i++) add(box(n.x + .35 + i * ((s - .7) / m), cy - .35, z0, (s - .7) / m - .1, .7, .7)); top = z0 + .7 }
  else if (k === 'doc') { add(box(cx - .55, cy - .7, z0, 1.1, 1.4, .12), hue('ink')); top = z0 + .12 }
  else if (k === 'disk') { out.push({ cyl: [cx, cy, z0, .8, .35], fill: [t, l, r, ink] }); top = z0 + .35 }
  else if (k === 'cpu') { add(box(cx - .75, cy - .75, z0, 1.5, 1.5, .25)); top = z0 + .25 }
  else if (k === 'user' || k === 'cloud') { top = z0 + 1.2 }
  else if (k === 'cells') { const v = n.values || []; out.length = 0
    v.forEach((val, i) => { const mk = (n.marks || {})[i], col = mk ? hue(mk) : [tint('ink', 3), tint('ink', 8), tint('ink', 14), 'var(--h-ink)'], h = n.heights ? 0.25 + (Number(val) || 0) * (n.hscale || 0.12) : 0.55
      const b = box(n.x + i * CP, n.y - i * CP, 0, CW, CW, h); out.push({ ...b, fill: col, cell: { i, val, h, marked: !!mk } }) })
    return { out, s: 0.72, cx: n.x + (v.length - 1) * CP / 2 + CW / 2, cy: n.y - (v.length - 1) * CP / 2 + CW / 2, top: 0.6, cells: true } }
  else if (k === 'node') { add(box(cx - .75, cy - .75, z0, 1.5, 1.5, .7)); top = z0 + .7 }
  else if (k !== 'slab') { const h = k === 'cache' ? 1 : 1.3; add(box(cx - .8, cy - .8, z0, 1.6, 1.6, h)); top = z0 + h }
  return { out: [...out.filter(o => !o.after), ...out.filter(o => o.after)], s, cx, cy, top }
}
const geo = computed(() => Object.fromEntries(Object.values(st.value.nodes).map(n => [n.id, shapes(n)])))
const order = computed(() => Object.values(st.value.nodes).sort((a, b) => (a.x + a.y) - (b.x + b.y)))
const anchor = id => { const g = geo.value[id]; return iso(g.cx, g.cy, Math.min(g.top, 1.1)) }
const iconAt = n => { const g = geo.value[n.id]; const [x, y] = iso(g.cx, g.cy, g.top); return { x, y, C: iconFor(n.label + ' ' + (n.kind || ''), n.icon) } }
const labelW = n => n.label.length * 9.4 + 24
const labelAt = n => { const g = geo.value[n.id]; const [x, y] = g.cells ? iso(g.cx + .36, g.cy + .36, 0) : iso(n.x + g.s, n.y + g.s, 0); return { x: x - labelW(n) / 2 + 6, y: y + 28 } }
const badgeAt = n => { const g = geo.value[n.id]; const [x, y] = iso(g.cx, g.cy, g.top + 0.9); const w = String(n.badge).length * 10.2 + 24; return { x: x - w / 2, y: y - 8, w } }
const cylinder = ([cx, cy, z, rr, h]) => { const [x, yb] = iso(cx, cy, z), [, yt] = iso(cx, cy, z + h), rx = rr * U * 1.22, ry = rx * 0.5
  return { x, yb, yt, rx, ry, body: `M${x - rx},${yt} L${x - rx},${yb} A${rx},${ry} 0 0 0 ${x + rx},${yb} L${x + rx},${yt} Z` } }
const stripesOf = ([cx, cy, z]) => [0.45, 0.9, 1.35].map(dz => pts([[cx + .6, cy - .5, z + dz], [cx + .6, cy + .5, z + dz]]))

// viewBox fits the current step's nodes, and glides smoothly between steps (a camera that zooms out as things grow)
const fit = S => { let a = [1e9, 1e9, -1e9, -1e9]
  for (const n of Object.values(S.nodes)) { if (!S.show.has(n.id)) continue; const sz = n.kind === 'cells' ? 1 : slabSize(n)
    if (n.kind === 'cells') { const L = (n.values || []).length; for (const q of [iso(n.x, n.y, 2.4), iso(n.x + L * CP, n.y - L * CP, 0), iso(n.x + L * CP, n.y - L * CP + 1, -1.2), iso(n.x, n.y + 1, 0)]) { a[0] = Math.min(a[0], q[0]); a[1] = Math.min(a[1], q[1]); a[2] = Math.max(a[2], q[0]); a[3] = Math.max(a[3], q[1]) } continue }
    const [fx, fy] = iso(n.x + sz, n.y + sz, 0), lw = n.label.length * 8.6 + 20
    for (const q of [iso(n.x, n.y, 2.4), iso(n.x + sz, n.y, 0), iso(n.x, n.y + sz, 0), [fx - lw / 2, fy + 36], [fx + lw / 2, fy + 36]]) { a[0] = Math.min(a[0], q[0]); a[1] = Math.min(a[1], q[1]); a[2] = Math.max(a[2], q[0]); a[3] = Math.max(a[3], q[1]) } }
  const w = a[2] - a[0] + 40, h = a[3] - a[1] + 50, W = Math.max(w, h * 1.5, 330), H = W / 1.5
  return [(a[0] + a[2]) / 2 - W / 2 + 20, (a[1] + a[3]) / 2 - H / 2 + 12, W, H] }
const target = computed(() => fit(st.value))
const vb = ref(target.value); let raf = 0
watch(target, t => { cancelAnimationFrame(raf)
  if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) { vb.value = t; return }
  const from = [...vb.value], t0 = performance.now()
  const tick = now => { const k = Math.min(1, (now - t0) / 550), e = 1 - (1 - k) ** 3; vb.value = from.map((v, i) => v + (t[i] - v) * e); if (k < 1) raf = requestAnimationFrame(tick) }
  raf = requestAnimationFrame(tick) })
const grid = computed(() => { const [x0, y0, w0, h0] = target.value, x = x0 - w0, y = y0 - h0, h = h0 * 3, out = [], step = U * C * 2
  for (let i = -80; i < 80; i++) { out.push(`M${x + i * step},${y} l${h / 0.577},${h}`); out.push(`M${x + i * step},${y} l${-h / 0.577},${h}`) } return out.join(' ') })

const linkPath = (a, b) => { const [x1, y1] = anchor(a), [x2, y2] = anchor(b), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, k = Math.min(40, L / 3)
  const ax = x1 + dx / L * k, ay = y1 + dy / L * k, bx = x2 - dx / L * k, by = y2 - dy / L * k, lift = Math.min(70, L * 0.22), cx = (ax + bx) / 2, cy = (ay + by) / 2 - lift
  return { d: `M${ax.toFixed(1)},${ay.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`, mx: cx, my: cy + lift / 2 } }
const links = computed(() => p.links.filter(([a, b]) => st.value.show.has(a) && st.value.show.has(b)).map(([a, b, o = {}]) => ({ a, b, o, ...linkPath(a, b),
  hot: (step.value.hot || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a)) })))
// a flow is [from, to, color, label] or [[id, id, id...], color, label] to travel hop by hop
const routePath = ids => { const P = ids.map(anchor); let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`
  for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], lift = Math.min(70, Math.hypot(bx - ax, by - ay) * 0.22); d += ` Q${((ax + bx) / 2).toFixed(1)},${((ay + by) / 2 - lift).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}` }
  const m = P[Math.floor((P.length - 1) / 2)], n = P[Math.floor((P.length - 1) / 2) + 1] || m; return { d, mx: (m[0] + n[0]) / 2, my: (m[1] + n[1]) / 2 - 24, hops: P.length - 1 } }
const flows = computed(() => (step.value.flow || []).map(f => Array.isArray(f[0]) ? { ids: f[0], color: f[1], label: f[2] } : { ids: [f[0], f[1]], color: f[2], label: f[3] })
  .filter(f => f.ids.every(id => st.value.show.has(id))).map((f, i) => ({ ...routePath(f.ids), color: f.color || '#f59e0b', label: f.label, i })))

// ----- navigation -----
const emit = defineEmits(['finished', 'deepdive'])
const seen = ref(0)
const go = i => { cur.value = Math.max(0, Math.min(p.steps.length - 1, i)); seen.value = Math.max(seen.value, cur.value); if (cur.value === p.steps.length - 1) emit('finished') }
const next = () => go(cur.value + 1), back = () => go(cur.value - 1)
const toggle = () => { playing.value = !playing.value }
watch(playing, v => { clearInterval(timer); if (v) timer = setInterval(() => { if (cur.value >= p.steps.length - 1) { if (p.autoplay) cur.value = 0; else playing.value = false } else next() }, p.autoplay ? 3600 : 6500) })
const onKey = e => {
  if (!visible.value || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return
  if (e.key === 'ArrowRight') { e.preventDefault(); next() } else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
  else if (e.key === ' ') { e.preventDefault(); toggle() } else if (e.key === 'r' || e.key === 'R') { cur.value = 0 }
}
onMounted(() => { if (p.autoplay) { playing.value = true }
  addEventListener('keydown', onKey); io = new IntersectionObserver(([en]) => { visible.value = en.intersectionRatio > 0.45 }, { threshold: [0, .45, 1] }); io.observe(root.value) })
onBeforeUnmount(() => { removeEventListener('keydown', onKey); io?.disconnect(); clearInterval(timer) })
const cellFont = v => { const n = String(v).length; return (n <= 3 ? 17 : n <= 5 ? 13.5 : n <= 7 ? 11 : n <= 10 ? 9 : 7.5) + 'px' }
const metricVal = k => st.value.metrics[k]
const noteLabel = { notice: 'Notice', key: 'Key idea', good: 'Good to know', warn: 'Watch out' }
</script>

<template>
  <div ref="root" class="scene" :class="{ focus: visible, lesson, compact }">
    <div class="sc-main">
      <div v-if="lesson && head" class="ls-head">
        <div class="ls-kicker"><span>{{ head.of > 1 ? `Interactive lesson ${head.n} of ${head.of}` : 'Interactive lesson' }}</span><i></i><span>{{ steps.length }} steps</span><template v-if="head.done"><i></i><span class="ls-ok">✓ Completed</span></template></div>
        <h2>{{ head.title }}</h2>
        <p v-if="sub" class="ls-sub">{{ sub }}</p>
      </div>
      <div class="sc-head">
        <div v-if="!lesson"><div class="sc-title">{{ title }}</div><div v-if="sub" class="sc-sub">{{ sub }}</div></div>
        <div v-else class="ls-progress"><div :style="{ width: (100 * (cur + 1) / steps.length) + '%' }"></div></div>
        <div class="sc-ctl">
          <button class="btn sm" title="Replay (R)" @click="cur = 0; playing = false">↺ Replay</button>
          <button class="btn sm" title="Play / pause (Space)" @click="toggle">{{ playing ? '❚❚ Pause' : '▶ Play' }}</button>
        </div>
      </div>
      <div v-if="metrics.length" class="sc-metrics">
        <div v-for="[k, lab] in metrics" :key="k" class="sc-metric" :class="metricVal(k)?.[1]">
          <span>{{ lab }}</span><b>{{ metricVal(k)?.[0] ?? '-' }}</b>
        </div>
      </div>
      <svg class="sc-svg" :viewBox="vb.map(v => v.toFixed(1)).join(' ')" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="title">
        <defs>
          <pattern :id="uid + 'h'" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#e86f4f" /><rect width="3" height="7" fill="#f6efe4" /></pattern>
          <linearGradient :id="uid + 'sheen'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55" /><stop offset=".6" stop-color="#fff" stop-opacity=".05" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient>
          <radialGradient :id="uid + 'floor'" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#1d2433" /><stop offset="1" stop-color="#0a0d14" /></radialGradient>
          <pattern :id="uid + 'dots'" width="22" height="13" patternUnits="userSpaceOnUse"><circle cx="11" cy="6.5" r="1.1" fill="#3a4560" /></pattern>
          <filter :id="uid + 'glow'" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter :id="uid + 'soft'" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" /></filter>
          <marker :id="uid + 'a'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="sc-arrow" /></marker>
        </defs>
        <rect :x="vb[0] - 400" :y="vb[1] - 400" :width="vb[2] + 800" :height="vb[3] + 800" class="sc-floor" /><path :d="grid" class="sc-grid" />
        <g v-for="l in links" :key="l.a + l.b" class="sc-link" :class="{ hot: l.hot, dashed: l.o.dashed }">
          <path :d="l.d" class="sc-glowline" /><path :d="l.d" :marker-end="`url(#${uid}a)`" :marker-start="l.o.both ? `url(#${uid}a)` : null" />
          <text v-if="l.o.label" :x="l.mx" :y="l.my - 8" class="sc-linklabel">{{ l.o.label }}</text>
        </g>
        <g v-for="n in order" :key="n.id" class="sc-node" :class="{ gone: !st.show.has(n.id), dim: n.dim, hi: (step.focus || []).includes(n.id) }">
          <ellipse v-if="(step.focus || []).includes(n.id)" class="sc-halo" :cx="iso(geo[n.id].cx, geo[n.id].cy, 0)[0]" :cy="iso(geo[n.id].cx, geo[n.id].cy, 0)[1]" :style="{ stroke: hue(n.color)[3] }" :rx="geo[n.id].s * U * 1.05" :ry="geo[n.id].s * U * 0.55" />
          <template v-for="(sh, i) in geo[n.id].out" :key="i">
            <template v-if="sh.top">
              <polygon :points="sh.left" :class="sh.cls ? 'slab-l' : 'obj'" :style="sh.fill ? { fill: sh.fill[1], stroke: sh.fill[3] } : null" />
              <polygon :points="sh.right" :class="sh.cls ? 'slab-r' : 'obj'" :style="sh.fill ? { fill: sh.fill[2], stroke: sh.fill[3] } : null" />
              <polygon :points="sh.top" :class="sh.cls ? 'slab-t' : 'obj'" :style="sh.fill ? { fill: sh.fill[0], stroke: sh.fill[3] } : null" />
              <text v-if="sh.cell" :x="iso(n.x + sh.cell.i * CP + CW / 2, n.y - sh.cell.i * CP + CW / 2, sh.cell.h)[0]" :y="iso(n.x + sh.cell.i * CP + CW / 2, n.y - sh.cell.i * CP + CW / 2, sh.cell.h)[1] + 5" class="sc-cellv" :class="{ m: sh.cell.marked }" :style="{ fontSize: cellFont(sh.cell.val) }">{{ sh.cell.val }}</text>
              <template v-if="sh.stripes"><polyline v-for="(s2, j) in stripesOf(sh.stripes)" :key="j" :points="s2" class="obj-line" :style="{ stroke: sh.ink }" /></template>
            </template>
            <polygon v-else-if="sh.screen" :points="sh.screen" class="sc-screen" />
            <polyline v-else-if="sh.poly" :points="sh.poly" class="obj-line thin" :style="{ stroke: sh.ink }" />
            <circle v-else-if="sh.led" :cx="sh.led[0]" :cy="sh.led[1]" r="2.6" :style="{ fill: sh.color }" />
            <line v-else-if="sh.line" :x1="sh.line[0]" :y1="sh.line[1]" :x2="sh.line[2]" :y2="sh.line[3]" class="sc-antenna" />
            <g v-else-if="sh.cyl">
              <path :d="cylinder(sh.cyl).body" :style="{ fill: sh.fill[1], stroke: sh.fill[3] }" class="obj" />
                            <ellipse :cx="cylinder(sh.cyl).x" :cy="cylinder(sh.cyl).yt" :rx="cylinder(sh.cyl).rx" :ry="cylinder(sh.cyl).ry" :style="{ fill: sh.fill[0], stroke: sh.fill[3] }" class="obj" />
              <path :d="`M${cylinder(sh.cyl).x - cylinder(sh.cyl).rx},${(cylinder(sh.cyl).yt + cylinder(sh.cyl).yb) / 2} A${cylinder(sh.cyl).rx},${cylinder(sh.cyl).ry} 0 0 0 ${cylinder(sh.cyl).x + cylinder(sh.cyl).rx},${(cylinder(sh.cyl).yt + cylinder(sh.cyl).yb) / 2}`" :style="{ stroke: sh.fill[3] }" class="obj-line" />
            </g>
          </template>
          <text v-if="n.kind === 'node' && n.label.length <= 5" :x="iconAt(n).x" :y="iconAt(n).y + 6" class="sc-nodev">{{ n.label }}</text>
          <g v-if="n.kind === 'user'" :transform="`translate(${iconAt(n).x},${iconAt(n).y + 18})`" class="sc-user"><circle cy="-30" r="9" /><path d="M-15 0 Q-15 -18 0 -18 Q15 -18 15 0 Z" /></g>
          <path v-else-if="n.kind === 'cloud'" :transform="`translate(${iconAt(n).x - 34},${iconAt(n).y - 4})`" class="sc-cloud" d="M14 30 Q0 30 2 18 Q4 8 16 10 Q20 -2 34 0 Q48 0 50 12 Q66 10 66 22 Q66 32 54 30 Z" />
          <foreignObject v-if="!['blocks','phone','laptop','user','cloud','slab','queue','disk','cells','node'].includes(n.kind)" :x="iconAt(n).x - 11" :y="iconAt(n).y - 11" width="22" height="22" class="sc-ic"><component :is="iconAt(n).C" :size="18" /></foreignObject>
        </g>
        <g v-for="n in order" :key="'l' + n.id" class="sc-node" :class="{ gone: !st.show.has(n.id), dim: n.dim }">
          <g v-if="n.kind !== 'node' || n.label.length > 5" class="sc-label"><rect :x="labelAt(n).x - 6" :y="labelAt(n).y - 18" :width="labelW(n)" height="27" rx="13.5" /><text :x="labelAt(n).x + 4" :y="labelAt(n).y">{{ n.label }}</text></g>
          <g v-for="(ix, nm) in (n.kind === 'cells' ? n.ptr || {} : {})" :key="nm" class="sc-ptr">
            <line :x1="iso(n.x + ix * CP + CW / 2, n.y - ix * CP + CW / 2, 0.7)[0]" :y1="iso(n.x + ix * CP + CW / 2, n.y - ix * CP + CW / 2, 0.7)[1] - 4" :x2="iso(n.x + ix * CP + CW / 2, n.y - ix * CP + CW / 2, 0.7)[0]" :y2="iso(n.x + ix * CP + CW / 2, n.y - ix * CP + CW / 2, 0.7)[1] - 34" />
            <text :x="iso(n.x + ix * CP + CW / 2, n.y - ix * CP + CW / 2, 0.7)[0]" :y="iso(n.x + ix * CP + CW / 2, n.y - ix * CP + CW / 2, 0.7)[1] - 40">{{ nm }}</text>
          </g>
          <g v-if="n.badge" class="sc-badge"><rect :x="badgeAt(n).x" :y="badgeAt(n).y - 19" :width="badgeAt(n).w" height="30" rx="6" /><text :x="badgeAt(n).x + 11" :y="badgeAt(n).y + 2">{{ n.badge }}</text></g>
        </g>
        <g v-for="f in flows" :key="cur + '-' + f.i" class="sc-packet">
          <circle r="8" :fill="f.color" class="sc-dotp"><animateMotion :path="f.d" :dur="(1.1 + f.hops * 0.7) + 's'" :begin="`${f.i * 0.45}s`" repeatCount="indefinite" /></circle>
          <text v-if="f.label" :x="f.mx + 8" :y="f.my + 16" class="sc-plabel" :fill="f.color">{{ f.label }}</text>
        </g>
      </svg>
      <div v-if="compact" class="sc-caption"><span>{{ cur + 1 }}/{{ steps.length }}</span>{{ step.title }}</div>
      <div v-if="legend.length && !compact" class="sc-legend"><span v-for="[lab, col] in legend" :key="lab"><i :style="{ background: col }" />{{ lab }}</span></div>
    </div>

    <aside class="sc-side">
      <div class="sc-stepno"><span>Step {{ cur + 1 }} of {{ steps.length }}</span><span v-if="step.tag" class="sc-tag">{{ step.tag }}</span></div>
      <div v-if="lesson && cur > 0" class="sc-prev"><span>So far</span>{{ steps[cur - 1].title }}</div>
      <h4>{{ step.title }}</h4>
      <div class="sc-body" v-html="step.body" />
      <div v-if="step.note" class="sc-note" :class="step.note.kind || 'notice'"><b>{{ noteLabel[step.note.kind || 'notice'] }}</b><span v-html="step.note.text" /></div>
      <div v-if="step.changed?.length" class="sc-changed"><h6>What changed</h6><div v-for="c in step.changed" :key="c">+ {{ c }}</div></div>
      <div class="sc-nav">
        <button class="btn" :disabled="cur === 0" @click="back">← Back</button>
        <router-link v-if="lesson && cur === steps.length - 1 && nextLink" :to="nextLink" class="btn primary">{{ head?.nextLabel || 'Next lesson' }} →</router-link>
        <button v-else class="btn primary" :disabled="cur === steps.length - 1" @click="next">{{ cur < steps.length - 1 ? 'Next: ' + (steps[cur + 1].short || steps[cur + 1].title) : 'Done' }} →</button>
      </div>
      <div class="sc-keys"><kbd>←</kbd><kbd>→</kbd> step · <kbd>Space</kbd> play · <kbd>R</kbd> replay</div>
      <div v-if="lesson" class="ls-learn">
        <h6>The whole flow</h6>
        <button v-for="(s, i) in steps" :key="i" :class="{ seen: i < cur, on: i === cur }" @click="go(i)"><i>{{ i < cur ? '✓' : i + 1 }}</i><span>{{ s.title }}</span></button>
      </div>
    </aside>

    <div class="sc-timeline">
      <button v-for="(s, i) in steps" :key="i" class="sc-dot" :class="{ on: i === cur, done: i < cur }" @click="go(i)">
        <span><i class="sc-n">{{ i + 1 }}</i></span><small>{{ s.short || s.title }}</small>
      </button>
    </div>
  </div>
</template>
