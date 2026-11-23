<script setup>
// Hash table with separate chaining OR linear probing; load factor triggers resize + rehash.
import { ref, computed } from 'vue'
const mode = ref('chain'), cap = ref(8), buckets = ref([]), key = ref('apple'), log = ref(''), maxLF = ref(0.75), probes = ref(0)
const WORDS = ['apple', 'grape', 'kiwi', 'mango', 'lemon', 'peach', 'plum', 'cherry', 'melon', 'fig', 'lime', 'pear', 'date', 'guava', 'papaya', 'banana']
const hash = s => { let h = 5381; for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h } // djb2
const reset = () => { buckets.value = Array.from({ length: cap.value }, () => mode.value === 'chain' ? [] : null); log.value = '' }
const count = computed(() => mode.value === 'chain' ? buckets.value.reduce((s, b) => s + b.length, 0) : buckets.value.filter(b => b !== null && b !== 'TOMB').length)
const lf = computed(() => (count.value / buckets.value.length).toFixed(2))
function rawInsert(bs, k) {
  const i = hash(k) % bs.length
  if (mode.value === 'chain') { if (!bs[i].includes(k)) bs[i].push(k); return { i, p: 1 } }
  let j = i, p = 1; while (bs[j] !== null && bs[j] !== 'TOMB' && bs[j] !== k) { j = (j + 1) % bs.length; p++ } bs[j] = k; return { i, j, p }
}
function insert(k = key.value.trim()) {
  if (!k) return
  const r = rawInsert(buckets.value, k); probes.value = r.p
  log.value = `hash("${k}") = ${hash(k)} → ${hash(k)} mod ${buckets.value.length} = ${r.i}` + (mode.value === 'probe' && r.j !== r.i ? ` → collision, probed to slot ${r.j} (${r.p} probes)` : mode.value === 'chain' && buckets.value[r.i].length > 1 ? ` → collision, appended to chain (length ${buckets.value[r.i].length})` : '')
  if (count.value / buckets.value.length > maxLF.value) {
    const old = buckets.value.flat().filter(x => x && x !== 'TOMB'), n = buckets.value.length * 2
    const nb = Array.from({ length: n }, () => mode.value === 'chain' ? [] : null); old.forEach(x => rawInsert(nb, x)); buckets.value = nb
    log.value += ` · Load factor exceeded ${maxLF.value} → RESIZE to ${n} buckets and rehash all ${old.length} keys (O(n) once, amortized O(1)).`
  }
  key.value = WORDS[Math.floor(Math.random() * WORDS.length)] + (Math.random() < .3 ? Math.floor(Math.random() * 9) : '')
}
function lookup() { const k = key.value.trim(), i = hash(k) % buckets.value.length
  if (mode.value === 'chain') { log.value = `lookup "${k}": bucket ${i}, scan chain of ${buckets.value[i].length} → ${buckets.value[i].includes(k) ? 'FOUND' : 'not found'}`; return }
  let j = i, p = 1; while (buckets.value[j] !== null && buckets.value[j] !== k && p <= buckets.value.length) { j = (j + 1) % buckets.value.length; p++ }
  log.value = `lookup "${k}": start slot ${i}, ${p} probe(s) → ${buckets.value[j] === k ? 'FOUND at ' + j : 'hit empty slot → not found'}` }
reset()
</script>

<template>
  <div>
    <div class="w-title">Hash table internals</div>
    <p class="w-sub">djb2 hash, power-of-two capacity, resize at load factor {{ maxLF }}.</p>
    <div class="w-row">
      <button class="chip-btn" :class="{ on: mode === 'chain' }" @click="mode = 'chain'; cap = 8; reset()">Separate chaining</button>
      <button class="chip-btn" :class="{ on: mode === 'probe' }" @click="mode = 'probe'; cap = 8; reset()">Open addressing (linear probe)</button>
      <input v-model="key" style="width:110px" @keyup.enter="insert()" /><button class="btn small" @click="insert()">put</button><button class="btn ghost small" @click="lookup">get</button>
      <button class="btn ghost small" @click="WORDS.slice(0, 6).forEach(w => insert(w))">Insert 6</button><button class="btn ghost small" @click="reset">Clear</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:3px" class="mono">
      <div v-for="(b, i) in buckets" :key="i" style="display:flex;gap:4px;align-items:center;font-size:12.5px">
        <span style="width:28px;color:var(--muted);text-align:right">{{ i }}</span>
        <template v-if="mode === 'chain'"><span style="width:14px;height:14px;border:1px solid var(--line);border-radius:3px;display:inline-block"></span>
          <span v-for="(x, j) in b" :key="j" style="background:var(--node);border:1px solid var(--nodeLine);padding:1px 8px;border-radius:5px">{{ x }}</span><span v-if="b.length > 1" style="color:var(--warn)">← chain</span></template>
        <span v-else :style="{ background: b ? 'var(--node)' : 'var(--soft)', border: '1px solid var(--line)', padding: '1px 8px', borderRadius: '5px', minWidth: '90px' }">{{ b ?? '∅' }}</span>
      </div>
    </div>
    <div class="w-out"><b>n = {{ count }}, buckets = {{ buckets.length }}, load factor = {{ lf }}</b><br />{{ log }}</div>
  </div>
</template>
