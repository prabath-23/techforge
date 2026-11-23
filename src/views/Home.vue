<script setup>
import { computed } from 'vue'
import { tracks, getChapter } from '../lib/content.js'
import { state } from '../lib/progress.js'
import Icon from '../components/Icon.vue'
import Scene from '../components/widgets/Scene.vue'

const modules = computed(() => tracks.reduce((n, t) => n + t.chapters.length, 0))
const lessonCount = computed(() => tracks.reduce((n, t) => n + t.chapters.reduce((m, c) => m + (c.lessons?.length || 0), 0), 0))
const doneIn = t => t.chapters.filter(c => state.done[`${t.id}/${c.slug}`]).length
const next = computed(() => { for (const t of tracks) for (const c of t.chapters) if (!state.done[`${t.id}/${c.slug}`]) return { t, c } })
const started = computed(() => Object.values(state.done).some(Boolean))

// A real lesson, playing on its own, as the hero illustration.
const demo = computed(() => {
  const ch = getChapter('networking', 'http'); const m = ch?.body.match(/^::widget Scene (.+)$/m)
  try { return m ? JSON.parse(m[1]) : null } catch { return null }
})
const lessonsIn = t => t.chapters.reduce((n, c) => n + (c.lessons?.length || 0), 0)
const HOW = [
  { n: '01', t: 'Watch it happen', d: 'Every lesson opens on a live illustration: packets moving between machines, arrays being searched, processes being scheduled.' },
  { n: '02', t: 'Step through it', d: 'Go one idea at a time with ← and →. Each step changes one thing, explains why, and updates the numbers that matter.' },
  { n: '03', t: 'Go deeper', d: 'Every module has a full chapter behind it with real examples, code, history and the trade-offs engineers argue about.' },
  { n: '04', t: 'Check yourself', d: 'Short questions after each topic, interview angles, and progress that remembers where you stopped.' },
]
</script>

<template>
  <div class="ax-home">
    <section class="ax-hero">
      <div class="ax-hero-copy">
        <span class="ax-eyebrow"><i></i> Free · interactive · {{ tracks.length }} tracks</span>
        <h1>See how computers <em>really</em> work.</h1>
        <p>Axon teaches computer science the way you'd explain it at a whiteboard: one idea at a time, drawn out, with real systems as examples. From the boot loader to transformers, from a single packet to a planet-scale chat app.</p>
        <div class="ax-cta">
          <router-link v-if="next" class="ax-btn primary" :to="`/read/${next.t.id}/${next.c.slug}`">{{ started ? 'Continue learning' : 'Start learning' }} <Icon name="arrow" :size="16" /></router-link>
          <a class="ax-btn" href="#tracks">Browse tracks</a>
        </div>
        <div class="ax-proof">
          <div><b>{{ modules }}</b><span>modules</span></div>
          <div><b>{{ lessonCount }}</b><span>interactive lessons</span></div>
          <div><b>{{ tracks.length }}</b><span>tracks</span></div>
        </div>
      </div>
      <div class="ax-hero-demo">
        <div class="ax-window">
          <div class="ax-window-bar"><i></i><i></i><i></i><span>Lesson · What happens when you open a URL</span></div>
          <Scene v-if="demo" v-bind="demo" compact autoplay />
        </div>
      </div>
    </section>

    <section class="ax-how">
      <h2>How a lesson works</h2>
      <div class="ax-how-grid">
        <div v-for="h in HOW" :key="h.n" class="ax-how-card"><span>{{ h.n }}</span><h3>{{ h.t }}</h3><p>{{ h.d }}</p></div>
      </div>
    </section>

    <section id="tracks" class="ax-tracks">
      <div class="ax-sec-head"><h2>Tracks</h2><p>Start anywhere. Each track builds from first principles to what top engineering teams run in production.</p></div>
      <div class="ax-track-grid">
        <router-link v-for="t in tracks" :key="t.id" :to="`/track/${t.id}`" class="ax-track" :style="{ '--c': t.color }">
          <div class="ax-track-top">
            <span class="ax-tile"><Icon :name="t.icon" :size="20" /></span>
            <span class="ax-count">{{ t.chapters.length }} modules · {{ lessonsIn(t) }} lessons</span>
          </div>
          <h3>{{ t.name }}</h3>
          <p>{{ t.blurb }}</p>
          <div class="ax-bar"><div :style="{ width: (100 * doneIn(t) / (t.chapters.length || 1)) + '%' }"></div></div>
        </router-link>
      </div>
    </section>

    <section class="ax-extras">
      <router-link to="/labs" class="ax-extra"><Icon name="flask" :size="20" /><div><h3>Labs</h3><p>Sandboxes to play with schedulers, Raft, consistent hashing, attention and more.</p></div></router-link>
      <router-link to="/library" class="ax-extra"><Icon name="rss" :size="20" /><div><h3>Library</h3><p>The best engineering writing from company blogs, Hacker News and arXiv, in a clean reader.</p></div></router-link>
    </section>

    <footer class="ax-foot">
      <div><b>AXON</b><span>engineering, illuminated</span></div>
      <nav><a href="#tracks">Tracks</a><router-link to="/labs">Labs</router-link><router-link to="/library">Library</router-link><router-link to="/search?q=interview">Interview prep</router-link></nav>
    </footer>
  </div>
</template>
