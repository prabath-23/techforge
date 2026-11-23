<script setup>
// UML class diagram for LLD case studies.
// classes: [{ name, stereo?: 'interface'|'abstract'|'enum', fields: [], methods: [], col, row, desc }]
// relations: [[from, to, type, label?]]  type: inherits | implements | composition | aggregation | uses | association
import { ref, computed } from 'vue'
const p = defineProps({ title: String, classes: Array, relations: { type: Array, default: () => [] } })
const GAP_Y = 56, LINE = 19, HEAD = 40, PAD = 18
const BW = computed(() => Math.max(220, ...p.classes.flatMap(c => [...(c.fields || []), ...(c.methods || []), c.name]).map(t => t.length * 7.6 + 24)))
const CW = computed(() => BW.value + 34)
const heightOf = c => HEAD + Math.max(1, (c.fields || []).length) * LINE + 10 + Math.max(1, (c.methods || []).length) * LINE + 10
const rowHeights = computed(() => { const h = []; for (const c of p.classes) h[c.row] = Math.max(h[c.row] || 0, heightOf(c)); return h })
const rowY = computed(() => { const y = [PAD]; rowHeights.value.forEach((h, i) => { y[i + 1] = y[i] + (h || 0) + GAP_Y }); return y })
const pos = computed(() => Object.fromEntries(p.classes.map(c => [c.name, { x: PAD + c.col * CW.value, y: rowY.value[c.row], w: BW.value, h: heightOf(c) }])))
const W = computed(() => (Math.max(...p.classes.map(c => c.col)) + 1) * CW.value + PAD)
const H = computed(() => rowY.value[rowHeights.value.length] + PAD - GAP_Y + 10)
const ctr = b => [b.x + b.w / 2, b.y + b.h / 2]
function seg(a, b) {
  const A = pos.value[a], B = pos.value[b]; if (!A || !B) return null
  const [ax, ay] = ctr(A), [bx, by] = ctr(B)
  const clip = (R, cx, cy, dx, dy) => { const s = Math.min(Math.abs(R.w / 2 / (dx || 1e-9)), Math.abs(R.h / 2 / (dy || 1e-9))); return [cx + dx * s, cy + dy * s] }
  const [x1, y1] = clip(A, ax, ay, bx - ax, by - ay), [x2, y2] = clip(B, bx, by, ax - bx, ay - by)
  return { x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 }
}
const STYLE = {
  inherits: { end: 'tri', dash: null, label: 'is a' }, implements: { end: 'tri', dash: '6 4', label: 'implements' },
  composition: { start: 'dfill', dash: null, label: 'owns' }, aggregation: { start: 'dhollow', dash: null, label: 'has' },
  uses: { end: 'open', dash: '5 4', label: 'uses' }, association: { end: 'open', dash: null, label: '' },
}
const sel = ref(null)
const selected = computed(() => p.classes.find(c => c.name === sel.value))
const related = computed(() => sel.value ? p.relations.filter(r => r[0] === sel.value || r[1] === sel.value) : [])
const STEREO = { interface: '#0ea5e9', abstract: '#a855f7', enum: '#f59e0b' }
const uid = Math.random().toString(36).slice(2)
</script>

<template>
  <div>
    <div class="w-title">{{ title || 'Class diagram' }}</div>
    <div style="overflow-x:auto">
      <svg :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" style="display:block;margin:0 auto;max-width:none" font-family="var(--font-mono)">
        <defs>
          <marker :id="'tri' + uid" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" orient="auto"><path d="M1 1L11 6L1 11z" fill="var(--panel)" stroke="var(--text-2)" stroke-width="1.2" /></marker>
          <marker :id="'open' + uid" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto"><path d="M1 1L11 6L1 11" fill="none" stroke="var(--text-2)" stroke-width="1.4" /></marker>
          <marker :id="'dfill' + uid" viewBox="0 0 16 10" refX="1" refY="5" markerWidth="16" markerHeight="10" orient="auto"><path d="M1 5L8 1L15 5L8 9z" fill="var(--text-2)" /></marker>
          <marker :id="'dhollow' + uid" viewBox="0 0 16 10" refX="1" refY="5" markerWidth="16" markerHeight="10" orient="auto"><path d="M1 5L8 1L15 5L8 9z" fill="var(--panel)" stroke="var(--text-2)" stroke-width="1.2" /></marker>
        </defs>
        <g v-for="(r, i) in relations" :key="'r' + i">
          <template v-if="seg(r[0], r[1])">
            <line v-bind="{ x1: seg(r[0], r[1]).x1, y1: seg(r[0], r[1]).y1, x2: seg(r[0], r[1]).x2, y2: seg(r[0], r[1]).y2 }"
              :stroke="sel && (r[0] === sel || r[1] === sel) ? 'var(--accent)' : 'var(--text-2)'" :stroke-width="sel && (r[0] === sel || r[1] === sel) ? 2.2 : 1.3"
              :stroke-dasharray="STYLE[r[2]]?.dash" :marker-end="STYLE[r[2]]?.end ? `url(#${STYLE[r[2]].end}${uid})` : null" :marker-start="STYLE[r[2]]?.start ? `url(#${STYLE[r[2]].start}${uid})` : null" />
            <text :x="seg(r[0], r[1]).mx" :y="seg(r[0], r[1]).my - 5" text-anchor="middle" font-size="12.5" font-family="var(--font-ui)" fill="var(--muted)" style="paint-order:stroke;stroke:var(--panel);stroke-width:4px">{{ r[3] || STYLE[r[2]]?.label }}</text>
          </template>
        </g>
        <g v-for="c in classes" :key="c.name" style="cursor:pointer" @click="sel = c.name">
          <rect :x="pos[c.name].x" :y="pos[c.name].y" :width="BW" :height="pos[c.name].h" rx="8" fill="var(--panel)" :stroke="sel === c.name ? 'var(--accent)' : STEREO[c.stereo] || 'var(--line-strong)'" :stroke-width="sel === c.name ? 2.4 : 1.4" />
          <rect :x="pos[c.name].x" :y="pos[c.name].y" :width="BW" :height="HEAD" rx="8" :fill="`color-mix(in srgb, ${STEREO[c.stereo] || '#6366f1'} 16%, var(--panel))`" />
          <text v-if="c.stereo" :x="pos[c.name].x + BW / 2" :y="pos[c.name].y + 12" text-anchor="middle" font-size="9" fill="var(--muted)">«{{ c.stereo }}»</text>
          <text :x="pos[c.name].x + BW / 2" :y="pos[c.name].y + (c.stereo ? 32 : 26)" text-anchor="middle" font-size="15" font-weight="700" :font-style="c.stereo === 'abstract' ? 'italic' : null" fill="var(--text)" font-family="var(--font-ui)">{{ c.name }}</text>
          <text v-for="(f, k) in c.fields || []" :key="'f' + k" :x="pos[c.name].x + 10" :y="pos[c.name].y + HEAD + 16 + k * LINE" font-size="12.5" fill="var(--text-2)">{{ f }}</text>
          <line :x1="pos[c.name].x" :x2="pos[c.name].x + BW" :y1="pos[c.name].y + HEAD + Math.max(1, (c.fields || []).length) * LINE + 8" :y2="pos[c.name].y + HEAD + Math.max(1, (c.fields || []).length) * LINE + 8" stroke="var(--line)" />
          <text v-for="(m, k) in c.methods || []" :key="'m' + k" :x="pos[c.name].x + 10" :y="pos[c.name].y + HEAD + Math.max(1, (c.fields || []).length) * LINE + 24 + k * LINE" font-size="12.5" fill="var(--text)">{{ m }}</text>
        </g>
      </svg>
    </div>
    <div class="w-row" style="gap:14px;font-size:12.5px">
      <span class="meta">▷ solid = inherits · ▷ dashed = implements · ◆ = owns (composition) · ◇ = has (aggregation) · dashed → = uses</span>
    </div>
    <div class="w-out w-explain">
      <template v-if="selected"><b>{{ selected.name }}</b> <span v-if="selected.stereo" class="meta">({{ selected.stereo }})</span>
        <div style="margin-top:6px" v-html="selected.desc"></div>
        <div v-if="related.length" class="meta" style="margin-top:6px">Relationships: {{ related.map(r => `${r[0]} ${r[3] || STYLE[r[2]]?.label || r[2]} ${r[1]}`).join(' · ') }}</div></template>
      <em v-else>Click any class to see its responsibility and relationships.</em>
    </div>
  </div>
</template>
