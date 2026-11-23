<script setup>
// Toy self-attention: Q·Kᵀ/√d → softmax → weights over tokens. Hand-built 4-d embeddings so the pattern is interpretable.
import { ref, computed } from 'vue'
const sentence = ref('the animal did not cross the street because it was tired')
const causal = ref(true), temp = ref(1), focus = ref(8)
// tiny semantic features: [animate, place, pronoun/reference, verb-ness]
const E = { the: [0, 0, 0, 0], animal: [1, 0, .2, 0], street: [0, 1, 0, 0], it: [.7, .5, 1, 0], tired: [.9, 0, .3, .4], wide: [0, .9, .3, .4], cross: [0, .2, 0, 1], did: [0, 0, 0, .8], not: [0, 0, 0, .3], because: [0, 0, .1, .1], was: [0, 0, .1, .7], cat: [1, 0, .2, 0], road: [0, 1, 0, 0] }
const emb = t => E[t] || [Math.sin(t.length), Math.cos(t.length), .1, .1]
const toks = computed(() => sentence.value.toLowerCase().split(/\s+/).filter(Boolean))
const W = computed(() => { const T = toks.value, d = 4, ctx = T.indexOf('tired') >= 0 ? emb('tired') : T.indexOf('wide') >= 0 ? emb('wide') : [0, 0, 0, 0]
  return T.map((q, i) => { const Q = emb(q).map((v, k) => v + (q === 'it' ? ctx[k] * .8 : 0))
    const s = T.map((kk, j) => (causal.value && j > i) ? -Infinity : Q.reduce((a, v, k) => a + v * emb(kk)[k], 0) / Math.sqrt(d) / temp.value + (j === i ? .05 : 0))
    const m = Math.max(...s), ex = s.map(x => Math.exp(x - m)), Z = ex.reduce((a, b) => a + b, 0); return ex.map(x => x / Z) }) })
</script>

<template>
  <div>
    <div class="w-title">Self-attention, visualized</div>
    <p class="w-sub">Each row is a query token; cells show how much it attends to each key token (softmax of Q·Kᵀ/√d). Click a row. Change “tired” to “wide” and watch where <b>it</b> looks.</p>
    <div class="w-row"><input v-model="sentence" style="flex:1;min-width:280px" />
      <label><input type="checkbox" v-model="causal" /> causal mask (decoder / GPT)</label><label>temperature <input type="range" min="0.2" max="3" step="0.1" v-model.number="temp" /> {{ temp }}</label></div>
    <div style="overflow-x:auto"><table class="mono" style="border-collapse:collapse;font-size:12px"><tbody>
      <tr><td></td><td v-for="(t, j) in toks" :key="j" style="writing-mode:vertical-rl;transform:rotate(180deg);padding:4px;height:70px">{{ t }}</td></tr>
      <tr v-for="(row, i) in W" :key="i" @click="focus = i" style="cursor:pointer"><td :style="{ padding: '2px 8px', fontWeight: focus === i ? 800 : 400, color: focus === i ? 'var(--accent)' : 'var(--text)' }">{{ toks[i] }}</td>
        <td v-for="(w, j) in row" :key="j" :title="w.toFixed(3)" :style="{ width: '28px', height: '24px', background: `rgba(99,102,241,${w})`, border: focus === i ? '1px solid var(--accent)' : '1px solid var(--line)' }"></td></tr>
    </tbody></table></div>
    <div class="w-out" v-if="W[focus]">Query “<b>{{ toks[focus] }}</b>” attends most to: <span v-for="[t, w] in toks.map((t, j) => [t + '#' + j, W[focus][j]]).sort((a, b) => b[1] - a[1]).slice(0, 3)" :key="t" class="chip">{{ t.split('#')[0] }} {{ (w * 100).toFixed(0) }}%</span>
      <br /><span class="meta">Its output = weighted sum of the value vectors with these weights. Real models run many heads in parallel, each learning different relations.</span></div>
  </div>
</template>
