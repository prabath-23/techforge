<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { tracks } from './lib/content.js'
import { state } from './lib/progress.js'
import Icon from './components/Icon.vue'

const router = useRouter(), route = useRoute()
const q = ref(''), open = ref(false), searchEl = ref(null)
const chapterCount = tracks.reduce((n, t) => n + t.chapters.length, 0)
const expanded = ref(new Set(route.params.track ? [route.params.track] : []))
watch(() => route.params.track, t => { if (t) expanded.value = new Set([...expanded.value, t]); open.value = false })
const toggle = id => { const s = new Set(expanded.value); s.has(id) ? s.delete(id) : s.add(id); expanded.value = s }
const toggleSide = () => { if (innerWidth <= 960) open.value = !open.value; else state.sideCollapsed = !state.sideCollapsed }
const go = () => q.value.trim() && router.push({ path: '/search', query: { q: q.value.trim() } })
const pct = t => t.chapters.length ? Math.round(100 * t.chapters.filter(c => state.done[`${t.id}/${c.slug}`]).length / t.chapters.length) : 0
const onKey = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchEl.value?.focus() } }
onMounted(() => addEventListener('keydown', onKey)); onBeforeUnmount(() => removeEventListener('keydown', onKey))
</script>

<template>
  <header class="topbar">
    <router-link to="/" class="brand"><span class="brand-mark"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="2.4"/><circle cx="19" cy="5" r="2.4"/><circle cx="19" cy="19" r="2.4"/><path d="M7.3 11 16.8 6.1M7.3 13l9.5 4.9"/></svg></span><span class="brand-text">AXON<small>engineering, illuminated</small></span></router-link>
        <button class="icon menu-btn nav-toggle" @click="toggleSide" :aria-label="state.sideCollapsed ? 'Show sidebar' : 'Hide sidebar'" :title="state.sideCollapsed ? 'Show sidebar' : 'Hide sidebar'"><Icon :name="state.sideCollapsed ? 'panelOpen' : 'panelClose'" /></button>
    <form class="search" @submit.prevent="go" role="search">
      <input ref="searchEl" v-model="q" type="search" :placeholder="`Search ${chapterCount} chapters — page tables, Raft, attention…`" aria-label="Search chapters" />
      <kbd>⌘K</kbd>
    </form>
    <nav class="top-nav">
      <router-link to="/library" class="navlink"><Icon name="rss" :size="16" /> <span>Library</span></router-link>
      <router-link to="/labs" class="navlink"><Icon name="flask" :size="16" /> <span>Labs</span></router-link>
      <button class="icon" @click="state.theme = state.theme === 'dark' ? 'light' : 'dark'" :aria-label="`Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`">
        <Icon :name="state.theme === 'dark' ? 'sun' : 'moon'" :size="17" />
      </button>
    </nav>
  </header>

  <div class="shell" :class="{ collapsed: state.sideCollapsed }">
    <aside class="side" :class="{ open }">
      <router-link to="/" class="side-link"><span class="side-ico"><Icon name="home" :size="15" /></span>Overview</router-link>
      <router-link to="/library" class="side-link"><span class="side-ico"><Icon name="rss" :size="15" /></span>Tech Library</router-link>
      <router-link to="/labs" class="side-link"><span class="side-ico"><Icon name="flask" :size="15" /></span>Interactive Labs</router-link>

      <div class="side-label">Tracks</div>
      <div v-for="t in tracks" :key="t.id" class="side-track" :class="{ open: expanded.has(t.id) }">
        <button class="side-link side-track-head" :class="{ active: route.params.track === t.id }" @click="toggle(t.id); router.push(`/track/${t.id}`)">
          <span class="side-ico" :style="{ color: t.color, background: `color-mix(in srgb, ${t.color} 14%, transparent)` }"><Icon :name="t.icon" :size="15" /></span>
          <span>{{ t.name }}</span>
          <span class="side-pct">{{ pct(t) }}%</span>
          <span class="side-chev"><Icon name="right" :size="13" /></span>
        </button>
        <div v-if="expanded.has(t.id)" class="side-chapters">
          <template v-for="(c, i) in t.chapters" :key="c.slug">
          <router-link :to="`/read/${t.id}/${c.slug}`" class="side-ch" :class="{ cur: route.params.chapter === c.slug }">
            <span class="num" :class="{ done: state.done[`${t.id}/${c.slug}`] }">
              <Icon v-if="state.done[`${t.id}/${c.slug}`]" name="check" :size="12" :stroke="3" /><template v-else>{{ String(i + 1).padStart(2, '0') }}</template>
            </span>{{ c.title }}
          </router-link>
          <div v-if="route.params.chapter === c.slug && c.lessons.length" class="side-lessons">
            <router-link v-for="(l, j) in c.lessons" :key="j" :to="`/read/${t.id}/${c.slug}/${j + 1}`" class="side-lesson" :class="{ on: (Number(route.params.lesson) || 1) === j + 1, done: state.done[`${t.id}/${c.slug}#${j + 1}`] }">
              <i></i>{{ l.title }}
            </router-link>
          </div>
          </template>
          <div v-for="title in t.planned || []" :key="title" class="side-ch planned" :title="'Planned: ' + title"><span class="num"><Icon name="planned" :size="11" /></span>{{ title }}</div>
        </div>
      </div>
    </aside>
    <main class="content" @click="open = false"><router-view :key="route.fullPath.split('#')[0]" /></main>
  </div>
</template>
