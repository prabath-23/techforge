<script setup>
// Simplified Raft: randomized election timeouts, RequestVote, heartbeats, log replication with majority commit.
import { ref, onUnmounted } from 'vue'
const N = 5
const mk = i => ({ id: i, role: 'follower', term: 0, votedFor: null, timeout: 150 + Math.random() * 150, elapsed: 0, log: [], alive: true, votes: 0 })
const nodes = ref([...Array(N)].map((_, i) => mk(i))), events = ref([]), commit = ref(0), msgs = ref([]), tick = ref(0)
const ev = s => { events.value.unshift(`t=${tick.value}: ${s}`); events.value = events.value.slice(0, 12) }
const leader = () => nodes.value.find(n => n.role === 'leader' && n.alive)
function send(from, to, kind) { msgs.value.push({ from, to, kind, p: 0 }) }
function step() {
  tick.value += 10
  msgs.value.forEach(m => (m.p += 0.25)); const arrived = msgs.value.filter(m => m.p >= 1); msgs.value = msgs.value.filter(m => m.p < 1)
  for (const m of arrived) { const a = nodes.value[m.from], b = nodes.value[m.to]; if (!b.alive) continue
    if (m.kind === 'vote?') { if (m.term > b.term) { b.term = m.term; b.role = 'follower'; b.votedFor = null }
      if (m.term === b.term && (b.votedFor === null || b.votedFor === a.id) && m.logLen >= b.log.length) { b.votedFor = a.id; b.elapsed = 0; send(b.id, a.id, 'voteok'); msgs.value.at(-1).term = b.term } }
    if (m.kind === 'voteok' && a.alive && b.role === 'candidate' && m.term === b.term) { b.votes++; if (b.votes > N / 2) { b.role = 'leader'; ev(`Node ${b.id} wins election for term ${b.term} with ${b.votes} votes`) } }
    if (m.kind === 'append') { if (m.term >= b.term) { b.term = m.term; b.role = 'follower'; b.elapsed = 0; b.log = [...m.log] ; send(b.id, a.id, 'ack'); msgs.value.at(-1).len = b.log.length } }
    if (m.kind === 'ack' && b.role === 'leader') { const acks = nodes.value.filter(n => n.alive && n.log.length >= m.len).length; if (acks > N / 2 && m.len > commit.value) { commit.value = m.len; ev(`Entry ${m.len} replicated on majority (${acks}/${N}) → COMMITTED`) } } }
  for (const n of nodes.value) { if (!n.alive) continue
    if (n.role === 'leader') { if (tick.value % 60 === 0) nodes.value.forEach(o => o.id !== n.id && (send(n.id, o.id, 'append'), Object.assign(msgs.value.at(-1), { term: n.term, log: n.log }))); continue }
    n.elapsed += 10
    if (n.elapsed >= n.timeout) { n.role = 'candidate'; n.term++; n.votedFor = n.id; n.votes = 1; n.elapsed = 0; n.timeout = 150 + Math.random() * 150
      ev(`Node ${n.id} timed out → candidate for term ${n.term}`); nodes.value.forEach(o => o.id !== n.id && (send(n.id, o.id, 'vote?'), Object.assign(msgs.value.at(-1), { term: n.term, logLen: n.log.length }))) } }
}
let timer = setInterval(step, 120); const running = ref(true)
const toggle = () => { running.value ? clearInterval(timer) : (timer = setInterval(step, 120)); running.value = !running.value }
onUnmounted(() => clearInterval(timer))
const write = () => { const l = leader(); if (!l) return ev('No leader, client write rejected (unavailable during election)'); l.log.push('x=' + Math.floor(Math.random() * 100)); ev(`Client write appended to leader ${l.id}'s log at index ${l.log.length}`) }
const kill = n => { n.alive = !n.alive; if (!n.alive) { ev(`Node ${n.id} crashed${n.role === 'leader' ? ' (was leader!)' : ''}`); n.role = 'follower' } else { n.elapsed = 0; ev(`Node ${n.id} restarted`) } }
const P = i => [380 + 230 * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / N), 170 + 130 * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / N)]
const COL = { leader: 'var(--ok)', candidate: 'var(--warn)', follower: 'var(--node)' }
</script>

<template>
  <div>
    <div class="w-title">Raft consensus (5 nodes)</div>
    <p class="w-sub">Click a node to crash/restart it. Kill the leader and watch a new election. Writes commit only when a majority has them.</p>
    <div class="w-row"><button class="btn small" @click="write">Client write</button><button class="btn ghost small" @click="toggle">{{ running ? 'Pause' : 'Resume' }}</button></div>
    <svg viewBox="0 0 760 340" class="w-svg">
      <circle v-for="(m, i) in msgs" :key="i" :cx="P(m.from)[0] + (P(m.to)[0] - P(m.from)[0]) * m.p" :cy="P(m.from)[1] + (P(m.to)[1] - P(m.from)[1]) * m.p" r="5"
        :fill="m.kind === 'append' ? 'var(--ok)' : m.kind.startsWith('vote') ? 'var(--warn)' : 'var(--accent-2)'" />
      <g v-for="(n, i) in nodes" :key="i" @click="kill(n)" style="cursor:pointer">
        <circle :cx="P(i)[0]" :cy="P(i)[1]" r="38" :fill="n.alive ? COL[n.role] : 'var(--soft)'" stroke="var(--nodeLine)" stroke-width="2" :stroke-dasharray="n.alive ? '' : '5 4'" />
        <circle v-if="n.alive && n.role !== 'leader'" :cx="P(i)[0]" :cy="P(i)[1]" r="44" fill="none" stroke="var(--accent)" stroke-width="3" :stroke-dasharray="`${276 * n.elapsed / n.timeout} 400`" opacity=".6" />
        <text :x="P(i)[0]" :y="P(i)[1] - 6" text-anchor="middle" font-weight="800" font-size="14" fill="var(--text)">S{{ i }}{{ n.alive ? '' : ' (down)' }}</text>
        <text :x="P(i)[0]" :y="P(i)[1] + 10" text-anchor="middle" font-size="11" fill="var(--text)">{{ n.role }} · T{{ n.term }}</text>
        <text :x="P(i)[0]" :y="P(i)[1] + 60" text-anchor="middle" font-size="11" class="mono" fill="var(--muted)">log[{{ n.log.length }}]</text>
      </g>
    </svg>
    <div class="w-out mono" style="font-size:12.5px"><b>commit index = {{ commit }}</b> · green = append/heartbeat · amber = vote · cyan = ack · ring = election timer
      <div v-for="(e, i) in events" :key="i" :style="{ opacity: 1 - i * .07 }">{{ e }}</div></div>
  </div>
</template>
