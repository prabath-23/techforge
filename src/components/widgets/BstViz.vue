<script setup>
// BST vs AVL: insert keys and watch an unbalanced BST degrade while AVL rotates to stay O(log n).
import { ref, computed } from 'vue'
const avl = ref(true), root = ref(null), val = ref(50), msg = ref('Insert 10, 20, 30, 40, 50 in order, compare plain BST vs AVL.'), searchPath = ref([])
const h = n => n ? n.h : 0, upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)); return n }
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); return upd(x) }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); return upd(y) }
let rot = []
function ins(n, v) {
  if (!n) return { v, l: null, r: null, h: 1 }
  if (v < n.v) n.l = ins(n.l, v); else if (v > n.v) n.r = ins(n.r, v); else return n
  upd(n); if (!avl.value) return n
  const b = h(n.l) - h(n.r)
  if (b > 1 && v < n.l.v) { rot.push(`LL at ${n.v} → right rotation`); return rotR(n) }
  if (b < -1 && v > n.r.v) { rot.push(`RR at ${n.v} → left rotation`); return rotL(n) }
  if (b > 1) { rot.push(`LR at ${n.v} → left-right rotation`); n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { rot.push(`RL at ${n.v} → right-left rotation`); n.r = rotR(n.r); return rotL(n) }
  return n
}
const clone = n => n && { ...n, l: clone(n.l), r: clone(n.r) }
function insert(v = +val.value) { rot = []; root.value = ins(clone(root.value), v); msg.value = `insert ${v}. ${rot.join('; ') || 'no rotation needed'}. Height = ${h(root.value)}.`; val.value = Math.floor(Math.random() * 99) + 1; searchPath.value = [] }
function search() { const v = +val.value, p = []; let n = root.value; while (n) { p.push(n.v); if (v === n.v) break; n = v < n.v ? n.l : n.r }
  searchPath.value = p; msg.value = `search ${v}: visited ${p.join(' → ')} (${p.length} comparisons), ${n ? 'found' : 'not found'}` }
const layout = computed(() => { const nodes = [], edges = []; let i = 0
  const walk = (n, d, px, py) => { if (!n) return; walk(n.l, d + 1); const x = i++, y = d; nodes.push({ v: n.v, x, y, bal: h(n.l) - h(n.r), n }); walk(n.r, d + 1) }
  walk(root.value, 0); const pos = new Map(nodes.map(o => [o.n, o]))
  nodes.forEach(o => { for (const c of [o.n.l, o.n.r]) if (c) edges.push([o, pos.get(c)]) })
  return { nodes, edges, W: Math.max(1, nodes.length), D: h(root.value) } })
const X = x => 30 + x * 700 / Math.max(1, layout.value.W - 1 || 1), Y = y => 30 + y * 60
const inorder = computed(() => { const o = []; const w = n => { if (!n) return; w(n.l); o.push(n.v); w(n.r) }; w(root.value); return o })
</script>

<template>
  <div>
    <div class="w-title">Binary search tree vs AVL tree</div>
    <p class="w-sub">{{ msg }}</p>
    <div class="w-row">
      <label><input type="checkbox" v-model="avl" @change="root = null" /> Self-balancing (AVL)</label>
      <input v-model.number="val" type="number" style="width:70px" @keyup.enter="insert()" /><button class="btn small" @click="insert()">insert</button><button class="btn ghost small" @click="search">search</button>
      <button class="btn ghost small" @click="[10, 20, 30, 40, 50, 60, 70].forEach(v => insert(v))">Insert sorted 10..70</button><button class="btn ghost small" @click="root = null">Clear</button>
    </div>
    <svg :viewBox="`0 0 760 ${Math.max(100, 60 + layout.D * 60)}`" class="w-svg">
      <line v-for="([a, b], i) in layout.edges" :key="i" :x1="X(a.x)" :y1="Y(a.y)" :x2="X(b.x)" :y2="Y(b.y)" stroke="var(--muted)" stroke-width="1.5" />
      <g v-for="o in layout.nodes" :key="o.v">
        <circle :cx="X(o.x)" :cy="Y(o.y)" r="17" :fill="searchPath.includes(o.v) ? 'var(--warn)' : 'var(--node)'" :stroke="Math.abs(o.bal) > 1 ? 'var(--bad)' : 'var(--nodeLine)'" stroke-width="2" />
        <text :x="X(o.x)" :y="Y(o.y) + 5" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">{{ o.v }}</text>
        <text :x="X(o.x) + 20" :y="Y(o.y) - 12" font-size="10" fill="var(--muted)">{{ o.bal }}</text>
      </g>
    </svg>
    <div class="w-out mono" style="font-size:13px">n = {{ inorder.length }} · height = {{ layout.D }} · optimal ⌈log₂(n+1)⌉ = {{ Math.ceil(Math.log2(inorder.length + 1)) }} · in-order: {{ inorder.join(', ') }}</div>
  </div>
</template>
