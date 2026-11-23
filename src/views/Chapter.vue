<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getTrack, getChapter } from '../lib/content.js'
import { renderChapter } from '../lib/markdown.js'
import { state } from '../lib/progress.js'
import WidgetFrame from '../components/WidgetFrame.vue'
import Quiz from '../components/Quiz.vue'
import Icon from '../components/Icon.vue'

const route = useRoute()
const track = computed(() => getTrack(route.params.track))
const ch = computed(() => getChapter(route.params.track, route.params.chapter))
const doc = computed(() => ch.value && renderChapter(ch.value.body))
const idx = computed(() => track.value?.chapters.findIndex(c => c.slug === ch.value?.slug))
const prev = computed(() => track.value?.chapters[idx.value - 1])
const next = computed(() => track.value?.chapters[idx.value + 1])
const key = computed(() => `${route.params.track}/${route.params.chapter}`)
const widgetCount = computed(() => doc.value?.segs.filter(s => s.type === 'widget').length || 0)

const progress = ref(0), activeId = ref('')
function onScroll() {
  const h = document.documentElement
  progress.value = Math.min(100, 100 * h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight))
  let cur = ''
  for (const t of doc.value?.toc || []) { const el = document.getElementById(t.id); if (el && el.getBoundingClientRect().top < 140) cur = t.id }
  activeId.value = cur
}
onMounted(async () => { addEventListener('scroll', onScroll, { passive: true }); await nextTick(); onScroll()
  if (route.hash) document.getElementById(decodeURIComponent(route.hash.slice(1)))?.scrollIntoView() })
onBeforeUnmount(() => removeEventListener('scroll', onScroll))
</script>

<template>
  <div v-if="ch" :style="{ '--c': track.color }">
    <div class="read-progress"><div :style="{ width: progress + '%' }"></div></div>
    <div class="reader">
      <article class="book">
        <header class="chapter-head">
          <div class="crumbs">
            <router-link :to="`/track/${track.id}`" class="eyebrow" :style="{ color: track.color }"><Icon :name="track.icon" :size="14" /> {{ track.name }}</router-link>
            <Icon name="right" :size="12" /><span>Chapter {{ idx + 1 }} of {{ track.chapters.length }}</span>
          </div>
          <h1>{{ ch.title }}</h1>
          <p class="lede">{{ ch.summary }}</p>
          <div class="chapter-meta">
            <span><Icon name="clock" :size="13" /> {{ ch.minutes }} min read</span><span class="dot"></span>
            <span v-if="widgetCount"><Icon name="flask" :size="13" /> {{ widgetCount }} interactive {{ widgetCount === 1 ? 'figure' : 'figures' }}</span>
            <span v-if="state.done[key]" style="color:var(--ok)"><Icon name="done" :size="13" /> Completed</span>
          </div>
        </header>

        <template v-for="(s, i) in doc.segs" :key="i">
          <div v-if="s.type === 'html'" class="prose" v-html="s.html"></div>
          <Quiz v-else-if="s.type === 'quiz'" v-bind="s.props" :id="`${key}#${i}`" />
          <WidgetFrame v-else :name="s.name" :props="s.props" />
        </template>

        <footer class="chapter-end">
          <div class="complete-box">
            <div><h4>{{ state.done[key] ? 'Chapter completed' : 'Finished this chapter?' }}</h4><p>Track your progress across all {{ track.chapters.length }} chapters of {{ track.name }}.</p></div>
            <button class="btn" :class="{ ghost: state.done[key] }" @click="state.done[key] = !state.done[key]">
              <Icon :name="state.done[key] ? 'refresh' : 'check'" :size="16" /> {{ state.done[key] ? 'Mark as unread' : 'Mark complete' }}
            </button>
          </div>
          <nav class="pager">
            <router-link v-if="prev" :to="`/read/${track.id}/${prev.slug}`"><small><Icon name="left" :size="12" /> Previous</small><b>{{ prev.title }}</b></router-link>
            <router-link v-if="next" :to="`/read/${track.id}/${next.slug}`" class="next"><small>Next <Icon name="right" :size="12" /></small><b>{{ next.title }}</b></router-link>
          </nav>
        </footer>
      </article>
      <nav class="otoc" aria-label="On this page">
        <div class="otoc-h">On this page</div>
        <a v-for="h in doc.toc" :key="h.id" :href="`#${h.id}`" :class="['l' + h.level, { active: activeId === h.id }]">{{ h.text }}</a>
      </nav>
    </div>
  </div>
  <p v-else>Chapter not found.</p>
</template>
