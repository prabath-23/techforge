<script setup>
// Two threads run `counter++` compiled to LOAD / ADD / STORE. You choose the interleaving.
import { ref, computed } from 'vue'
const useLock = ref(false)
const mem = ref(0), lockOwner = ref(null), history = ref([])
const mk = () => ({ pc: 0, reg: null, iters: 0 })
const th = ref([mk(), mk()])
const ITERS = 2
const prog = computed(() => useLock.value ? ['lock()', 'LOAD r ← counter', 'ADD r ← r + 1', 'STORE counter ← r', 'unlock()'] : ['LOAD r ← counter', 'ADD r ← r + 1', 'STORE counter ← r'])
function stepT(i) {
  const t = th.value[i]; if (t.iters >= ITERS) return
  const ins = prog.value[t.pc]
  if (ins === 'lock()') { if (lockOwner.value !== null && lockOwner.value !== i) { history.value.push(`T${i + 1}: lock() blocked — T${lockOwner.value + 1} holds it (thread sleeps on futex)`); return } lockOwner.value = i }
  if (ins === 'unlock()') lockOwner.value = null
  if (ins.startsWith('LOAD')) t.reg = mem.value
  if (ins.startsWith('ADD')) t.reg++
  if (ins.startsWith('STORE')) mem.value = t.reg
  history.value.push(`T${i + 1}: ${ins}${t.reg !== null && !ins.includes('lock') ? `   (r=${t.reg}, counter=${mem.value})` : ''}`)
  t.pc++; if (t.pc >= prog.value.length) { t.pc = 0; t.iters++; t.reg = null }
}
const reset = () => { mem.value = 0; lockOwner.value = null; history.value = []; th.value = [mk(), mk()] }
const finished = computed(() => th.value.every(t => t.iters >= ITERS))
const evil = () => { reset(); for (const i of [0, 1, 0, 1, 0, 1]) stepT(i) }
</script>

<template>
  <div>
    <div class="w-title">Race condition lab</div>
    <p class="w-sub">Each thread does <code>counter++</code> {{ ITERS }} times. Expected final value: {{ 2 * ITERS }}. You are the scheduler: choose which thread runs the next instruction.</p>
    <div class="w-row"><label><input type="checkbox" v-model="useLock" @change="reset" /> Protect with a mutex</label>
      <button class="btn ghost small" @click="evil" v-if="!useLock">Show a lost update</button><button class="btn ghost small" @click="reset">Reset</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div v-for="(t, i) in th" :key="i" class="w-out mono" style="font-size:13px">
        <b>Thread {{ i + 1 }}</b> · iter {{ Math.min(t.iters + 1, ITERS) }}/{{ ITERS }} · r = {{ t.reg ?? '—' }}
        <div v-for="(ins, k) in prog" :key="k" :style="{ color: k === t.pc && t.iters < ITERS ? 'var(--accent)' : 'var(--muted)', fontWeight: k === t.pc ? 800 : 400 }">{{ k === t.pc && t.iters < ITERS ? '▶' : ' ' }} {{ ins }}</div>
        <button class="btn small" style="margin-top:8px" :disabled="t.iters >= ITERS" @click="stepT(i)">Run T{{ i + 1 }} one step</button>
      </div>
    </div>
    <div class="w-out"><b style="font-size:18px">counter = {{ mem }}</b> <span v-if="lockOwner !== null">· lock held by T{{ lockOwner + 1 }}</span>
      <span v-if="finished" :style="{ color: mem === 2 * ITERS ? 'var(--ok)' : 'var(--bad)', fontWeight: 700 }"> — {{ mem === 2 * ITERS ? 'correct' : `LOST ${2 * ITERS - mem} UPDATE(S): both threads loaded the same old value` }}</span>
      <div class="mono" style="font-size:12px;max-height:150px;overflow:auto;margin-top:6px"><div v-for="(h, i) in history" :key="i">{{ h }}</div></div></div>
  </div>
</template>
