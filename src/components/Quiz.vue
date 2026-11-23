<script setup>
import { ref } from 'vue'
import { state } from '../lib/progress.js'
import Icon from './Icon.vue'
const props = defineProps({ q: String, options: Array, answer: Number, explain: String, id: String })
const picked = ref(null)
const pick = i => { if (picked.value !== null) return; picked.value = i; state.quiz[props.id] = i === props.answer }
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
