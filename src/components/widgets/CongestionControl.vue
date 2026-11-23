<script setup>
// TCP Reno-style congestion window over RTTs: slow start, congestion avoidance, fast recovery, timeout.
import { ref, computed } from 'vue'
const rtts = ref(40), lossAt = ref('14,26'), timeoutAt = ref('34'), ssthresh0 = ref(32), algo = ref('reno')
const series = computed(() => {
  const loss = new Set(lossAt.value.split(',').map(Number)), to = new Set(timeoutAt.value.split(',').map(Number))
  let cwnd = 1, ss = ssthresh0.value; const out = []
  for (let t = 0; t < rtts.value; t++) {
    let ev = ''
    if (to.has(t)) { ss = Math.max(2, cwnd / 2); cwnd = 1; ev = 'timeout' }
    else if (loss.has(t)) { ss = Math.max(2, cwnd / 2); cwnd = algo.value === 'tahoe' ? 1 : ss; ev = '3 dup ACKs' }
    else if (cwnd < ss) cwnd = Math.min(cwnd * 2, ss)
    else cwnd += 1
    out.push({ t, cwnd, ss, ev, phase: cwnd < ss ? 'slow start' : 'congestion avoidance' })
  }
  return out
})
const max = computed(() => Math.max(...series.value.map(s => Math.max(s.cwnd, s.ss))) * 1.1)
const X = t => 40 + t * 700 / rtts.value, Y = v => 220 - v * 200 / max.value
const sel = ref(null)
</script>

<template>
  <div>
    <div class="w-title">TCP congestion control</div>
    <p class="w-sub">cwnd (segments) per RTT. Exponential growth in slow start, +1 per RTT in congestion avoidance (AIMD), halving on loss.</p>
    <div class="w-row">
      <button v-for="a in ['tahoe', 'reno']" :key="a" class="chip-btn" :class="{ on: algo === a }" @click="algo = a">TCP {{ a[0].toUpperCase() + a.slice(1) }}</button>
      <label>Loss (3 dup ACK) at RTT <input v-model="lossAt" style="width:80px" /></label>
      <label>Timeout at <input v-model="timeoutAt" style="width:60px" /></label>
      <label>initial ssthresh <input v-model.number="ssthresh0" type="number" style="width:60px" /></label>
    </div>
    <svg viewBox="0 0 760 250" class="w-svg">
      <line x1="40" y1="220" x2="740" y2="220" stroke="var(--line)" /><line x1="40" y1="10" x2="40" y2="220" stroke="var(--line)" />
      <polyline :points="series.map(s => `${X(s.t)},${Y(s.ss)}`).join(' ')" fill="none" stroke="var(--warn)" stroke-dasharray="6 4" stroke-width="2" />
      <polyline :points="series.map(s => `${X(s.t)},${Y(s.cwnd)}`).join(' ')" fill="none" stroke="var(--accent)" stroke-width="3" />
      <g v-for="s in series" :key="s.t" @mouseenter="sel = s" style="cursor:pointer">
        <circle :cx="X(s.t)" :cy="Y(s.cwnd)" :r="s.ev ? 6 : 3.5" :fill="s.ev ? 'var(--bad)' : 'var(--accent)'" />
        <rect :x="X(s.t) - 8" y="0" width="16" height="230" fill="transparent" />
      </g>
      <text x="44" y="22" font-size="12" fill="var(--accent)">cwnd</text><text x="100" y="22" font-size="12" fill="var(--warn)">ssthresh</text>
      <text x="740" y="240" font-size="12" fill="var(--muted)" text-anchor="end">RTT →</text>
    </svg>
    <div class="w-out">{{ sel ? `RTT ${sel.t}: cwnd=${sel.cwnd}, ssthresh=${sel.ss}, ${sel.ev ? sel.ev + '! ' + (sel.ev === 'timeout' ? 'Severe: cwnd collapses to 1, back to slow start.' : algo === 'reno' ? 'Fast recovery: cwnd = ssthresh = cwnd/2 (multiplicative decrease).' : 'Tahoe: cwnd → 1 even on dup ACKs.') : sel.phase}` : 'Hover the curve.' }}</div>
  </div>
</template>
