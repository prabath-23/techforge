<script setup>
// Growth of common complexity classes + "how big an n can I handle in 1 second?"
import { ref, computed } from 'vue'
const n = ref(20), log = ref(false)
const F = [['O(1)', () => 1, '#16a34a'], ['O(log n)', x => Math.log2(x), '#14b8a6'], ['O(n)', x => x, '#0ea5e9'], ['O(n log n)', x => x * Math.log2(x), '#6366f1'], ['O(n²)', x => x * x, '#f59e0b'], ['O(2ⁿ)', x => 2 ** x, '#ef4444']]
const maxY = computed(() => log.value ? Math.log10(2 ** n.value) : n.value * n.value)
const Y = v => 220 - 210 * Math.min(1, (log.value ? Math.log10(Math.max(1, v)) : v) / maxY.value)
const ops = 1e8
const budget = [['O(log n)', 'astronomically large'], ['O(n)', '~10⁸'], ['O(n log n)', '~5·10⁶'], ['O(n²)', '~10⁴'], ['O(n³)', '~460'], ['O(2ⁿ)', '~26'], ['O(n!)', '~11']]
</script>

<template>
  <div>
    <div class="w-title">Growth rates</div>
    <p class="w-sub">Drag n. On a linear scale, exponential explodes off the chart almost immediately; switch to log scale to compare.</p>
    <div class="w-row"><label>n = <input type="range" min="2" max="60" v-model.number="n" /> {{ n }}</label><label><input type="checkbox" v-model="log" /> log scale</label></div>
    <svg viewBox="0 0 760 240" class="w-svg">
      <line x1="40" y1="220" x2="740" y2="220" stroke="var(--line)" /><line x1="40" y1="10" x2="40" y2="220" stroke="var(--line)" />
      <g v-for="[name, f, c] in F" :key="name"><polyline :points="[...Array(60)].map((_, i) => { const x = 1 + i * (n - 1) / 59; return `${40 + i * 700 / 59},${Y(f(x))}` }).join(' ')" fill="none" :stroke="c" stroke-width="2.5" />
        <text x="745" :y="Math.max(14, Y(f(n)))" font-size="12" :fill="c" text-anchor="end" font-weight="700">{{ name }} = {{ f(n) < 1e6 ? Math.round(f(n)).toLocaleString() : f(n).toExponential(1) }}</text></g>
    </svg>
    <div class="w-out"><b>Rule of thumb: ~10⁸ simple operations per second.</b> Largest n that runs in ~1s:
      <span v-for="[c, v] in budget" :key="c" class="chip">{{ c }}: {{ v }}</span></div>
  </div>
</template>
