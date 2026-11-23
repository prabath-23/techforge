<script setup>
import { computed } from 'vue'
import { cheatsheet } from '../lib/markdown.js'
const props = defineProps({ chapter: Object, compact: Boolean })
const cs = computed(() => cheatsheet(props.chapter.body))
</script>

<template>
  <div class="cs" :class="{ compact }">
    <p v-if="!compact" class="cs-sum">{{ chapter.summary }}</p>
    <div class="cs-grid">
      <section v-if="cs.recap.length" class="cs-box cs-recap">
        <h4>Must remember</h4>
        <ul><li v-for="(r, i) in cs.recap" :key="i" v-html="r"></li></ul>
      </section>
      <section v-if="cs.keys.length" class="cs-box">
        <h4>Key ideas from the lessons</h4>
        <ul><li v-for="(k, i) in cs.keys" :key="i"><b>{{ k.lesson }}:</b> {{ k.text }}</li></ul>
      </section>
    </div>
    <section v-for="(t, i) in cs.tables" :key="'t' + i" class="cs-box cs-table">
      <h4>{{ t.section }}</h4>
      <div class="prose" v-html="t.html"></div>
    </section>
    <section v-for="(t, i) in cs.terms" :key="'g' + i" class="cs-box cs-table">
      <h4>Glossary</h4>
      <div class="prose" v-html="t"></div>
    </section>
    <section v-if="cs.quiz.length" class="cs-box">
      <h4>Quick check</h4>
      <dl class="cs-qa"><template v-for="(q, i) in cs.quiz" :key="i"><dt>{{ q.q }}</dt><dd><b>{{ q.a }}</b>, {{ q.why }}</dd></template></dl>
    </section>
    <section v-if="cs.interview" class="cs-box cs-int">
      <h4>Interview angle</h4>
      <p v-html="cs.interview"></p>
    </section>
  </div>
</template>
