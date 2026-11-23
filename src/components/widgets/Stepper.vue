<script setup>
// Illustrated step-through diagram. type: flow | layers | cycle | hub | tree
// nodes: [[label, detail, icon?], ...] — each node gets an icon (auto-picked from its label) and a color.
import { ref, computed, onUnmounted } from 'vue'
import { iconFor, PALETTE } from './diagramIcons.js'
const p = defineProps({ title: String, type: { type: String, default: 'flow' }, nodes: Array, cols: { type: Number, default: 3 } })
const cur = ref(-1); let timer = null; const playing = ref(false)
const W = 820
const nodes = computed(() => p.nodes.map(([t, d, ic], i) => ({ t, d, icon: iconFor(t + ' ' + (d || '').slice(0, 80), ic), color: PALETTE[i % PALETTE.length] })))
const L = computed(() => {
  const n = nodes.value.length
  if (p.type === 'layers') return { H: n * 74 + 12, pos: nodes.value.map((_, i) => ({ x: 40, y: 8 + i * 74, w: W - 80, h: 62 })), edges: [] }
  if (p.type === 'cycle') { const bw = 220, bh = 72, ry = n > 5 ? 175 : 145, H = 2 * ry + 120
    return { H, pos: nodes.value.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return { x: W / 2 + 290 * Math.cos(a) - bw / 2, y: H / 2 + ry * Math.sin(a) - bh / 2, w: bw, h: bh } }), edges: nodes.value.map((_, i) => [i, (i + 1) % n]) } }
  if (p.type === 'hub') { const k = n - 1, H = 430, pos = [{ x: W / 2 - 125, y: H / 2 - 42, w: 250, h: 84 }]
    for (let i = 0; i < k; i++) { const a = -Math.PI / 2 + (i + .5) * 2 * Math.PI / k; pos.push({ x: W / 2 + 300 * Math.cos(a) - 105, y: H / 2 + 158 * Math.sin(a) - 34, w: 210, h: 68 }) }
    return { H, pos, edges: pos.slice(1).map((_, i) => [0, i + 1]) } }
  if (p.type === 'tree') {
    const depth = Math.floor(Math.log2(n)) + 1, pos = nodes.value.map((_, i) => { const d = Math.floor(Math.log2(i + 1)), k = i + 1 - 2 ** d, slots = 2 ** d
      const w = Math.min(170, W / slots - 14); return { x: (k + .5) * W / slots - w / 2, y: 12 + d * 104, w, h: 64 } })
    return { H: depth * 104 + 6, pos, edges: nodes.value.slice(1).map((_, i) => [Math.floor(i / 2), i + 1]) } }
  const per = Math.min(n, p.cols), rows = Math.ceil(n / per), bw = Math.min(230, (W - 40) / per - 34), gx = (W - per * bw) / (per + 1)
  return { H: rows * 116 + 8, pos: nodes.value.map((_, i) => { const r = Math.floor(i / per); let c = i % per; if (r % 2) c = per - 1 - c; return { x: gx + c * (bw + gx), y: 14 + r * 116, w: bw, h: 74 } }), edges: nodes.value.slice(1).map((_, i) => [i, i + 1]) }
})
const ctr = b => [b.x + b.w / 2, b.y + b.h / 2]
const edge = (a, b) => { const A = L.value.pos[a], B = L.value.pos[b]; const [ax, ay] = ctr(A), [bx, by] = ctr(B)
  const clip = (R, cx, cy, dx, dy) => { const s = Math.min(Math.abs((R.w / 2 + 4) / (dx || 1e-9)), Math.abs((R.h / 2 + 4) / (dy || 1e-9))); return [cx + dx * s, cy + dy * s] }
  const [x1, y1] = clip(A, ax, ay, bx - ax, by - ay), [x2, y2] = clip(B, bx, by, ax - bx, ay - by); return { x1, y1, x2, y2 } }
const ICON = 40
const lines = (t, w) => { const max = Math.max(8, Math.floor((w - ICON - 26) / 8.2)), out = ['']; for (const word of t.split(' ')) { if ((out.at(-1) + ' ' + word).trim().length > max) out.push(word); else out[out.length - 1] = (out.at(-1) + ' ' + word).trim() } return out.slice(0, 3) }
const show = i => (cur.value = (i + nodes.value.length) % nodes.value.length)
const stop = () => { clearInterval(timer); playing.value = false }
const play = () => { if (playing.value) return stop(); playing.value = true; if (cur.value >= nodes.value.length - 1) cur.value = -1; show(cur.value + 1)
  timer = setInterval(() => cur.value >= nodes.value.length - 1 ? stop() : show(cur.value + 1), 2600) }
onUnmounted(stop)
const dim = i => cur.value >= 0 && i !== cur.value && !((p.type === 'flow' || p.type === 'cycle') && i < cur.value)
const uid = Math.random().toString(36).slice(2)
</script>

<template>
  <div>
    <div class="w-title">{{ title || 'Interactive diagram' }}</div>
    <svg :viewBox="`0 0 ${W} ${L.H}`" class="w-svg diagram-svg">
      <defs>
        <marker :id="'a' + uid" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)" /></marker>
        <marker :id="'ah' + uid" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)" /></marker>
        <filter :id="'sh' + uid" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity=".14" /></filter>
      </defs>
      <line v-for="[a, b] in L.edges" :key="a + '-' + b" v-bind="edge(a, b)" :class="['d-edge', { hot: b === cur }]"
        :stroke="b === cur ? 'var(--accent)' : 'var(--line-strong)'" stroke-width="2.2" :marker-end="type === 'tree' ? null : `url(#${b === cur ? 'ah' : 'a'}${uid})`" />
      <g v-for="(n, i) in nodes" :key="i" class="d-node" :style="{ opacity: dim(i) ? .42 : 1 }" @click="stop(); show(i)">
        <rect :x="L.pos[i].x" :y="L.pos[i].y" :width="L.pos[i].w" :height="L.pos[i].h" rx="14" :filter="`url(#sh${uid})`"
          :fill="i === cur ? `color-mix(in srgb, ${n.color} 16%, var(--panel))` : 'var(--panel)'" :stroke="i === cur ? n.color : 'var(--line)'" :stroke-width="i === cur ? 2.4 : 1.2" />
        <rect :x="L.pos[i].x + 12" :y="L.pos[i].y + (L.pos[i].h - ICON) / 2" :width="ICON" :height="ICON" rx="11" :fill="`color-mix(in srgb, ${n.color} 18%, var(--panel))`" />
        <component :is="n.icon" :x="L.pos[i].x + 21" :y="L.pos[i].y + (L.pos[i].h - ICON) / 2 + 9" :width="22" :height="22" :color="n.color" :stroke-width="2.2" />
        <text v-for="(ln, k) in lines(n.t, L.pos[i].w)" :key="k" :x="L.pos[i].x + ICON + 22" :y="ctr(L.pos[i])[1] + (k - (lines(n.t, L.pos[i].w).length - 1) / 2) * 17 + 5"
          font-size="14" font-weight="650" fill="var(--text)" style="pointer-events:none">{{ ln }}</text>
      </g>
    </svg>
    <div class="w-out w-explain"><template v-if="cur >= 0"><span class="step-count">Step {{ cur + 1 }} of {{ nodes.length }}</span><b>{{ nodes[cur].t }}</b><div style="margin-top:6px" v-html="nodes[cur].d"></div></template><em v-else>Press Play, or click any box, to start.</em></div>
    <div class="w-row" style="justify-content:center">
      <button class="btn ghost small" @click="stop(); show(cur - 1)">Back</button>
      <button class="btn small" @click="play">{{ playing ? 'Pause' : 'Play' }}</button>
      <button class="btn ghost small" @click="stop(); show(cur + 1)">Step</button>
    </div>
  </div>
</template>
