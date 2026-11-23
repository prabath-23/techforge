<script setup>
// Kubernetes control loop: Deployment desired replicas vs actual pods across nodes; kill pods/nodes; rolling update.
import { ref, onUnmounted } from 'vue'
const desired = ref(4), version = ref('v1'), nodes = ref([{ name: 'node-a', up: true }, { name: 'node-b', up: true }, { name: 'node-c', up: true }])
const pods = ref([]), events = ref([]), maxSurge = 1, maxUnavail = 1; let seq = 0
const ev = s => { events.value.unshift(s); events.value = events.value.slice(0, 10) }
function reconcile() {
  // 1. pods on dead nodes are lost
  pods.value = pods.value.filter(p => { const ok = nodes.value.find(n => n.name === p.node).up; if (!ok) ev(`${p.name} lost (node ${p.node} NotReady)`); return ok })
  pods.value.forEach(p => { if (p.phase === 'Pending') p.phase = 'ContainerCreating'; else if (p.phase === 'ContainerCreating') { p.phase = 'Running'; ev(`${p.name} Running (readiness probe passed)`) } })
  const live = pods.value.filter(p => p.phase !== 'Terminating'), cur = live.filter(p => p.v === version.value), old = live.filter(p => p.v !== version.value)
  pods.value = pods.value.filter(p => p.phase !== 'Terminating' || (p.ttl-- > 0))
  const up = nodes.value.filter(n => n.up); if (!up.length) return ev('No schedulable nodes — pods stay Pending')
  const create = () => { const node = up.map(n => [n, pods.value.filter(p => p.node === n.name).length]).sort((a, b) => a[1] - b[1])[0][0]
    const p = { name: `web-${version.value}-${(++seq).toString(36)}`, v: version.value, node: node.name, phase: 'Pending' }; pods.value.push(p); ev(`scheduler: ${p.name} → ${node.name} (least loaded)`) }
  if (old.length) { // rolling update
    if (live.length < desired.value + maxSurge) create()
    const readyNew = cur.filter(p => p.phase === 'Running').length; const victim = old[0]
    if (victim && (readyNew > 0 || live.length > desired.value - maxUnavail) && live.length > desired.value - maxUnavail) { victim.phase = 'Terminating'; victim.ttl = 1; ev(`rolling update: terminate ${victim.name}`) }
    return }
  if (cur.length < desired.value) create()
  if (cur.length > desired.value) { const p = cur.at(-1); p.phase = 'Terminating'; p.ttl = 1; ev(`scale down: terminate ${p.name}`) }
}
const t = setInterval(reconcile, 900); onUnmounted(() => clearInterval(t))
const killPod = p => { pods.value = pods.value.filter(x => x !== p); ev(`${p.name} crashed — controller notices actual (${pods.value.length}) ≠ desired (${desired.value})`) }
const COL = { Running: 'var(--ok)', Pending: 'var(--muted)', ContainerCreating: 'var(--warn)', Terminating: 'var(--bad)' }
</script>

<template>
  <div>
    <div class="w-title">Kubernetes reconciliation loop</div>
    <p class="w-sub">You declare the desired state; controllers continuously drive actual state toward it. Kill pods, take nodes down, scale, or roll out a new version.</p>
    <div class="w-row"><label>replicas <input type="range" min="0" max="9" v-model.number="desired" /> {{ desired }}</label>
      <button class="btn small" @click="version = version === 'v1' ? 'v2' : 'v1'; ev(`kubectl set image → ${version}: rolling update begins (maxSurge 1, maxUnavailable 1)`)">Deploy {{ version === 'v1' ? 'v2' : 'v1' }}</button></div>
    <div class="mono w-out" style="font-size:12.5px">spec: <b>replicas={{ desired }} image=web:{{ version }}</b> · status: {{ pods.filter(p => p.phase === 'Running').length }} ready / {{ pods.length }} total</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:10px">
      <div v-for="n in nodes" :key="n.name" :style="{ border: '2px ' + (n.up ? 'solid var(--nodeLine)' : 'dashed var(--bad)'), borderRadius: '12px', padding: '10px', opacity: n.up ? 1 : .6 }">
        <div style="display:flex;justify-content:space-between"><b>{{ n.name }}</b><button class="link" @click="n.up = !n.up; ev(`${n.name} ${n.up ? 'Ready' : 'NotReady (kubelet stopped heartbeating)'}`)">{{ n.up ? 'take down' : 'bring up' }}</button></div>
        <div v-for="p in pods.filter(p => p.node === n.name)" :key="p.name" @click="killPod(p)" :title="'click to crash'" class="mono"
          :style="{ cursor: 'pointer', margin: '5px 0', padding: '5px 8px', borderRadius: '6px', fontSize: '12px', background: 'color-mix(in srgb,' + COL[p.phase] + ' 25%,transparent)', borderLeft: '4px solid ' + COL[p.phase] }">{{ p.name }} · {{ p.phase }}</div>
      </div>
    </div>
    <div class="w-out mono" style="font-size:12px"><div v-for="(e, i) in events" :key="i" :style="{ opacity: 1 - i * .08 }">{{ e }}</div></div>
  </div>
</template>
