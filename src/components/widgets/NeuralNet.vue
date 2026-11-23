<script setup>
// A 2-4-1 MLP learning XOR live with backprop. Shows weights as edge thickness and the decision boundary.
import { ref, onUnmounted } from 'vue'
const H = 4, lr = ref(0.5), act = ref('tanh'), epoch = ref(0), lossV = ref(1), running = ref(false), tick = ref(0)
const rnd = () => Math.random() * 2 - 1
let W1, b1, W2, b2
const init = () => { W1 = [...Array(H)].map(() => [rnd(), rnd()]); b1 = [...Array(H)].map(rnd); W2 = [...Array(H)].map(rnd); b2 = rnd(); epoch.value = 0; tick.value++ }
const DATA = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]]
const f = x => act.value === 'tanh' ? Math.tanh(x) : act.value === 'relu' ? Math.max(0, x) : 1 / (1 + Math.exp(-x))
const df = (x, y) => act.value === 'tanh' ? 1 - y * y : act.value === 'relu' ? (x > 0 ? 1 : 0) : y * (1 - y)
const sig = x => 1 / (1 + Math.exp(-x))
const fwd = (x1, x2) => { const z = W1.map((w, j) => w[0] * x1 + w[1] * x2 + b1[j]), h = z.map(f), o = sig(h.reduce((s, v, j) => s + v * W2[j], b2)); return { z, h, o } }
function train(n = 50) { for (let e = 0; e < n; e++) { let L = 0
  for (const [x1, x2, y] of DATA) { const { z, h, o } = fwd(x1, x2); L += -(y * Math.log(o + 1e-9) + (1 - y) * Math.log(1 - o + 1e-9)); const dO = o - y
    for (let j = 0; j < H; j++) { const dH = dO * W2[j] * df(z[j], h[j]); W2[j] -= lr.value * dO * h[j]; W1[j][0] -= lr.value * dH * x1; W1[j][1] -= lr.value * dH * x2; b1[j] -= lr.value * dH } b2 -= lr.value * dO }
  lossV.value = L / 4; epoch.value++ } tick.value++ }
let timer; const go = () => { if (running.value) { clearInterval(timer); running.value = false; return } running.value = true; timer = setInterval(() => { train(20); if (lossV.value < 0.01) { clearInterval(timer); running.value = false } }, 50) }
onUnmounted(() => clearInterval(timer)); init()
const NX = [60, 220, 380], ny = (n, i) => 30 + (i + .5) * 220 / n
</script>

<template>
  <div :key="tick">
    <div class="w-title">Neural network learning XOR (backpropagation)</div>
    <p class="w-sub">XOR is not linearly separable — a single neuron can't learn it, a hidden layer can. Blue = positive weight, red = negative, thickness = magnitude.</p>
    <div class="w-row"><button class="btn small" @click="go">{{ running ? 'Pause' : 'Train' }}</button><button class="btn ghost small" @click="train(1)">1 epoch</button><button class="btn ghost small" @click="init">Re-initialize</button>
      <select v-model="act"><option value="tanh">tanh</option><option value="relu">ReLU</option><option value="sigmoid">sigmoid</option></select>
      <label>lr <input type="range" min="0.05" max="2" step="0.05" v-model.number="lr" /> {{ lr }}</label></div>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <svg viewBox="0 0 440 250" style="width:min(100%,440px)">
        <template v-for="j in H" :key="'a' + j"><line v-for="i in 2" :key="i" :x1="NX[0]" :y1="ny(2, i - 1)" :x2="NX[1]" :y2="ny(H, j - 1)" :stroke="W1[j - 1][i - 1] > 0 ? '#3b82f6' : '#ef4444'" :stroke-width="Math.min(8, Math.abs(W1[j - 1][i - 1]) * 1.5 + .3)" opacity=".8" />
          <line :x1="NX[1]" :y1="ny(H, j - 1)" :x2="NX[2]" :y2="ny(1, 0)" :stroke="W2[j - 1] > 0 ? '#3b82f6' : '#ef4444'" :stroke-width="Math.min(8, Math.abs(W2[j - 1]) * 1.5 + .3)" opacity=".8" /></template>
        <circle v-for="i in 2" :key="'i' + i" :cx="NX[0]" :cy="ny(2, i - 1)" r="16" fill="var(--node)" stroke="var(--nodeLine)" />
        <circle v-for="j in H" :key="'h' + j" :cx="NX[1]" :cy="ny(H, j - 1)" r="16" fill="var(--node)" stroke="var(--nodeLine)" />
        <circle :cx="NX[2]" :cy="ny(1, 0)" r="18" fill="var(--accent)" />
        <text :x="NX[0]" y="248" text-anchor="middle" font-size="11" fill="var(--muted)">input x₁,x₂</text><text :x="NX[1]" y="248" text-anchor="middle" font-size="11" fill="var(--muted)">hidden ({{ act }})</text><text :x="NX[2]" y="248" text-anchor="middle" font-size="11" fill="var(--muted)">σ output</text>
      </svg>
      <svg viewBox="0 0 200 200" style="width:200px">
        <template v-for="i in 20" :key="'r' + i"><rect v-for="j in 20" :key="j" :x="(i - 1) * 10" :y="(j - 1) * 10" width="10" height="10" :fill="`rgba(99,102,241,${fwd((i - .5) / 20, 1 - (j - .5) / 20).o})`" /></template>
        <circle v-for="d in DATA" :key="d.join()" :cx="5 + d[0] * 190" :cy="195 - d[1] * 190" r="7" :fill="d[2] ? '#fff' : '#000'" stroke="var(--accent)" stroke-width="2" />
      </svg>
    </div>
    <div class="w-out mono">epoch {{ epoch }} · cross-entropy loss {{ lossV.toFixed(4) }} · predictions: {{ DATA.map(d => `${d[0]}⊕${d[1]}=${fwd(d[0], d[1]).o.toFixed(2)}`).join('  ') }}</div>
  </div>
</template>
