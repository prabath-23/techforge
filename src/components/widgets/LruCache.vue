<script setup>
// LRU cache = hash map + doubly linked list. Shows the list, the map, hit rate and evictions.
import { ref } from 'vue'
const cap = ref(4), list = ref([]), key = ref('A'), msg = ref('Try a workload: A B C D A E — B gets evicted, not A.'), hits = ref(0), miss = ref(0)
function access(k = key.value.trim().toUpperCase()) {
  if (!k) return; const i = list.value.indexOf(k)
  if (i >= 0) { list.value.splice(i, 1); list.value.unshift(k); hits.value++; msg.value = `get(${k}) HIT → map gives node in O(1); unlink it and move to head.` }
  else { miss.value++; list.value.unshift(k); let ev = ''; if (list.value.length > cap.value) ev = list.value.pop()
    msg.value = `get(${k}) MISS → load from backing store, insert at head.` + (ev ? ` Over capacity → evict tail "${ev}" and delete it from the map.` : '') }
  key.value = 'ABCDEFG'[Math.floor(Math.random() * 7)]
}
const runSeq = s => { list.value = []; hits.value = miss.value = 0; s.split(' ').forEach(x => access(x)) }
</script>

<template>
  <div>
    <div class="w-title">LRU cache</div>
    <p class="w-sub">{{ msg }}</p>
    <div class="w-row"><label>capacity <input v-model.number="cap" type="number" min="1" max="8" style="width:56px" /></label>
      <input v-model="key" style="width:56px" @keyup.enter="access()" /><button class="btn small" @click="access()">access</button>
      <button class="btn ghost small" @click="runSeq('A B C D A E')">A B C D A E</button><button class="btn ghost small" @click="runSeq('A B C D E A B C D E')">Cyclic scan (LRU worst case)</button>
      <button class="btn ghost small" @click="list = []; hits = miss = 0">Clear</button></div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:12px 0" class="mono">
      <span class="chip">HEAD (MRU)</span>
      <template v-for="(k, i) in list" :key="k"><div :style="{ padding: '12px 16px', borderRadius: '10px', border: '2px solid var(--nodeLine)', background: i === 0 ? 'var(--accent)' : i === list.length - 1 && list.length === cap ? 'color-mix(in srgb,var(--bad) 25%,transparent)' : 'var(--node)', color: i === 0 ? '#fff' : 'var(--text)', fontWeight: 800 }">{{ k }}</div><span v-if="i < list.length - 1">⇄</span></template>
      <span class="chip">TAIL (LRU)</span>
    </div>
    <div class="w-out mono" style="font-size:13px">map: { {{ list.map(k => `${k} → node`).join(', ') }} } · hits {{ hits }} · misses {{ miss }} · hit rate {{ hits + miss ? Math.round(100 * hits / (hits + miss)) : 0 }}%</div>
  </div>
</template>
