<script setup>
// Binary min-heap shown as both a tree and the backing array. Sift-up on push, sift-down on pop.
import { ref } from 'vue'
const a = ref([3, 8, 5, 12, 10, 7, 9]), val = ref(4), msg = ref('Array index i has children 2i+1 and 2i+2, parent ⌊(i−1)/2⌋.'), hl = ref([])
function push() { const h = [...a.value, +val.value], steps = []; let i = h.length - 1
  while (i > 0) { const p = (i - 1) >> 1; if (h[p] <= h[i]) break; steps.push(`swap ${h[i]}↔${h[p]}`); [h[p], h[i]] = [h[i], h[p]]; i = p }
  a.value = h; hl.value = [i]; msg.value = `push ${val.value}: append at end, sift UP — ${steps.join(', ') || 'already in place'}. O(log n).`; val.value = Math.floor(Math.random() * 40) }
function pop() { if (!a.value.length) return; const h = [...a.value], top = h[0], last = h.pop(), steps = []
  if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l] < h[m]) m = l; if (r < h.length && h[r] < h[m]) m = r; if (m === i) break; steps.push(`swap ${h[i]}↔${h[m]}`); [h[i], h[m]] = [h[m], h[i]]; i = m } hl.value = [i] }
  a.value = h; msg.value = `pop → ${top}. Move last element to root, sift DOWN — ${steps.join(', ') || 'no swaps'}. O(log n).` }
const pos = i => { const d = Math.floor(Math.log2(i + 1)), k = i + 1 - 2 ** d; return [(k + .5) * 760 / 2 ** d, 30 + d * 62] }
</script>

<template>
  <div>
    <div class="w-title">Binary heap (priority queue)</div>
    <p class="w-sub">{{ msg }}</p>
    <div class="w-row"><input v-model.number="val" type="number" style="width:70px" /><button class="btn small" @click="push">push</button><button class="btn ghost small" @click="pop">pop min</button></div>
    <svg :viewBox="`0 0 760 ${40 + Math.floor(Math.log2(a.length || 1)) * 62 + 30}`" class="w-svg">
      <line v-for="(_, i) in a.slice(1)" :key="'e' + i" :x1="pos((i) >> 1)[0]" :y1="pos(i >> 1)[1]" :x2="pos(i + 1)[0]" :y2="pos(i + 1)[1]" stroke="var(--muted)" />
      <g v-for="(v, i) in a" :key="i"><circle :cx="pos(i)[0]" :cy="pos(i)[1]" r="17" :fill="hl.includes(i) ? 'var(--warn)' : i === 0 ? 'var(--accent)' : 'var(--node)'" stroke="var(--nodeLine)" />
        <text :x="pos(i)[0]" :y="pos(i)[1] + 5" text-anchor="middle" font-weight="700" font-size="13" :fill="i === 0 ? '#fff' : 'var(--text)'">{{ v }}</text></g>
    </svg>
    <div class="mono" style="display:flex;gap:3px;flex-wrap:wrap"><div v-for="(v, i) in a" :key="i" :style="{ border: '1px solid var(--line)', borderRadius: '6px', padding: '4px 10px', textAlign: 'center', background: hl.includes(i) ? 'var(--warn)' : 'var(--soft)' }"><div style="font-size:10px;color:var(--muted)">[{{ i }}]</div>{{ v }}</div></div>
  </div>
</template>
