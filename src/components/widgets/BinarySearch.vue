<script setup>
import { ref } from 'vue'
const make = () => [...new Set([...Array(24)].map(() => Math.floor(Math.random() * 99)))].sort((a, b) => a - b)
const a = ref(make()), target = ref(a.value[7]), lo = ref(0), hi = ref(a.value.length - 1), mid = ref(-1), found = ref(-1), log = ref([])
const reset = () => { lo.value = 0; hi.value = a.value.length - 1; mid.value = -1; found.value = -1; log.value = [] }
function step() { if (found.value >= 0 || lo.value > hi.value) return; const t = +target.value; mid.value = lo.value + ((hi.value - lo.value) >> 1); const v = a.value[mid.value]
  let s = `lo=${lo.value} hi=${hi.value} → mid=${mid.value} (a[mid]=${v}). `
  if (v === t) { found.value = mid.value; s += 'Found!' } else if (v < t) { lo.value = mid.value + 1; s += `${v} < ${t} → lo = mid+1` } else { hi.value = mid.value - 1; s += `${v} > ${t} → hi = mid−1` }
  if (found.value < 0 && lo.value > hi.value) s += ` · lo > hi → not present; insertion point = ${lo.value}`; log.value.push(s) }
</script>

<template>
  <div>
    <div class="w-title">Binary search, step by step</div>
    <p class="w-sub">Invariant: if the target exists, it is within [lo, hi]. Each step halves that window → ⌈log₂ n⌉ steps.</p>
    <div class="w-row"><label>target <input v-model.number="target" type="number" style="width:70px" @input="reset" /></label><button class="btn small" @click="step">Step</button><button class="btn ghost small" @click="reset">Reset</button><button class="btn ghost small" @click="a = make(); reset()">New array</button></div>
    <div style="display:flex;gap:3px;flex-wrap:wrap;margin:12px 0" class="mono">
      <div v-for="(v, i) in a" :key="i" :style="{ width: '38px', textAlign: 'center', padding: '6px 0', borderRadius: '6px', fontSize: '13px', opacity: i < lo || i > hi ? .25 : 1,
        background: i === found ? 'var(--ok)' : i === mid ? 'var(--accent)' : 'var(--soft)', color: i === mid || i === found ? '#fff' : 'var(--text)' }">{{ v }}<div style="font-size:9px">{{ i }}{{ i === lo ? ' L' : '' }}{{ i === hi ? ' H' : '' }}</div></div>
    </div>
    <div class="w-out mono" style="font-size:12.5px"><div v-for="(l, i) in log" :key="i">{{ i + 1 }}. {{ l }}</div><em v-if="!log.length">n = {{ a.length }}; at most {{ Math.ceil(Math.log2(a.length + 1)) }} steps.</em></div>
  </div>
</template>
