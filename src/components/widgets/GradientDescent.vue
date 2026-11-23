<script setup>
// Fit y = w·x + b to noisy points with gradient descent on MSE. Shows loss surface contour path + loss curve.
import { ref, computed, onUnmounted } from 'vue'
const lr = ref(0.05), w = ref(-1.5), b = ref(2.5), hist = ref([]), running = ref(false); let timer
const pts = [...Array(24)].map((_, i) => { const x = -2 + 4 * i / 23; return { x, y: 1.3 * x - 0.4 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.6 } })
const loss = (W, B) => pts.reduce((s, p) => s + (W * p.x + B - p.y) ** 2, 0) / pts.length
function step() { let gw = 0, gb = 0; for (const p of pts) { const e = w.value * p.x + b.value - p.y; gw += 2 * e * p.x / pts.length; gb += 2 * e / pts.length }
  w.value -= lr.value * gw; b.value -= lr.value * gb; hist.value.push({ w: w.value, b: b.value, L: loss(w.value, b.value) }); if (hist.value.length > 300 || !isFinite(w.value)) stop() }
const start = () => { if (running.value) return stop(); running.value = true; timer = setInterval(step, 60) }
const stop = () => { clearInterval(timer); running.value = false }
const reset = () => { stop(); w.value = -1.5; b.value = 2.5; hist.value = [] }
onUnmounted(stop)
const SX = x => 20 + (x + 2.5) * 70, SY = y => 170 - (y + 3.5) * 22
const grid = computed(() => { const g = []; for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) { const W = -2.5 + 5 * i / 29, B = -2.5 + 5 * j / 29; g.push({ i, j, L: loss(W, B) }) } return g })
const CX = W => 400 + (W + 2.5) * 70, CY = B => 360 - (B + 2.5) * 70
const Lmax = computed(() => Math.max(...grid.value.map(g => g.L)))
const curL = computed(() => loss(w.value, b.value))
</script>

<template>
  <div>
    <div class="w-title">Gradient descent (the engine of all deep learning)</div>
    <p class="w-sub">Left: model y = w·x + b fitting data. Right: loss landscape over (w, b) and the path descent takes. Try learning rate 0.9 to see divergence.</p>
    <div class="w-row"><label>learning rate <input type="range" min="0.005" max="1" step="0.005" v-model.number="lr" /> {{ lr }}</label>
      <button class="btn small" @click="start">{{ running ? 'Pause' : 'Train' }}</button><button class="btn ghost small" @click="step">1 step</button><button class="btn ghost small" @click="reset">Reset</button></div>
    <svg viewBox="0 0 760 380" class="w-svg">
      <rect x="10" y="10" width="360" height="360" fill="var(--soft)" rx="8" />
      <circle v-for="(p, i) in pts" :key="i" :cx="SX(p.x)" :cy="SY(p.y) + 100" r="4" fill="var(--accent-2)" />
      <line :x1="SX(-2.4)" :y1="SY(w * -2.4 + b) + 100" :x2="SX(2.4)" :y2="SY(w * 2.4 + b) + 100" stroke="var(--bad)" stroke-width="3" />
      <rect v-for="g in grid" :key="g.i + '-' + g.j" :x="CX(-2.5 + 5 * g.i / 29) - 6" :y="CY(-2.5 + 5 * g.j / 29) - 6" width="12.2" height="12.2" :fill="`hsl(${240 - 240 * Math.sqrt(g.L / Lmax)},70%,55%)`" opacity=".75" />
      <polyline :points="[{ w: -1.5, b: 2.5 }, ...hist].map(h => `${CX(h.w)},${CY(h.b)}`).join(' ')" fill="none" stroke="#fff" stroke-width="2" />
      <circle :cx="CX(w)" :cy="CY(b)" r="6" fill="#fff" stroke="#000" />
      <text x="400" y="376" font-size="11" fill="var(--muted)">w →</text><text x="382" y="20" font-size="11" fill="var(--muted)">b</text>
    </svg>
    <div class="w-out mono">step {{ hist.length }} · w = {{ w.toFixed(3) }} · b = {{ b.toFixed(3) }} · MSE loss = {{ isFinite(curL) ? curL.toFixed(4) : '∞ (diverged!)' }}</div>
  </div>
</template>
