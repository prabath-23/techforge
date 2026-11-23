<script setup>
// Sequence diagram player. actors: ["Client","Server"], msgs: [[fromIdx, toIdx, "label", "explanation"], ...]
// from === to renders a self-note (local processing).
import { ref, computed, onUnmounted } from 'vue'
const p = defineProps({ title: String, actors: Array, msgs: Array })
const shown = ref(0); let timer = null; const playing = ref(false)
const W = 760, top = 50, gap = 54
const xs = computed(() => p.actors.map((_, i) => 80 + i * (W - 160) / Math.max(1, p.actors.length - 1)))
const H = computed(() => top + p.msgs.length * gap + 30)
const stop = () => { clearInterval(timer); playing.value = false }
const play = () => { if (playing.value) return stop(); if (shown.value >= p.msgs.length) shown.value = 0; playing.value = true
  timer = setInterval(() => shown.value >= p.msgs.length ? stop() : shown.value++, 1500) }
onUnmounted(stop)
const uid = Math.random().toString(36).slice(2)
</script>

<template>
  <div>
    <div class="w-title">{{ title || 'Sequence diagram' }}</div>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-svg">
      <defs><marker :id="'s' + uid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)" /></marker></defs>
      <g v-for="(a, i) in actors" :key="a">
        <rect :x="xs[i] - 70" y="4" width="140" height="32" rx="8" fill="var(--node)" stroke="var(--nodeLine)" />
        <text :x="xs[i]" y="25" text-anchor="middle" font-weight="700" font-size="14" fill="var(--text)">{{ a }}</text>
        <line :x1="xs[i]" :y1="36" :x2="xs[i]" :y2="H - 6" stroke="var(--line)" stroke-width="3" stroke-dasharray="6 5" />
      </g>
      <g v-for="(m, i) in msgs.slice(0, shown)" :key="i" @click="stop(); shown = i + 1" style="cursor:pointer">
        <template v-if="m[0] !== m[1]">
          <line :x1="xs[m[0]]" :y1="top + i * gap + 14" :x2="xs[m[1]] + (m[1] > m[0] ? -4 : 4)" :y2="top + i * gap + 30" :stroke="i === shown - 1 ? 'var(--accent)' : 'var(--muted)'" stroke-width="2.2" :marker-end="`url(#s${uid})`" />
          <text :x="(xs[m[0]] + xs[m[1]]) / 2" :y="top + i * gap + 14" text-anchor="middle" font-size="13" font-weight="600" class="mono" :fill="i === shown - 1 ? 'var(--accent)' : 'var(--text)'">{{ m[2] }}</text>
        </template>
        <template v-else>
          <rect :x="xs[m[0]] - 110" :y="top + i * gap + 6" width="220" height="30" rx="6" :fill="i === shown - 1 ? 'var(--accent)' : 'var(--soft)'" />
          <text :x="xs[m[0]]" :y="top + i * gap + 26" text-anchor="middle" font-size="12.5" :fill="i === shown - 1 ? '#fff' : 'var(--text)'">{{ m[2] }}</text>
        </template>
      </g>
    </svg>
    <div class="w-out w-explain"><template v-if="shown"><span class="step-count">Message {{ shown }} of {{ msgs.length }}</span><b class="mono">{{ msgs[shown - 1][2] }}</b><div style="margin-top:6px" v-html="msgs[shown - 1][3]"></div></template><em v-else>Press Step or Play to send the first message.</em></div>
    <div class="w-row" style="justify-content:center">
      <button class="btn ghost small" @click="stop(); shown = Math.max(0, shown - 1)">Back</button>
      <button class="btn small" @click="play">{{ playing ? 'Pause' : 'Play' }}</button>
      <button class="btn ghost small" @click="stop(); shown = Math.min(msgs.length, shown + 1)">Step</button>
      <button class="btn ghost small" @click="stop(); shown = 0">Reset</button>
    </div>
  </div>
</template>
