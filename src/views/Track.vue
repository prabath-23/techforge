<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTrack, fmtTime } from '../lib/content.js'
import { state } from '../lib/progress.js'
import Icon from '../components/Icon.vue'
const route = useRoute()
const t = computed(() => getTrack(route.params.track))
const done = computed(() => t.value.chapters.filter(c => state.done[`${t.value.id}/${c.slug}`]).length)
const minutes = computed(() => t.value.chapters.reduce((m, c) => m + c.minutes, 0))
const next = computed(() => t.value.chapters.find(c => !state.done[`${t.value.id}/${c.slug}`]) || t.value.chapters[0])
</script>

<template>
  <div v-if="t" class="page" :style="{ '--c': t.color, maxWidth: '900px' }">
    <section class="track-hero">
      <div class="t-icon" :style="{ color: t.color }"><Icon :name="t.icon" :size="28" /></div>
      <h1>{{ t.name }}</h1>
      <p class="lede">{{ t.blurb }}</p>
      <div class="track-stats">
        <span><b>{{ t.chapters.length }}</b> chapters</span>
        <span><b>{{ fmtTime(minutes) }}</b> total study time</span>
        <span><b>{{ done }}</b> completed</span>
        <span v-if="t.planned?.length"><b>{{ t.planned.length }}</b> planned</span>
      </div>
      <div class="hero-actions" v-if="next">
        <router-link class="btn" :to="`/read/${t.id}/${next.slug}`" :style="{ background: t.color }">{{ done ? 'Continue' : 'Start reading' }} <Icon name="arrow" :size="16" /></router-link>
      </div>
    </section>
    <ol class="toc-list">
      <li v-for="(c, i) in t.chapters" :key="c.slug">
        <router-link :to="`/read/${t.id}/${c.slug}`">
          <span class="chap-n" :class="{ done: state.done[`${t.id}/${c.slug}`] }">
            <Icon v-if="state.done[`${t.id}/${c.slug}`]" name="check" :size="18" :stroke="3" /><template v-else>{{ i + 1 }}</template>
          </span>
          <div><h3>{{ c.title }}</h3><p>{{ c.summary }}</p><small><Icon name="clock" :size="12" /> {{ fmtTime(c.minutes) }} · {{ c.lessons.reduce((n, l) => n + l.steps, 0) }} lesson steps</small></div>
        </router-link>
      </li>
    </ol>
    <template v-if="t.planned?.length">
      <div class="section-head" style="margin-top:32px"><h2>Planned chapters</h2><span class="meta">{{ t.planned.length }} more on the way</span></div>
      <ol class="toc-list planned">
        <li v-for="(title, i) in t.planned" :key="title"><div class="planned-row">
          <span class="chap-n"><Icon name="planned" :size="16" /></span>
          <div><h3>{{ title }}</h3><small>Chapter {{ t.chapters.length + i + 1 }} · planned</small></div>
        </div></li>
      </ol>
    </template>
  </div>
  <p v-else>Track not found.</p>
</template>
