<script setup>
import { ref, onUnmounted } from 'vue'
const ALGOS = { bubble: 'Bubble O(n²)', insertion: 'Insertion O(n²)', selection: 'Selection O(n²)', merge: 'Merge O(n log n)', quick: 'Quick (Lomuto) O(n log n) avg', heap: 'Heap O(n log n)' }
const algo = ref('quick'), size = ref(40), speed = ref(60), pattern = ref('random')
const arr = ref([]), hi = ref([]), sorted = ref(new Set()), stats = ref({ cmp: 0, w: 0 }); let timer
function make() { clearInterval(timer); const n = size.value
  let a = [...Array(n)].map((_, i) => 5 + Math.round(95 * (i + 1) / n))
  if (pattern.value === 'random') a.sort(() => Math.random() - .5); if (pattern.value === 'reversed') a.reverse()
  if (pattern.value === 'nearly') for (let k = 0; k < n / 10; k++) { const i = Math.floor(Math.random() * (n - 1)); [a[i], a[i + 1]] = [a[i + 1], a[i]] }
  arr.value = a; hi.value = []; sorted.value = new Set(); stats.value = { cmp: 0, w: 0 } }
function record(a) {
  const F = [], c = { cmp: 0, w: 0 }, P = h => F.push({ a: [...a], h, c: { ...c } }), sw = (i, j) => { [a[i], a[j]] = [a[j], a[i]]; c.w += 2 }, n = a.length
  const A = algo.value
  if (A === 'bubble') for (let i = 0; i < n; i++) { let s = false; for (let j = 0; j < n - i - 1; j++) { c.cmp++; if (a[j] > a[j + 1]) { sw(j, j + 1); s = true } P([j, j + 1]) } if (!s) break }
  if (A === 'insertion') for (let i = 1; i < n; i++) for (let j = i; j > 0 && (c.cmp++, a[j - 1] > a[j]); j--) { sw(j - 1, j); P([j - 1, j]) }
  if (A === 'selection') for (let i = 0; i < n; i++) { let m = i; for (let j = i + 1; j < n; j++) { c.cmp++; if (a[j] < a[m]) m = j; P([i, j, m]) } sw(i, m); P([i, m]) }
  if (A === 'merge') (function ms(l, r) { if (r - l < 2) return; const m = (l + r) >> 1; ms(l, m); ms(m, r); const L = a.slice(l, m), R = a.slice(m, r); let i = 0, j = 0, k = l
    while (i < L.length || j < R.length) { c.cmp++; a[k] = (j >= R.length || (i < L.length && L[i] <= R[j])) ? L[i++] : R[j++]; c.w++; P([k]); k++ } })(0, n)
  if (A === 'quick') (function qs(l, r) { if (l >= r) return; const p = a[r]; let i = l; for (let j = l; j < r; j++) { c.cmp++; if (a[j] < p) { sw(i, j); i++ } P([j, r, i]) } sw(i, r); P([i]); qs(l, i - 1); qs(i + 1, r) })(0, n - 1)
  if (A === 'heap') { const sift = (i, m) => { for (;;) { let l = 2 * i + 1, r = l + 1, g = i; if (l < m && (c.cmp++, a[l] > a[g])) g = l; if (r < m && (c.cmp++, a[r] > a[g])) g = r; if (g === i) return; sw(i, g); P([i, g]); i = g } }
    for (let i = (n >> 1) - 1; i >= 0; i--) sift(i, n); for (let e = n - 1; e > 0; e--) { sw(0, e); P([0, e]); sift(0, e) } }
  P([]); return F
}
function run() { clearInterval(timer); const F = record([...arr.value]); let k = 0
  timer = setInterval(() => { k = Math.min(F.length - 1, k + Math.ceil(speed.value / 15)); const f = F[k]; arr.value = f.a; hi.value = f.h; stats.value = f.c; if (k >= F.length - 1) { clearInterval(timer); hi.value = [] } }, 30) }
make(); onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div>
    <div class="w-title">Sorting visualizer</div>
    <p class="w-sub">Try the same algorithm on random vs nearly-sorted vs reversed input — that's where the real differences show up.</p>
    <div class="w-row">
      <select v-model="algo"><option v-for="(l, k) in ALGOS" :key="k" :value="k">{{ l }}</option></select>
      <select v-model="pattern" @change="make"><option value="random">Random</option><option value="nearly">Nearly sorted</option><option value="reversed">Reversed</option></select>
      <label>n <input type="range" min="10" max="120" v-model.number="size" @change="make" /></label>
      <label>speed <input type="range" min="5" max="200" v-model.number="speed" /></label>
      <button class="btn small" @click="run">Sort</button><button class="btn ghost small" @click="make">New array</button>
    </div>
    <svg viewBox="0 0 600 200" class="w-svg"><rect v-for="(v, i) in arr" :key="i" :x="i * 600 / arr.length + .5" :y="200 - v * 2" :width="600 / arr.length - 1" :height="v * 2" rx="1.5" :fill="hi.includes(i) ? 'var(--bad)' : 'var(--accent)'" /></svg>
    <div class="w-out mono">n = {{ arr.length }} · comparisons = {{ stats.cmp }} · writes = {{ stats.w }} · n² = {{ arr.length ** 2 }} · n·log₂n ≈ {{ Math.round(arr.length * Math.log2(arr.length)) }}</div>
  </div>
</template>
