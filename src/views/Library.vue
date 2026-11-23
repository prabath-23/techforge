<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { state } from '../lib/progress.js'
import Icon from '../components/Icon.vue'

const TOPICS = [['', 'All topics'], ['os', 'OS & kernel'], ['networking', 'Networking'], ['distributed', 'Distributed systems'], ['cloud', 'Cloud & DevOps'], ['ai', 'AI & LLMs'], ['practices', 'Practices'], ['security', 'Security'], ['dsa', 'Algorithms'], ['general', 'General']]
const MODES = [['feeds', 'Engineering blogs', 'news'], ['hn', 'Hacker News', 'flame'], ['arxiv', 'arXiv papers', 'file'], ['url', 'Read any URL', 'link'], ['saved', 'Reading list', 'bookmark']]
const mode = ref('feeds'), topic = ref(''), filter = ref(''), sources = ref([]), picked = ref([])
const items = ref([]), errors = ref([]), loading = ref(false), err = ref('')
const hnQ = ref('distributed systems'), hnSort = ref('relevance'), arxivQ = ref('retrieval augmented generation'), urlIn = ref('')
const article = ref(null), artLoading = ref(false), artErr = ref('')

async function api(path) { const r = await fetch(path); if (!(r.headers.get('content-type') || '').includes('json')) throw new Error('The live article feed needs the API server. Run the project locally with npm run dev to use the Library.'); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.statusText); return j }
async function run(fn) { loading.value = true; err.value = ''; try { await fn() } catch (e) { err.value = 'Could not reach the scraper API (' + e.message + '). Is `npm run dev` running?' } finally { loading.value = false } }
const loadFeeds = () => run(async () => { const p = new URLSearchParams({ topics: topic.value, sources: picked.value.join(','), q: filter.value }); const j = await api('/api/feed?' + p); items.value = j.items; errors.value = j.errors })
const searchHN = () => run(async () => { items.value = await api(`/api/hn?q=${encodeURIComponent(hnQ.value)}&sort=${hnSort.value}`) })
const searchArxiv = () => run(async () => { items.value = await api(`/api/arxiv?q=${encodeURIComponent(arxivQ.value)}`) })
async function openArticle(it) {
  article.value = { title: it.title, url: it.url, content: '' }; artLoading.value = true; artErr.value = ''
  try { article.value = await api('/api/article?url=' + encodeURIComponent(it.url)) } catch (e) { artErr.value = e.message } finally { artLoading.value = false }
}
const isSaved = it => state.saved.some(s => s.url === it.url)
const toggleSave = it => { const i = state.saved.findIndex(s => s.url === it.url); i >= 0 ? state.saved.splice(i, 1) : state.saved.unshift({ title: it.title, url: it.url, source: it.source || it.siteName, date: it.date, summary: it.summary }) }
const shown = computed(() => mode.value === 'saved' ? state.saved : items.value)
const setMode = m => { mode.value = m; items.value = []; article.value = null; if (m === 'feeds') loadFeeds(); if (m === 'hn') searchHN(); if (m === 'arxiv') searchArxiv() }
const fmt = d => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const hue = s => { let h = 0; for (const c of s || '') h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 48%)` }
const initials = s => (s || '?').replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const onEsc = e => { if (e.key === 'Escape') article.value = null }
watch(article, a => { document.body.style.overflow = a ? 'hidden' : '' })
onMounted(async () => { addEventListener('keydown', onEsc); try { sources.value = await api('/api/sources') } catch {} ; loadFeeds() })
onBeforeUnmount(() => { removeEventListener('keydown', onEsc); document.body.style.overflow = '' })
</script>

<template>
  <div class="page">
    <span class="eyebrow" style="color:var(--accent)"><Icon name="rss" :size="14" /> Tech Library</span>
    <h1>Read what the best engineers are writing</h1>
    <p class="lede">A live scraper over {{ sources.length || 'two dozen' }} engineering blogs, Hacker News and arXiv. Articles open in a clean reader, extracted server-side with Mozilla Readability.</p>

    <div class="lab-tabs">
      <button v-for="[m, l, ic] in MODES" :key="m" class="chip-btn" :class="{ on: mode === m }" @click="setMode(m)">
        <Icon :name="ic" :size="14" /> {{ l }}<template v-if="m === 'saved'"> ({{ state.saved.length }})</template>
      </button>
    </div>

    <div class="lib-controls" v-if="mode !== 'saved'">
      <template v-if="mode === 'feeds'">
        <select v-model="topic" @change="loadFeeds"><option v-for="[v, l] in TOPICS" :key="v" :value="v">{{ l }}</option></select>
        <input v-model="filter" placeholder="Filter by keyword — kernel, Kafka, RAG…" @keyup.enter="loadFeeds" />
        <details class="src-pick"><summary><Icon name="filter" :size="14" />&nbsp;Sources ({{ picked.length || 'all' }})</summary>
          <div><label v-for="s in sources" :key="s.id"><input v-model="picked" type="checkbox" :value="s.id" /> {{ s.name }}</label>
            <button class="btn small" style="margin-top:8px" @click="loadFeeds">Apply</button></div>
        </details>
        <button class="btn" @click="loadFeeds"><Icon name="refresh" :size="15" /> Fetch</button>
      </template>
      <template v-if="mode === 'hn'">
        <input v-model="hnQ" placeholder="Search Hacker News stories" @keyup.enter="searchHN" />
        <select v-model="hnSort"><option value="relevance">Most relevant</option><option value="date">Newest</option></select>
        <button class="btn" @click="searchHN"><Icon name="search" :size="15" /> Search</button>
      </template>
      <template v-if="mode === 'arxiv'">
        <input v-model="arxivQ" placeholder="Search arXiv papers" @keyup.enter="searchArxiv" /><button class="btn" @click="searchArxiv"><Icon name="search" :size="15" /> Search</button>
      </template>
      <template v-if="mode === 'url'">
        <input v-model="urlIn" placeholder="https://… paste any article URL" @keyup.enter="openArticle({ url: urlIn, title: urlIn })" />
        <button class="btn" @click="openArticle({ url: urlIn, title: urlIn })"><Icon name="book" :size="15" /> Extract & read</button>
      </template>
    </div>

    <p v-if="err" class="err">{{ err }}</p>
    <p v-if="errors.length && mode === 'feeds'" class="meta"><Icon name="alert" :size="13" /> {{ errors.length }} source(s) unavailable: {{ errors.map(e => e.source).join(', ') }}</p>

    <div class="lib">
      <div class="lib-list">
        <template v-if="loading"><div v-for="n in 6" :key="n" class="skeleton"></div></template>
        <article v-for="it in shown" v-else :key="it.url" class="lib-item" :class="{ active: article?.url === it.url }">
          <div class="lib-src"><span class="favicon" :style="{ background: hue(it.source) }">{{ initials(it.source) }}</span>{{ it.source }}<span v-if="it.date">· {{ fmt(it.date) }}</span>
            <span v-if="it.points" style="margin-left:auto">{{ it.points }} pts</span></div>
          <a href="#" @click.prevent="openArticle(it)"><h4>{{ it.title }}</h4></a>
          <p v-if="it.summary">{{ it.summary }}</p>
          <div class="row">
            <button class="link" @click="toggleSave(it)"><Icon :name="isSaved(it) ? 'bookmarked' : 'bookmark'" :size="14" /> {{ isSaved(it) ? 'Saved' : 'Save' }}</button>
            <a :href="it.url" target="_blank" rel="noopener" class="link"><Icon name="external" :size="13" /> Original</a>
            <a v-if="it.hn" :href="it.hn" target="_blank" rel="noopener" class="link">{{ it.comments }} comments</a>
          </div>
        </article>
        <div v-if="!loading && !shown.length && mode !== 'url'" class="empty">{{ mode === 'saved' ? 'Nothing saved yet — use “Save” on any article.' : 'No articles found.' }}</div>
      </div>
      <div v-if="article" class="reader-overlay" role="dialog" aria-modal="true">
        <button class="icon close" @click="article = null" aria-label="Close article"><Icon name="x" :size="18" /></button>
        <div class="reader-inner">
        <div class="meta">{{ article.siteName }}{{ article.byline ? ' · ' + article.byline : '' }}</div>
        <h2>{{ article.title }}</h2>
        <div class="row">
          <a :href="article.url" target="_blank" rel="noopener" class="link"><Icon name="external" :size="13" /> Open original</a>
          <button class="link" @click="toggleSave(article)"><Icon :name="isSaved(article) ? 'bookmarked' : 'bookmark'" :size="14" /> {{ isSaved(article) ? 'Saved' : 'Save' }}</button>
        </div>
        <template v-if="artLoading"><div class="skeleton" style="margin-top:20px;height:16px" v-for="n in 8" :key="n"></div></template>
        <p v-if="artErr" class="err">{{ artErr }} — open the original instead.</p>
        <div class="prose" v-html="article.content"></div>
        </div>
      </div>
    </div>
  </div>
</template>
