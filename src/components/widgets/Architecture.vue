<script setup>
// System architecture diagram for HLD case studies.
// nodes: [{ id, label, kind, col, row, desc }]  kind: client|cdn|lb|gateway|service|worker|cache|db|queue|storage|search|external|ml
// edges: [[fromId, toId, label, dashed?]]   flows: { "Read path": [[fromId, toId, "what happens"], ...], ... }
import { ref, computed, onUnmounted } from 'vue'
import { KIND_ICON } from './diagramIcons.js'
const p = defineProps({ title: String, nodes: Array, edges: { type: Array, default: () => [] }, flows: { type: Object, default: () => ({}) } })

const KIND = {
  client: ['Client', '#64748b'], cdn: ['CDN / edge', '#0ea5e9'], lb: ['Load balancer', '#6366f1'], gateway: ['API gateway', '#6366f1'],
  service: ['Service', '#8b5cf6'], worker: ['Worker', '#a855f7'], cache: ['Cache', '#f59e0b'], db: ['Database', '#10b981'],
  queue: ['Queue / stream', '#ec4899'], storage: ['Object storage', '#14b8a6'], search: ['Search index', '#06b6d4'],
  external: ['External', '#94a3b8'], ml: ['ML / model', '#d946ef'],
}
const CW = 200, RH = 128, BW = 176, BH = 70, PAD = 20
const cols = computed(() => Math.max(...p.nodes.map(n => n.col)) + 1)
const rows = computed(() => Math.max(...p.nodes.map(n => n.row)) + 1)
const W = computed(() => cols.value * CW + PAD * 2), H = computed(() => rows.value * RH + PAD)
const pos = computed(() => Object.fromEntries(p.nodes.map(n => [n.id, { x: PAD + n.col * CW + (CW - BW) / 2, y: PAD + n.row * RH, w: BW, h: BH }])))
const ctr = b => [b.x + b.w / 2, b.y + b.h / 2]
function seg(a, b) {
  const A = pos.value[a], B = pos.value[b]; if (!A || !B) return null
  const [ax, ay] = ctr(A), [bx, by] = ctr(B)
  const clip = (R, cx, cy, dx, dy) => { const s = Math.min(Math.abs(R.w / 2 / (dx || 1e-9)), Math.abs(R.h / 2 / (dy || 1e-9))); return [cx + dx * s, cy + dy * s] }
  const [x1, y1] = clip(A, ax, ay, bx - ax, by - ay), [x2, y2] = clip(B, bx, by, ax - bx, ay - by)
  return { x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 }
}
const sel = ref(null)
const selected = computed(() => p.nodes.find(n => n.id === sel.value))
const flowName = ref(Object.keys(p.flows)[0] || ''), step = ref(-1), playing = ref(false); let timer
const flow = computed(() => p.flows[flowName.value] || [])
const active = computed(() => step.value >= 0 ? flow.value[step.value] : null)
const stop = () => { clearInterval(timer); playing.value = false }
const play = () => { if (playing.value) return stop(); if (step.value >= flow.value.length - 1) step.value = -1; playing.value = true; sel.value = null
  step.value++; timer = setInterval(() => step.value >= flow.value.length - 1 ? stop() : step.value++, 2600) }
onUnmounted(stop)
const isHot = id => active.value && (active.value[0] === id || active.value[1] === id)
const usedKinds = computed(() => [...new Set(p.nodes.map(n => n.kind))])
const fillOf = n => isHot(n.id) || sel.value === n.id ? `color-mix(in srgb, ${KIND[n.kind]?.[1] || '#888'} 20%, var(--panel))` : 'var(--panel)'
const cyl = b => `M${b.x},${b.y + 9} L${b.x},${b.y + BH - 2} A${BW / 2},9 0 0 0 ${b.x + BW},${b.y + BH - 2} L${b.x + BW},${b.y + 9} A${BW / 2},9 0 0 0 ${b.x},${b.y + 9} Z`
const uid = Math.random().toString(36).slice(2)
</script>

<template>
  <div>
    <div class="w-title">{{ title || 'System architecture' }}</div>
    <div class="w-row" v-if="Object.keys(flows).length">
      <span class="meta">Flow:</span>
      <button v-for="f in Object.keys(flows)" :key="f" class="chip-btn" :class="{ on: flowName === f }" @click="stop(); flowName = f; step = -1">{{ f }}</button>
      <button class="btn small" @click="play">{{ playing ? 'Pause' : 'Play request' }}</button>
      <button class="btn ghost small" @click="stop(); step = Math.max(-1, step - 1)">Back</button>
      <button class="btn ghost small" @click="stop(); sel = null; step = Math.min(flow.length - 1, step + 1)">Step</button>
    </div>
    <div style="overflow-x:auto">
      <svg :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" style="display:block;margin:0 auto;max-width:none">
        <defs>
          <marker :id="'ah' + uid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)" /></marker>
          <marker :id="'ahh' + uid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)" /></marker>
          <filter :id="'ash' + uid" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity=".14" /></filter>
        </defs>
        <g v-for="(e, i) in edges" :key="'e' + i">
          <template v-if="seg(e[0], e[1])">
            <line v-bind="{ x1: seg(e[0], e[1]).x1, y1: seg(e[0], e[1]).y1, x2: seg(e[0], e[1]).x2, y2: seg(e[0], e[1]).y2 }" :class="['a-edge', { async: e[3] }]" stroke="var(--line-strong)" stroke-width="1.8" :marker-end="`url(#ah${uid})`" />
            <text v-if="e[2]" :x="seg(e[0], e[1]).mx" :y="seg(e[0], e[1]).my - 5" text-anchor="middle" font-size="13" fill="var(--muted)" style="paint-order:stroke;stroke:var(--panel);stroke-width:4px">{{ e[2] }}</text>
          </template>
        </g>
        <g v-if="active && seg(active[0], active[1])">
          <line v-bind="{ x1: seg(active[0], active[1]).x1, y1: seg(active[0], active[1]).y1, x2: seg(active[0], active[1]).x2, y2: seg(active[0], active[1]).y2 }" class="a-edge hot" stroke="var(--accent)" stroke-width="3.5" :marker-end="`url(#ahh${uid})`" />
          <circle r="6" fill="var(--accent)">
            <animateMotion :key="step" dur="1.2s" repeatCount="indefinite" :path="`M${seg(active[0], active[1]).x1},${seg(active[0], active[1]).y1} L${seg(active[0], active[1]).x2},${seg(active[0], active[1]).y2}`" />
          </circle>
        </g>
        <g v-for="n in nodes" :key="n.id" style="cursor:pointer" @click="stop(); step = -1; sel = n.id" :filter="`url(#ash${uid})`">
          <!-- database: cylinder -->
          <template v-if="n.kind === 'db'">
            <path :d="cyl(pos[n.id])" :fill="fillOf(n)" :stroke="KIND[n.kind][1]" :stroke-width="isHot(n.id) || sel === n.id ? 2.6 : 1.5" />
            <ellipse :cx="pos[n.id].x + BW / 2" :cy="pos[n.id].y + 9" :rx="BW / 2" ry="9" :fill="`color-mix(in srgb, ${KIND[n.kind][1]} 25%, var(--panel))`" :stroke="KIND[n.kind][1]" stroke-width="1.5" />
          </template>
          <!-- everything else: rounded card -->
          <rect v-else :x="pos[n.id].x" :y="pos[n.id].y" :width="BW" :height="BH" rx="13" :fill="fillOf(n)" :stroke="KIND[n.kind]?.[1] || 'var(--line)'" :stroke-width="isHot(n.id) || sel === n.id ? 2.6 : 1.4" />
          <!-- queue: stacked message bars on the right edge -->
          <g v-if="n.kind === 'queue'"><rect v-for="k in 3" :key="k" :x="pos[n.id].x + BW - 16" :y="pos[n.id].y + 16 + (k - 1) * 13" width="8" height="9" rx="2" :fill="KIND.queue[1]" :opacity="1 - (k - 1) * .25" /></g>
          <rect :x="pos[n.id].x + 10" :y="pos[n.id].y + (BH - 36) / 2 + (n.kind === 'db' ? 6 : 0)" width="36" height="36" rx="10" :fill="`color-mix(in srgb, ${KIND[n.kind]?.[1]} 18%, var(--panel))`" />
          <component :is="KIND_ICON[n.kind]" :x="pos[n.id].x + 18" :y="pos[n.id].y + (BH - 36) / 2 + 8 + (n.kind === 'db' ? 6 : 0)" :width="20" :height="20" :color="KIND[n.kind]?.[1]" :stroke-width="2.2" />
          <text :x="pos[n.id].x + 54" :y="pos[n.id].y + BH / 2 + (n.kind === 'db' ? 6 : 0) - 3" font-size="14.5" font-weight="700" fill="var(--text)">{{ n.label }}</text>
          <text :x="pos[n.id].x + 54" :y="pos[n.id].y + BH / 2 + (n.kind === 'db' ? 6 : 0) + 14" font-size="11.5" fill="var(--muted)">{{ KIND[n.kind]?.[0] }}</text>
        </g>
      </svg>
    </div>
    <div class="w-row" style="gap:12px">
      <span v-for="k in usedKinds" :key="k" class="meta" style="display:inline-flex;align-items:center;gap:5px"><i :style="{ width: '10px', height: '10px', borderRadius: '3px', background: KIND[k]?.[1], display: 'inline-block' }"></i>{{ KIND[k]?.[0] }}</span>
      <span class="meta">solid arrow: synchronous request · dashed: asynchronous</span>
    </div>
    <div class="w-out w-explain">
      <template v-if="active"><span class="step-count">{{ flowName }} · step {{ step + 1 }} of {{ flow.length }}</span><div style="margin-top:6px" v-html="active[2]"></div></template>
      <template v-else-if="selected"><b>{{ selected.label }}</b> <span class="meta">({{ KIND[selected.kind]?.[0] }})</span><div style="margin-top:6px" v-html="selected.desc"></div></template>
      <em v-else>Click any component to see its job, or press <b>Play request</b> to follow one request through the system.</em>
    </div>
  </div>
</template>
