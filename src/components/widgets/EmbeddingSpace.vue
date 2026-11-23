<script setup>
// 2-D projection of a toy embedding space. Type a query → nearest neighbors by cosine similarity → top-k chunks (RAG retrieval).
import { ref, computed } from 'vue'
const DOCS = [
  ['Reset your password from the login page', [.9, .8]], ['Two-factor authentication setup', [.75, .95]], ['Change the email on your account', [.6, .7]],
  ['Refunds are issued within 14 days', [-.8, .6]], ['How billing cycles work', [-.9, .3]], ['Update your credit card', [-.6, .45]],
  ['Kubernetes pods restart on OOM', [.2, -.9]], ['Docker image layers explained', [.45, -.8]], ['Scaling the API with autoscaling', [-.1, -.85]],
  ['Our office dog is called Biscuit', [-.85, -.7]], ['Team offsite photos', [-.7, -.9]],
]
const VOCAB = { password: [.9, .8], login: [.85, .7], account: [.6, .7], '2fa': [.75, .95], auth: [.8, .9], refund: [-.8, .6], money: [-.85, .45], billing: [-.9, .3], card: [-.6, .45], pay: [-.75, .4],
  container: [.3, -.85], kubernetes: [.2, -.9], docker: [.45, -.8], scale: [-.1, -.85], crash: [.2, -.8], dog: [-.85, -.7], photo: [-.7, -.9] }
const q = ref('I forgot my login password'), k = ref(3)
const qv = computed(() => { let v = [0, 0], n = 0; for (const w of q.value.toLowerCase().split(/\W+/)) for (const key in VOCAB) if (w.startsWith(key.slice(0, 4))) { v = [v[0] + VOCAB[key][0], v[1] + VOCAB[key][1]]; n++ } return n ? [v[0] / n, v[1] / n] : [0.01, 0.01] })
const cos = (a, b) => (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b) || 1)
const ranked = computed(() => DOCS.map(([t, v]) => ({ t, v, s: cos(qv.value, v) })).sort((a, b) => b.s - a.s))
const X = x => 200 + x * 170, Y = y => 200 - y * 170
</script>

<template>
  <div>
    <div class="w-title">Embedding space & vector search</div>
    <p class="w-sub">Documents are points; meaning ≈ direction. The query is embedded into the same space and the top-k by cosine similarity are retrieved.</p>
    <div class="w-row"><input v-model="q" style="flex:1;min-width:260px" /><label>top-k <input type="range" min="1" max="6" v-model.number="k" /> {{ k }}</label>
      <button class="btn ghost small" v-for="s in ['how do I get my money back', 'my container keeps crashing', 'pictures of the dog']" :key="s" @click="q = s">{{ s }}</button></div>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <svg viewBox="0 0 400 400" style="width:min(100%,380px)">
        <circle cx="200" cy="200" r="170" fill="none" stroke="var(--line)" /><line x1="20" y1="200" x2="380" y2="200" stroke="var(--line)" /><line x1="200" y1="20" x2="200" y2="380" stroke="var(--line)" />
        <line v-for="r in ranked.slice(0, k)" :key="'l' + r.t" x1="200" y1="200" :x2="X(r.v[0])" :y2="Y(r.v[1])" stroke="var(--ok)" stroke-dasharray="4 3" />
        <g v-for="(r, i) in ranked" :key="r.t"><circle :cx="X(r.v[0])" :cy="Y(r.v[1])" r="7" :fill="i < k ? 'var(--ok)' : 'var(--accent)'" /><title>{{ r.t }} ({{ r.s.toFixed(2) }})</title></g>
        <line x1="200" y1="200" :x2="X(qv[0] / (Math.hypot(...qv) || 1))" :y2="Y(qv[1] / (Math.hypot(...qv) || 1))" stroke="var(--bad)" stroke-width="3" />
        <circle :cx="X(qv[0] / (Math.hypot(...qv) || 1))" :cy="Y(qv[1] / (Math.hypot(...qv) || 1))" r="9" fill="var(--bad)" />
      </svg>
      <div style="flex:1;min-width:240px" class="w-out"><b>Retrieved chunks → stuffed into the LLM prompt:</b>
        <div v-for="(r, i) in ranked" :key="r.t" :style="{ opacity: i < k ? 1 : .4, margin: '4px 0' }"><span class="mono">{{ r.s.toFixed(2) }}</span>  {{ r.t }}</div></div>
    </div>
  </div>
</template>
