<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getTrack, getChapter } from '../lib/content.js'
import { renderChapter } from '../lib/markdown.js'
import { state } from '../lib/progress.js'
import WidgetFrame from '../components/WidgetFrame.vue'
import Scene from '../components/widgets/Scene.vue'
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
// The first Scene becomes the chapter's interactive lesson, shown above the reading.
const lessonNo = computed(() => Math.max(1, Number(route.params.lesson) || 1))
const sceneIdx = computed(() => (doc.value?.segs || []).map((s, i) => s.type === 'widget' && s.name === 'Scene' ? i : -1).filter(i => i >= 0))
const leadIdx = computed(() => sceneIdx.value[lessonNo.value - 1] ?? -1)
const lessonCount = computed(() => sceneIdx.value.length)
const lead = computed(() => leadIdx.value >= 0 ? doc.value.segs[leadIdx.value] : null)
const body = computed(() => doc.value?.segs.filter((s, i) => !(s.type === 'widget' && s.name === 'Scene')) || [])
const nextLesson = computed(() => lessonNo.value < lessonCount.value ? `/read/${track.value.id}/${ch.value.slug}/${lessonNo.value + 1}` : next.value ? `/read/${track.value.id}/${next.value.slug}` : null)
const quizCount = computed(() => doc.value?.segs.filter(s => s.type === 'quiz').length || 0)
const lessonDone = computed(() => !!state.done[key.value + '#lesson'])
const onLessonDone = () => { state.done[`${key.value}#${lessonNo.value}`] = true; if (lessonNo.value === lessonCount.value) state.done[key.value] = true }
const mode = ref('lesson')
const toReading = () => { mode.value = 'read'; nextTick(() => scrollTo({ top: 0 })) }

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

    <section v-if="lead && mode === 'lesson'" class="lesson-app">
      <Scene :key="lessonNo" v-bind="lead.props" lesson :next-link="nextLesson" :head="{ track: track.name, module: ch.title, color: track.color, n: lessonNo, of: lessonCount, title: lead.props.title, minutes: ch.minutes, done: state.done[`${key}#${lessonNo}`] }"
        @finished="onLessonDone" @deepdive="toReading" />
    </section>
    <div v-else id="reading" class="reader">
      <article class="book">
        <header class="chapter-head">
          <div class="crumbs">
            <router-link :to="`/track/${track.id}`" class="eyebrow" :style="{ color: track.color }"><Icon :name="track.icon" :size="14" /> {{ track.name }}</router-link>
            <Icon name="right" :size="12" /><span>Lesson {{ idx + 1 }} of {{ track.chapters.length }}</span>
          </div>
          <h1>{{ ch.title }}</h1>
          <p class="lede">{{ ch.summary }}</p>
          <div class="chapter-meta">
            <button v-if="lead" class="btn primary" @click="mode = 'lesson'; scrollTo({ top: 0 })"><Icon name="flask" :size="14" /> Back to the interactive lesson</button>
            <span><Icon name="clock" :size="13" /> {{ ch.minutes }} min read</span>
            <span v-if="state.done[key]" style="color:var(--ok)"><Icon name="done" :size="13" /> Completed</span>
          </div>
        </header>
        <template v-for="(s, i) in body" :key="i">
          <div v-if="s.type === 'html'" class="prose" v-html="s.html"></div>
          <Quiz v-else-if="s.type === 'quiz'" v-bind="s.props" :id="`${key}#${i}`" />
          <WidgetFrame v-else :name="s.name" :props="s.props" />
        </template>

        <footer class="chapter-end">
          <div class="complete-box">
            <div><h4>{{ state.done[key] ? 'Chapter completed' : 'Finished this chapter?' }}</h4><p>Track your progress across all {{ track.chapters.length }} lessons of {{ track.name }}.</p></div>
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
