<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { allChapters, tracks } from '../lib/content.js'
import { slugify } from '../lib/markdown.js'
import Icon from '../components/Icon.vue'
const route = useRoute()
const trackOf = id => tracks.find(t => t.id === id)
const results = computed(() => {
  const q = String(route.query.q || '').toLowerCase()
  if (!q) return []
  return allChapters().flatMap(c => {
    const hits = []; let heading = ''
    for (const line of c.body.split('\n')) {
      if (/^#{2,3} /.test(line)) heading = line.replace(/^#+ /, '')
      if (line.toLowerCase().includes(q) && !line.startsWith('::')) hits.push({ heading, text: line.replace(/[#*`>]/g, '').trim() })
    }
    return hits.length ? [{ c, hits: hits.slice(0, 3), n: hits.length + (c.title.toLowerCase().includes(q) ? 50 : 0) }] : []
  }).sort((a, b) => b.n - a.n)
})
const esc = s => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))
const mark = t => { const q = String(route.query.q); const i = t.toLowerCase().indexOf(q.toLowerCase()); const s = Math.max(0, i - 80)
  return (s ? '…' : '') + esc(t.slice(s, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length, i + 160)) + '…' }
</script>

<template>
  <div class="page" style="max-width:860px">
    <span class="eyebrow" style="color:var(--accent)"><Icon name="search" :size="14" /> Search</span>
    <h1>“{{ route.query.q }}”</h1>
    <p class="meta" style="margin-bottom:20px">{{ results.length }} chapters match</p>
    <div v-for="r in results" :key="r.c.track + r.c.slug" class="search-hit">
      <router-link :to="`/read/${r.c.track}/${r.c.slug}`">
        <span class="eyebrow" :style="{ color: trackOf(r.c.track).color, fontSize: '11px' }"><Icon :name="trackOf(r.c.track).icon" :size="12" /> {{ r.c.trackName }}</span>
        <h3>{{ r.c.title }}</h3>
      </router-link>
      <div v-for="(h, i) in r.hits" :key="i" class="hit-line">
        <router-link v-if="h.heading" :to="`/read/${r.c.track}/${r.c.slug}#${slugify(h.heading)}`" class="chip">§ {{ h.heading }}</router-link>
        <span v-html="mark(h.text)"></span>
      </div>
    </div>
    <div v-if="!results.length" class="empty">No matches. Try a broader term like “cache”, “TCP” or “attention”.</div>
  </div>
</template>
