<script setup>
import { ref } from 'vue'
import { state } from '../lib/progress.js'
import Icon from './Icon.vue'
const props = defineProps({ q: String, options: Array, answer: Number, explain: String, id: String })
const picked = ref(null)
const DAY = 864e5, GAPS = [1, 3, 7, 16]
// Spaced review: a miss enters the review deck; correct answers push it further out, then retire it.
const pick = i => {
  if (picked.value !== null) return
  picked.value = i; const ok = i === props.answer; state.quiz[props.id] = ok
  if (!props.id) return
  const r = state.review[props.id]
  if (!ok) state.review[props.id] = { q: props.q, options: props.options, answer: props.answer, explain: props.explain, box: 0, due: Date.now() + DAY }
  else if (r) { if (r.box + 1 >= GAPS.length) delete state.review[props.id]; else state.review[props.id] = { ...r, box: r.box + 1, due: Date.now() + GAPS[r.box + 1] * DAY } }
}
</script>

<template>
  <div class="quiz">
    <span class="quiz-k"><Icon name="target" :size="12" :stroke="2.5" /> Check your understanding</span>
    <p class="quiz-q">{{ q }}</p>
    <button v-for="(o, i) in options" :key="i" class="opt" :data-l="'ABCDEF'[i]" :disabled="picked !== null"
      :class="{ right: picked !== null && i === answer, wrong: picked === i && i !== answer }" @click="pick(i)">{{ o }}</button>
    <p v-if="picked !== null" class="quiz-e"><b :style="{ color: picked === answer ? 'var(--ok)' : 'var(--bad)' }">{{ picked === answer ? 'Correct.' : 'Not quite.' }}</b> {{ explain }}</p>
  </div>
</template>
