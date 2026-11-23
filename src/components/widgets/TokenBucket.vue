<script setup>
// Token bucket rate limiter in real time. Click to send requests or turn on a burst generator.
import { ref, onUnmounted } from 'vue'
const cap = ref(10), rate = ref(2), tokens = ref(10), log = ref([]), ok = ref(0), rej = ref(0), auto = ref(0)
let last = performance.now()
const timer = setInterval(() => { const now = performance.now(); tokens.value = Math.min(cap.value, tokens.value + rate.value * (now - last) / 1000); last = now
  if (auto.value && Math.random() < auto.value / 20) req() }, 50)
onUnmounted(() => clearInterval(timer))
function req() { const t = new Date().toLocaleTimeString()
  if (tokens.value >= 1) { tokens.value -= 1; ok.value++; log.value.unshift({ t, ok: true }) } else { rej.value++; log.value.unshift({ t, ok: false }) }
  log.value = log.value.slice(0, 40) }
const burst = () => { for (let i = 0; i < 15; i++) req() }
</script>

<template>
  <div>
    <div class="w-title">Token bucket rate limiter</div>
    <p class="w-sub">Tokens refill at <b>{{ rate }}/s</b> up to <b>{{ cap }}</b>. Each request spends one; empty bucket → <code>429 Too Many Requests</code>.</p>
    <div class="w-row"><label>capacity <input type="range" min="1" max="30" v-model.number="cap" /> {{ cap }}</label><label>refill/s <input type="range" min="0.5" max="10" step="0.5" v-model.number="rate" /> {{ rate }}</label>
      <label>background traffic <input type="range" min="0" max="20" v-model.number="auto" /> ~{{ auto }} req/s</label></div>
    <div class="w-row"><button class="btn small" @click="req">Send 1 request</button><button class="btn ghost small" @click="burst">Burst of 15</button></div>
    <div style="display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap">
      <div style="width:90px;height:180px;border:3px solid var(--nodeLine);border-top:none;border-radius:0 0 14px 14px;position:relative;overflow:hidden">
        <div :style="{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 * tokens / cap + '%', background: 'linear-gradient(var(--accent-2),var(--accent))', transition: 'height .1s' }"></div>
        <div style="position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:20px;color:var(--text)">{{ tokens.toFixed(1) }}</div>
      </div>
      <div style="flex:1;min-width:200px"><div style="display:flex;flex-wrap:wrap;gap:3px"><span v-for="(l, i) in log" :key="i" :style="{ width: '14px', height: '14px', borderRadius: '3px', background: l.ok ? 'var(--ok)' : 'var(--bad)' }" :title="l.t"></span></div>
        <div class="w-out"><b style="color:var(--ok)">allowed {{ ok }}</b> · <b style="color:var(--bad)">429 rejected {{ rej }}</b><br /><span class="meta">Long-run throughput can never exceed the refill rate; capacity only controls how big a burst you absorb.</span></div></div>
    </div>
  </div>
</template>
