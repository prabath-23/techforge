<script setup>
// Consistent hashing ring with virtual nodes, compared against mod-N placement.
import { ref, computed } from 'vue'
const servers = ref(['A', 'B', 'C']), vnodes = ref(1), prev = ref(null), next = ref(3)
const KEYS = [...Array(60)].map((_, i) => 'user:' + i)
const h = s => { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) } return (x >>> 0) / 4294967296 }
const COLORS = ['#6366f1', '#0ea5e9', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444']
const pts = computed(() => servers.value.flatMap((s, si) => [...Array(vnodes.value)].map((_, v) => ({ s, si, a: h(s + '#' + v) }))).sort((a, b) => a.a - b.a))
const owner = a => (pts.value.find(p => p.a >= a) || pts.value[0])
const map = computed(() => Object.fromEntries(KEYS.map(k => [k, owner(h(k)).s])))
const modMap = computed(() => Object.fromEntries(KEYS.map(k => [k, servers.value[Math.floor(h(k) * 1e6) % servers.value.length]])))
const moved = computed(() => prev.value ? KEYS.filter(k => prev.value.ring[k] !== map.value[k]).length : null)
const movedMod = computed(() => prev.value ? KEYS.filter(k => prev.value.mod[k] !== modMap.value[k]).length : null)
const snap = () => (prev.value = { ring: { ...map.value }, mod: { ...modMap.value } })
const add = () => { if (servers.value.length >= 8) return; snap(); servers.value.push('ABCDEFGHIJ'[next.value++]) }
const remove = s => { if (servers.value.length <= 1) return; snap(); servers.value = servers.value.filter(x => x !== s) }
const xy = (a, r) => [200 + r * Math.sin(a * 2 * Math.PI), 200 - r * Math.cos(a * 2 * Math.PI)]
const color = s => COLORS[('ABCDEFGHIJ'.indexOf(s)) % 8]
const load = computed(() => servers.value.map(s => [s, KEYS.filter(k => map.value[k] === s).length]))
</script>

<template>
  <div>
    <div class="w-title">Consistent hashing</div>
    <p class="w-sub">Keys walk clockwise to the first server point. Add/remove servers and compare how many keys move vs. <code>hash % N</code>.</p>
    <div class="w-row"><button class="btn small" @click="add">+ add server</button>
      <button v-for="s in servers" :key="s" class="chip-btn" @click="remove(s)" :style="{ borderColor: color(s) }">remove {{ s }}</button>
      <label>virtual nodes/server <input type="range" min="1" max="20" v-model.number="vnodes" @input="prev = null" /> {{ vnodes }}</label></div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
      <svg viewBox="0 0 400 400" style="width:min(100%,380px)">
        <circle cx="200" cy="200" r="150" fill="none" stroke="var(--line)" stroke-width="10" />
        <circle v-for="k in KEYS" :key="k" :cx="xy(h(k), 150)[0]" :cy="xy(h(k), 150)[1]" r="4.5" :fill="color(map[k])" :stroke="prev && prev.ring[k] !== map[k] ? 'var(--text)' : 'none'" stroke-width="2"><title>{{ k }} → {{ map[k] }}</title></circle>
        <g v-for="(p, i) in pts" :key="i"><rect :x="xy(p.a, 150)[0] - 7" :y="xy(p.a, 150)[1] - 7" width="14" height="14" rx="3" :fill="color(p.s)" stroke="var(--panel)" stroke-width="2" />
          <text v-if="vnodes <= 3" :x="xy(p.a, 178)[0]" :y="xy(p.a, 178)[1] + 4" text-anchor="middle" font-size="12" font-weight="800" fill="var(--text)">{{ p.s }}</text></g>
      </svg>
      <div class="w-out" style="flex:1;min-width:220px">
        <div v-for="[s, n] in load" :key="s" style="display:flex;align-items:center;gap:8px;margin:3px 0"><b :style="{ color: color(s), width: '18px' }">{{ s }}</b>
          <div :style="{ height: '12px', width: n * 4 + 'px', background: color(s), borderRadius: '3px' }"></div><span class="mono">{{ n }}</span></div>
        <p v-if="moved !== null"><b>Consistent hashing moved {{ moved }}/{{ KEYS.length }} keys</b> (outlined).<br />hash % N would have moved <b>{{ movedMod }}</b>.</p>
        <p class="meta">Ideal load: {{ (KEYS.length / servers.length).toFixed(1) }}/server. Raise virtual nodes to even it out.</p>
      </div>
    </div>
  </div>
</template>
