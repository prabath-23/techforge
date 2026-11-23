<script setup>
// CPU scheduling simulator: FCFS, SJF, SRTF, Round Robin, Priority. Editable workload, Gantt chart, metrics.
import { ref, computed } from 'vue'
const jobs = ref([{ id: 'P1', arrival: 0, burst: 7, prio: 3 }, { id: 'P2', arrival: 2, burst: 4, prio: 1 }, { id: 'P3', arrival: 4, burst: 1, prio: 4 }, { id: 'P4', arrival: 5, burst: 4, prio: 2 }])
const algo = ref('RR'), quantum = ref(2), ctxCost = ref(0)
const COL = ['#6366f1', '#0ea5e9', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444']
function simulate() {
  const js = jobs.value.map((j, i) => ({ ...j, rem: +j.burst, color: COL[i % 8] })), gantt = []; let t = 0, done = 0, last = null; const q = []; const fin = {}, start = {}
  const arrived = () => js.filter(j => j.arrival <= t && j.rem > 0)
  const queueIn = () => js.forEach(j => { if (j.arrival <= t && j.rem > 0 && !j.inQ) { q.push(j); j.inQ = true } })
  while (done < js.length && t < 500) {
    let pick, run
    if (algo.value === 'RR') { queueIn(); pick = q.shift(); if (pick) run = Math.min(quantum.value, pick.rem) }
    else { const a = arrived(); if (a.length) {
      if (algo.value === 'FCFS') pick = last?.rem > 0 ? last : a.sort((x, y) => x.arrival - y.arrival)[0]
      if (algo.value === 'SJF') pick = last?.rem > 0 ? last : a.sort((x, y) => x.burst - y.burst || x.arrival - y.arrival)[0]
      if (algo.value === 'SRTF') pick = a.sort((x, y) => x.rem - y.rem || x.arrival - y.arrival)[0]
      if (algo.value === 'PRIO') pick = a.sort((x, y) => x.prio - y.prio || x.arrival - y.arrival)[0]
      run = ['SRTF', 'PRIO'].includes(algo.value) ? 1 : pick.rem } }
    if (!pick) { gantt.push({ id: 'idle', s: t, e: t + 1, color: 'var(--line)' }); t++; continue }
    if (last && last !== pick && ctxCost.value > 0) { gantt.push({ id: 'cs', s: t, e: t + ctxCost.value, color: 'var(--bad)' }); t += ctxCost.value }
    start[pick.id] ??= t
    const prev = gantt.at(-1); if (prev && prev.id === pick.id && prev.e === t) prev.e += run; else gantt.push({ id: pick.id, s: t, e: t + run, color: pick.color })
    t += run; pick.rem -= run; last = pick
    if (algo.value === 'RR') { queueIn(); if (pick.rem > 0) q.push(pick) }
    if (pick.rem === 0) { fin[pick.id] = t; done++ }
  }
  const rows = js.map(j => ({ id: j.id, color: j.color, turnaround: fin[j.id] - j.arrival, waiting: fin[j.id] - j.arrival - j.burst, response: start[j.id] - j.arrival }))
  const avg = k => (rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(2)
  return { gantt, rows, end: t, avgT: avg('turnaround'), avgW: avg('waiting'), avgR: avg('response'), switches: gantt.filter(g => g.id === 'cs').length }
}
const r = computed(simulate)
const add = () => jobs.value.push({ id: 'P' + (jobs.value.length + 1), arrival: Math.floor(Math.random() * 8), burst: 1 + Math.floor(Math.random() * 8), prio: 1 + Math.floor(Math.random() * 5) })
</script>

<template>
  <div>
    <div class="w-title">CPU scheduler simulator</div>
    <p class="w-sub">Edit the workload, switch algorithms, and compare waiting/response time. Add a context-switch cost to see why tiny quanta hurt.</p>
    <div class="w-row">
      <button v-for="a in ['FCFS', 'SJF', 'SRTF', 'RR', 'PRIO']" :key="a" class="chip-btn" :class="{ on: algo === a }" @click="algo = a">{{ { FCFS: 'FCFS', SJF: 'SJF (non-preemptive)', SRTF: 'SRTF (preemptive SJF)', RR: 'Round Robin', PRIO: 'Priority (preemptive)' }[a] }}</button>
    </div>
    <div class="w-row">
      <label v-if="algo === 'RR'">Quantum <input v-model.number="quantum" type="number" min="1" max="10" style="width:60px" /></label>
      <label>Context switch cost <input v-model.number="ctxCost" type="number" min="0" max="3" style="width:60px" /></label>
    </div>
    <table class="mono" style="font-size:13px;border-collapse:collapse;margin:8px 0"><tbody>
      <tr><th style="padding:4px 8px">Proc</th><th>Arrival</th><th>Burst</th><th>Priority</th><th></th></tr>
      <tr v-for="(j, i) in jobs" :key="i">
        <td style="padding:2px 8px"><b :style="{ color: COL[i % 8] }">{{ j.id }}</b></td>
        <td><input v-model.number="j.arrival" type="number" min="0" style="width:56px" /></td>
        <td><input v-model.number="j.burst" type="number" min="1" style="width:56px" /></td>
        <td><input v-model.number="j.prio" type="number" min="1" style="width:56px" /></td>
        <td><button class="link" @click="jobs.splice(i, 1)" v-if="jobs.length > 1">remove</button></td>
      </tr>
    </tbody></table>
    <button class="btn ghost small" @click="add" v-if="jobs.length < 8">+ Add process</button>
    <svg :viewBox="`0 0 760 70`" class="w-svg" style="margin-top:12px">
      <g v-for="(g, i) in r.gantt" :key="i">
        <rect :x="10 + g.s * 740 / r.end" y="6" :width="(g.e - g.s) * 740 / r.end" height="36" :fill="g.color" stroke="var(--panel)" />
        <text v-if="g.id !== 'idle'" :x="10 + (g.s + g.e) / 2 * 740 / r.end" y="29" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">{{ g.id === 'cs' ? '⇄' : g.id }}</text>
        <text :x="10 + g.s * 740 / r.end" y="60" font-size="11" fill="var(--muted)" text-anchor="middle">{{ g.s }}</text>
      </g>
      <text x="750" y="60" font-size="11" fill="var(--muted)" text-anchor="end">{{ r.end }}</text>
    </svg>
    <div class="w-out mono" style="font-size:13px">
      <div v-for="row in r.rows" :key="row.id"><b :style="{ color: row.color }">{{ row.id }}</b> turnaround={{ row.turnaround }} waiting={{ row.waiting }} response={{ row.response }}</div>
      <div style="margin-top:6px"><b>Avg turnaround {{ r.avgT }} · Avg waiting {{ r.avgW }} · Avg response {{ r.avgR }}</b> · context switches: {{ r.switches }}</div>
    </div>
  </div>
</template>
