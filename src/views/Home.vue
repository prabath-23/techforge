<script setup>
import { computed } from 'vue'
import { tracks } from '../lib/content.js'
import { state } from '../lib/progress.js'
import Icon from '../components/Icon.vue'

const total = computed(() => tracks.reduce((n, t) => n + t.chapters.length, 0))
const read = computed(() => Object.values(state.done).filter(Boolean).length)
const hours = computed(() => Math.round(tracks.reduce((n, t) => n + t.chapters.reduce((m, c) => m + c.minutes, 0), 0) / 60))
const quizzes = computed(() => Object.values(state.quiz).filter(Boolean).length)
const next = computed(() => { for (const t of tracks) for (const c of t.chapters) if (!state.done[`${t.id}/${c.slug}`]) return { t, c } })
const planned = computed(() => tracks.reduce((n, t) => n + (t.planned?.length || 0), 0))
const doneIn = t => t.chapters.filter(c => state.done[`${t.id}/${c.slug}`]).length
</script>

<template>
  <div class="page">
    <section class="hero">
      <span class="pill"><i></i>{{ total }} chapters · {{ hours }} hours of deep reading</span>
      <h1>Learn computer science <span class="grad">the way it actually works.</span></h1>
      <p class="lede">A book-length, first-principles curriculum from the bootloader to transformers, with interactive simulations of the real mechanisms and a live library of engineering writing from across the industry.</p>
      <div class="hero-actions">
        <router-link v-if="next" class="btn" :to="`/read/${next.t.id}/${next.c.slug}`">
          {{ read ? 'Continue' : 'Start' }}: {{ next.c.title }} <Icon name="arrow" :size="16" />
        </router-link>
        <router-link class="btn ghost" to="/labs"><Icon name="flask" :size="16" /> Explore the labs</router-link>
      </div>
    </section>

    <div class="stats">
      <div class="stat"><b>{{ tracks.length }}</b><span>Tracks</span></div>
      <div class="stat"><b>{{ total }}<small v-if="planned" class="meta"> + {{ planned }} planned</small></b><span>Chapters</span></div>
      <div class="stat"><b>{{ read }}<small class="meta"> / {{ total }}</small></b><span>Completed</span></div>
      <div class="stat"><b>{{ quizzes }}</b><span>Quiz questions correct</span></div>
    </div>

    <div class="section-head"><h2>Tracks</h2><span class="meta">Read in order, or jump to what you need</span></div>
    <div class="grid">
      <router-link v-for="t in tracks" :key="t.id" :to="`/track/${t.id}`" class="card" :style="{ '--c': t.color }">
        <div class="card-top">
          <div class="card-icon" :style="{ color: t.color }"><Icon :name="t.icon" :size="22" /></div>
          <div><h3>{{ t.name }}</h3><div class="card-sub">{{ t.chapters.length ? `${t.chapters.length} chapters` : 'Coming soon' }}<template v-if="t.planned?.length"> · {{ t.planned.length }} planned</template></div></div>
        </div>
        <p>{{ t.blurb }}</p>
        <div class="card-foot">
          <div class="meter"><div :style="{ width: (100 * doneIn(t) / (t.chapters.length || 1)) + '%' }"></div></div>
          <small>{{ doneIn(t) }}/{{ t.chapters.length }}</small>
        </div>
      </router-link>
    </div>

    <div class="section-head" style="margin-top:40px"><h2>Beyond reading</h2></div>
    <div class="features">
      <router-link to="/labs" class="feature"><div class="f-ico"><Icon name="flask" /></div><div><h4>25 interactive labs</h4><p>Schedulers, page-table walks, Raft, consistent hashing, attention, Kubernetes reconciliation and more.</p></div></router-link>
      <router-link to="/library" class="feature"><div class="f-ico"><Icon name="rss" /></div><div><h4>Live tech library</h4><p>Engineering blogs, Hacker News and arXiv, scraped and rendered in a clean reader you can save from.</p></div></router-link>
      <router-link to="/search?q=interview" class="feature"><div class="f-ico"><Icon name="target" /></div><div><h4>Interview angles</h4><p>Every chapter flags what interviewers probe, plus quizzes to check understanding.</p></div></router-link>
    </div>
  </div>
</template>
