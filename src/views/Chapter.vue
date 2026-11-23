<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTrack, getChapter } from '../lib/content.js'
import { renderChapter } from '../lib/markdown.js'
import { state } from '../lib/progress.js'
import WidgetFrame from '../components/WidgetFrame.vue'
import Scene from '../components/widgets/Scene.vue'
import Quiz from '../components/Quiz.vue'
import Icon from '../components/Icon.vue'

const route = useRoute(), router = useRouter()
const track = computed(() => getTrack(route.params.track))
const ch = computed(() => getChapter(route.params.track, route.params.chapter))
const doc = computed(() => ch.value && renderChapter(ch.value.body))
const idx = computed(() => track.value?.chapters.findIndex(c => c.slug === ch.value?.slug))
const prev = computed(() => track.value?.chapters[idx.value - 1])
const next = computed(() => track.value?.chapters[idx.value + 1])
const key = computed(() => `${route.params.track}/${route.params.chapter}`)
const base = computed(() => `/read/${route.params.track}/${route.params.chapter}`)

// ---- stages: basics (cards) → lesson (interactive) → quiz ----
const stage = computed(() => route.params.lesson ? 'lesson' : route.query.view === 'quiz' ? 'quiz' : route.query.view === 'article' ? 'article' : 'basics')

// lessons = every Scene embed
const scenes = computed(() => (doc.value?.segs || []).filter(s => s.type === 'widget' && s.name === 'Scene'))
const lessonNo = computed(() => Math.min(scenes.value.length, Math.max(1, Number(route.params.lesson) || 1)))
const lead = computed(() => scenes.value[lessonNo.value - 1])
const lessonLink = n => `${base.value}/${n}`
const nextAfterLesson = computed(() => lessonNo.value < scenes.value.length ? lessonLink(lessonNo.value + 1) : `${base.value}?view=quiz`)
const onLessonDone = () => { state.done[`${key.value}#${lessonNo.value}`] = true; if (scenes.value.every((_, i) => state.done[`${key.value}#${i + 1}`])) state.done[key.value + '#lessons'] = true }

// reading content (no scenes); quizzes collected separately
const body = computed(() => (doc.value?.segs || []).filter(s => !(s.type === 'widget' && s.name === 'Scene')))
const quizzes = computed(() => body.value.map((s, i) => ({ s, i })).filter(x => x.s.type === 'quiz'))

// split the article into section cards at each <h2>
const sections = computed(() => {
  const out = [{ title: 'The big picture', id: 'intro', parts: [] }]
  for (const s of body.value) {
    if (s.type === 'quiz') continue
    if (s.type !== 'html') { out[out.length - 1].parts.push(s); continue }
    const pieces = s.html.split(/(?=<h2[\s>])/)
    for (const p of pieces) {
      const m = p.match(/^<h2[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/)
      if (m) out.push({ title: m[2].replace(/<[^>]+>/g, ''), id: m[1], parts: [{ type: 'html', html: p.slice(m[0].length) }] })
      else if (p.trim()) out[out.length - 1].parts.push({ type: 'html', html: p })
    }
  }
  return out.filter(c => c.parts.some(p => p.type !== 'html' || p.html.replace(/<[^>]+>/g, '').trim()))
})
// h3 sub-topics inside each card, for the quick-nav
const subOf = c => [...c.parts.filter(p => p.type === 'html').map(p => p.html).join('').matchAll(/<h3[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h3>/g)].map(m => ({ id: m[1], t: m[2].replace(/<[^>]+>/g, '') }))

const memKey = computed(() => 'card:' + key.value)
const card = ref(0), dir = ref('fwd'), cardEl = ref(null)
const total = computed(() => sections.value.length)
const cur = computed(() => sections.value[card.value])
const goCard = (n, sub) => {
  if (n < 0 || n >= total.value) return
  dir.value = n >= card.value ? 'fwd' : 'back'; card.value = n
  try { sessionStorage.setItem(memKey.value, n) } catch {}
  if (n === total.value - 1) state.done[key.value + '#basics'] = true
  nextTick(() => {
    const el = sub && document.getElementById(sub)
    const top = (el || cardEl.value)?.getBoundingClientRect().top + scrollY - 96
    if (top < scrollY || el) scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  })
}
const afterCards = computed(() => scenes.value.length ? lessonLink(1) : `${base.value}?view=quiz`)

const onKey = e => {
  if (stage.value !== 'basics' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return
  if (e.key === 'ArrowRight') { e.preventDefault(); card.value < total.value - 1 ? goCard(card.value + 1) : router.push(afterCards.value) }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); goCard(card.value - 1) }
}

const stages = computed(() => [
  { id: 'basics', n: 1, label: 'Basics', sub: `${total.value} short cards`, to: base.value, done: state.done[key.value + '#basics'] },
  ...(scenes.value.length ? [{ id: 'lesson', n: 2, label: 'Interactive lesson', sub: `${scenes.value.length > 1 ? scenes.value.length + ' lessons' : (scenes.value[0].props.steps?.length || 0) + ' steps'}`, to: lessonLink(1), done: state.done[key.value + '#lessons'] }] : []),
  { id: 'quiz', n: scenes.value.length ? 3 : 2, label: 'Check yourself', sub: quizzes.value.length ? `${quizzes.value.length} questions` : 'wrap up', to: `${base.value}?view=quiz`, done: state.done[key.value] },
])

onMounted(() => {
  addEventListener('keydown', onKey)
  if (route.hash && stage.value === 'basics') {
    const id = decodeURIComponent(route.hash.slice(1))
    const n = sections.value.findIndex(c => c.id === id || subOf(c).some(s => s.id === id))
    if (n >= 0) return goCard(n, id)
  }
  try { const n = Number(sessionStorage.getItem(memKey.value)); if (n > 0 && n < total.value) card.value = n } catch {}
})
onBeforeUnmount(() => removeEventListener('keydown', onKey))
watch(stage, () => scrollTo({ top: 0 }))
</script>

<template>
  <div v-if="ch" class="chap" :style="{ '--c': track.color }">
    <header class="chap-head">
      <div class="chap-crumb">
        <router-link :to="`/track/${track.id}`" :style="{ color: track.color }"><Icon :name="track.icon" :size="13" /> {{ track.name }}</router-link>
        <Icon name="right" :size="12" /><span>Chapter {{ idx + 1 }} of {{ track.chapters.length }}</span>
        <span class="chap-meta-dot"></span><span>{{ ch.minutes }} min</span>
        <template v-if="state.done[key]"><span class="chap-meta-dot"></span><span class="chap-ok"><Icon name="check" :size="12" :stroke="3" /> Completed</span></template>
      </div>
      <h1>{{ ch.title }}</h1>
      <nav class="stages" aria-label="Chapter stages">
        <router-link v-for="s in stages" :key="s.id" :to="s.to" class="stage" :class="{ on: stage === s.id || (s.id === 'basics' && stage === 'article'), done: s.done }">
          <span class="stage-n"><Icon v-if="s.done" name="check" :size="13" :stroke="3" /><template v-else>{{ s.n }}</template></span>
          <span class="stage-t"><b>{{ s.label }}</b><small>{{ s.sub }}</small></span>
        </router-link>
      </nav>
    </header>

    <!-- 1. BASICS: one section per card -->
    <section v-if="stage === 'basics' && cur" class="cards">
      <aside class="topics" aria-label="Topics in this chapter">
        <div class="topics-h">In this chapter</div>
        <button v-for="(c, i) in sections" :key="c.id" class="topic" :class="{ on: i === card, seen: i < card }" @click="goCard(i)">
          <span class="topic-n">{{ String(i + 1).padStart(2, '0') }}</span><span>{{ c.title }}</span>
        </button>
        <div v-if="subOf(cur).length" class="topics-sub">
          <div class="topics-h">On this card</div>
          <a v-for="s in subOf(cur)" :key="s.id" @click.prevent="goCard(card, s.id)" :href="`#${s.id}`">{{ s.t }}</a>
        </div>
        <router-link :to="`${base}?view=article`" class="topics-alt"><Icon name="library" :size="13" /> Read as one long page</router-link>
      </aside>

      <div class="card-stage">
        <button class="card-arrow prev" :disabled="card === 0" @click="goCard(card - 1)" aria-label="Previous card"><Icon name="left" :size="22" /></button>
        <div class="card-col">
          <div ref="cardEl" class="card-top">
            <span class="card-count">Card {{ card + 1 }} <i>/ {{ total }}</i></span>
            <div class="card-bar"><div :style="{ width: (100 * (card + 1) / total) + '%' }"></div></div>
          </div>
          <Transition :name="'card-' + dir" mode="out-in">
            <article :key="card" class="kcard">
              <p v-if="card === 0" class="kcard-lede">{{ ch.summary }}</p>
              <h2 class="kcard-title">{{ cur.title }}</h2>
              <template v-for="(s, i) in cur.parts" :key="i">
                <div v-if="s.type === 'html'" class="prose" v-html="s.html"></div>
                <WidgetFrame v-else :name="s.name" :props="s.props" />
              </template>
            </article>
          </Transition>
          <nav class="card-pager">
            <button v-if="card > 0" class="cp prev" @click="goCard(card - 1)"><small><Icon name="left" :size="12" /> Previous</small><b>{{ sections[card - 1].title }}</b></button>
            <span v-else></span>
            <button v-if="card < total - 1" class="cp next" @click="goCard(card + 1)"><small>Next <Icon name="right" :size="12" /></small><b>{{ sections[card + 1].title }}</b></button>
            <router-link v-else :to="afterCards" class="cp next go"><small>Basics done <Icon name="right" :size="12" /></small><b>{{ scenes.length ? 'Start the interactive lesson' : 'Check yourself' }}</b></router-link>
          </nav>
          <div class="card-keys"><kbd>←</kbd><kbd>→</kbd> move between cards</div>
        </div>
        <button v-if="card < total - 1" class="card-arrow next" @click="goCard(card + 1)" aria-label="Next card"><Icon name="right" :size="22" /></button>
        <router-link v-else :to="afterCards" class="card-arrow next go" aria-label="Continue"><Icon name="right" :size="22" /></router-link>
      </div>
    </section>

    <!-- 2. INTERACTIVE LESSON -->
    <section v-else-if="stage === 'lesson' && lead" class="lesson-app">
      <div v-if="scenes.length > 1" class="lesson-pick">
        <router-link v-for="(s, i) in scenes" :key="i" :to="lessonLink(i + 1)" :class="{ on: i + 1 === lessonNo, done: state.done[`${key}#${i + 1}`] }">
          <i>{{ state.done[`${key}#${i + 1}`] ? '✓' : i + 1 }}</i>{{ s.props.title }}
        </router-link>
      </div>
      <Scene :key="lessonNo" v-bind="lead.props" lesson :next-link="nextAfterLesson"
        :head="{ n: lessonNo, of: scenes.length, title: lead.props.title, done: state.done[`${key}#${lessonNo}`], nextLabel: lessonNo < scenes.length ? 'Next lesson' : 'Check yourself' }"
        @finished="onLessonDone" />
    </section>

    <!-- 3. QUIZ + wrap up -->
    <section v-else-if="stage === 'quiz'" class="wrap">
      <div class="wrap-col">
        <h2 class="wrap-h">Check yourself</h2>
        <p class="wrap-p">{{ quizzes.length ? 'Answer these to make sure the ideas stuck. Each one explains the answer.' : 'You have covered everything in this chapter.' }}</p>
        <Quiz v-for="q in quizzes" :key="q.i" v-bind="q.s.props" :id="`${key}#${q.i}`" />
        <div class="complete-box">
          <div><h4>{{ state.done[key] ? 'Chapter completed' : 'Finished this chapter?' }}</h4><p>Track your progress across all {{ track.chapters.length }} chapters of {{ track.name }}.</p></div>
          <button class="btn" :class="{ ghost: state.done[key] }" @click="state.done[key] = !state.done[key]">
            <Icon :name="state.done[key] ? 'refresh' : 'check'" :size="16" /> {{ state.done[key] ? 'Mark as unread' : 'Mark complete' }}
          </button>
        </div>
        <nav class="pager">
          <router-link v-if="prev" :to="`/read/${track.id}/${prev.slug}`"><small><Icon name="left" :size="12" /> Previous chapter</small><b>{{ prev.title }}</b></router-link>
          <router-link v-if="next" :to="`/read/${track.id}/${next.slug}`" class="next"><small>Next chapter <Icon name="right" :size="12" /></small><b>{{ next.title }}</b></router-link>
        </nav>
      </div>
    </section>

    <!-- full article, for people who prefer one long page -->
    <section v-else class="wrap">
      <div class="wrap-col">
        <router-link :to="base" class="btn sm"><Icon name="left" :size="13" /> Back to cards</router-link>
        <template v-for="(s, i) in body" :key="i">
          <div v-if="s.type === 'html'" class="prose" v-html="s.html"></div>
          <Quiz v-else-if="s.type === 'quiz'" v-bind="s.props" :id="`${key}#${i}`" />
          <WidgetFrame v-else :name="s.name" :props="s.props" />
        </template>
      </div>
    </section>
  </div>
  <p v-else>Chapter not found.</p>
</template>
