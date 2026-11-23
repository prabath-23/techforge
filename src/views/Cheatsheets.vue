<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tracks } from '../lib/content.js'
import CheatSheet from '../components/CheatSheet.vue'
import Icon from '../components/Icon.vue'

const route = useRoute(), router = useRouter()
const trackId = computed(() => tracks.some(t => t.id === route.query.track) ? route.query.track : tracks[0].id)
const track = computed(() => tracks.find(t => t.id === trackId.value))
const pick = id => router.replace({ query: { track: id } })
const open = ref(new Set())
const toggle = slug => { const s = new Set(open.value); s.has(slug) ? s.delete(slug) : s.add(slug); open.value = s }
const all = computed(() => open.value.size === track.value.chapters.length)
const toggleAll = () => { open.value = all.value ? new Set() : new Set(track.value.chapters.map(c => c.slug)) }
const printAll = () => { open.value = new Set(track.value.chapters.map(c => c.slug)); setTimeout(() => print(), 300) }
</script>

<template>
  <div class="csp" :style="{ '--c': track.color }">
    <header class="prac-head">
      <span class="eyebrow" style="color:var(--accent)"><Icon name="file" :size="14" /> Cheat sheets</span>
      <h1>Every chapter on one page</h1>
      <p class="lede">The recap, the key idea from every lesson, the reference tables, a glossary and quick-check answers, distilled from each chapter for fast revision. Print a whole track before an interview.</p>
      <div class="dz-pick csp-tracks">
        <button v-for="t in tracks" :key="t.id" class="chip-btn" :class="{ on: t.id === trackId }" @click="pick(t.id)">{{ t.name }}</button>
      </div>
      <div class="dz-row">
        <button class="btn sm" @click="toggleAll">{{ all ? 'Collapse all' : 'Expand all' }}</button>
        <button class="btn sm" @click="printAll"><Icon name="file" :size="13" /> Print {{ track.name }}</button>
      </div>
    </header>
    <article v-for="(c, i) in track.chapters" :key="c.slug" class="csp-ch" :class="{ open: open.has(c.slug) }">
      <button class="csp-h" @click="toggle(c.slug)">
        <span class="topic-n">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="csp-t">{{ c.title }}</span>
        <Icon name="right" :size="16" class="csp-chev" />
      </button>
      <div v-if="open.has(c.slug)" class="csp-body">
        <CheatSheet :chapter="c" />
        <router-link :to="`/read/${track.id}/${c.slug}`" class="btn sm ghost"><Icon name="book" :size="13" /> Open the chapter</router-link>
      </div>
    </article>
  </div>
</template>
