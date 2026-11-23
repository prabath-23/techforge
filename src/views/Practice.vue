<script setup>
import { ref, computed, reactive, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PATTERNS, PROBLEMS, DESIGNS, DESIGN_SECTIONS, STORY_PROMPTS } from '../content/practice.js'
import { state } from '../lib/progress.js'
import Quiz from '../components/Quiz.vue'
import Icon from '../components/Icon.vue'

const route = useRoute(), router = useRouter()
const TABS = [
  { id: 'coding', label: 'Coding drills', icon: 'code' },
  { id: 'design', label: 'System design rehearsal', icon: 'server' },
  { id: 'stories', label: 'Story builder', icon: 'book' },
  { id: 'review', label: 'Review', icon: 'refresh' },
]
const tab = computed(() => TABS.some(t => t.id === route.query.tab) ? route.query.tab : 'coding')
const setTab = id => router.replace({ query: { tab: id } })

// ---- shared timer ----
const timer = reactive({ secs: 0, on: false, limit: 0 }); let tick
const startTimer = (limit = 0) => { clearInterval(tick); timer.secs = 0; timer.limit = limit; timer.on = true; tick = setInterval(() => timer.secs++, 1000) }
const stopTimer = () => { clearInterval(tick); timer.on = false }
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
onBeforeUnmount(() => clearInterval(tick))

// ---- coding ----
const pat = ref('All'), diff = ref('All'), status = ref('All')
const list = computed(() => PROBLEMS.filter(x => (pat.value === 'All' || x.pattern === pat.value) && (diff.value === 'All' || x.diff === diff.value)
  && (status.value === 'All' || (status.value === 'Solved') === !!state.solved[x.id])))
const solvedCount = computed(() => PROBLEMS.filter(x => state.solved[x.id]).length)
const patPct = p => { const all = PROBLEMS.filter(x => x.pattern === p); return Math.round(100 * all.filter(x => state.solved[x.id]).length / all.length) }
const cur = ref(null), hintsShown = ref(0), showApproach = ref(false)
const open = x => { cur.value = x; hintsShown.value = 0; showApproach.value = false; stopTimer(); timer.secs = 0 }
watch(tab, () => { stopTimer(); timer.secs = 0 })
const lcUrl = x => `https://leetcode.com/problemset/?search=${encodeURIComponent(x.title)}`
const markSolved = x => { if (state.solved[x.id]) delete state.solved[x.id]; else { state.solved[x.id] = { at: Date.now(), secs: timer.secs, hints: hintsShown.value } ; stopTimer() } }

// ---- design ----
const dz = ref(DESIGNS[0].id)
const design = computed(() => DESIGNS.find(x => x.id === dz.value))
const answers = computed(() => (state.designs[dz.value] ||= {}))
const revealed = reactive({})
const words = t => (t || '').trim().split(/\s+/).filter(Boolean).length
const pickDesign = id => { dz.value = id; for (const k in revealed) delete revealed[k]; stopTimer(); timer.secs = 0 }

// ---- stories ----
const blank = () => ({ title: '', prompt: STORY_PROMPTS[0], s: '', t: '', a: '', r: '', l: '' })
const draft = reactive(blank()), editing = ref(-1)
const saveStory = () => { if (!draft.title.trim()) return; const s = { ...draft }; if (editing.value >= 0) state.stories[editing.value] = s; else state.stories.push(s); Object.assign(draft, blank()); editing.value = -1 }
const editStory = i => { Object.assign(draft, state.stories[i]); editing.value = i; scrollTo({ top: 0, behavior: 'smooth' }) }
const removeStory = i => { state.stories.splice(i, 1); if (editing.value === i) { Object.assign(draft, blank()); editing.value = -1 } }
const copied = ref(-1)
const copyStory = async (s, i) => { try { await navigator.clipboard.writeText(`${s.title}\n\nSituation: ${s.s}\nTask: ${s.t}\nAction: ${s.a}\nResult: ${s.r}\nLearning: ${s.l}`); copied.value = i; setTimeout(() => (copied.value = -1), 1500) } catch {} }
const coverage = computed(() => STORY_PROMPTS.map(p => [p, state.stories.filter(s => s.prompt === p).length]))

// ---- review ----
const now = Date.now()
const due = computed(() => Object.entries(state.review).filter(([, r]) => r.due <= now))
const later = computed(() => Object.entries(state.review).filter(([, r]) => r.due > now).sort((a, b) => a[1].due - b[1].due))
const chapterOf = id => id.split('#')[0]
const inDays = t => Math.max(1, Math.round((t - now) / 864e5))
</script>

<template>
  <div class="prac">
    <header class="prac-head">
      <span class="eyebrow" style="color:var(--accent)"><Icon name="target" :size="14" /> Practice</span>
      <h1>Train for the interview, not just the reading</h1>
      <p class="lede">Solve problems by pattern with hints, rehearse system design against a clock, turn your experience into stories, and revisit questions you missed.</p>
      <nav class="prac-tabs">
        <button v-for="t in TABS" :key="t.id" :class="{ on: tab === t.id }" @click="setTab(t.id)">
          <Icon :name="t.icon" :size="15" /> {{ t.label }}
          <span v-if="t.id === 'review' && due.length" class="prac-badge">{{ due.length }}</span>
        </button>
      </nav>
    </header>

    <!-- CODING -->
    <section v-if="tab === 'coding'" class="code-grid">
      <aside class="code-side">
        <div class="code-stat"><b>{{ solvedCount }}</b><span>of {{ PROBLEMS.length }} solved</span></div>
        <div class="topics-h">Patterns</div>
        <button class="pat" :class="{ on: pat === 'All' }" @click="pat = 'All'">All patterns</button>
        <button v-for="p in PATTERNS" :key="p" class="pat" :class="{ on: pat === p }" @click="pat = p">
          <span>{{ p }}</span><i class="pat-bar"><i :style="{ width: patPct(p) + '%' }"></i></i>
        </button>
      </aside>
      <div class="code-main">
        <div class="code-filters">
          <select v-model="diff" aria-label="Difficulty"><option>All</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
          <select v-model="status" aria-label="Status"><option>All</option><option>Solved</option><option>Unsolved</option></select>
          <span class="code-count">{{ list.length }} problems</span>
        </div>
        <div class="code-split">
          <div class="code-list">
            <button v-for="x in list" :key="x.id" class="code-item" :class="{ on: cur?.id === x.id, done: state.solved[x.id] }" @click="open(x)">
              <i class="code-check"><Icon v-if="state.solved[x.id]" name="check" :size="12" :stroke="3" /></i>
              <span class="code-title">{{ x.title }}</span>
              <span class="diff" :class="x.diff.toLowerCase()">{{ x.diff }}</span>
            </button>
          </div>
          <article v-if="cur" class="code-card">
            <div class="code-card-top">
              <span class="chap-crumb">{{ cur.pattern }} · LeetCode {{ cur.lc }}</span>
              <span class="diff" :class="cur.diff.toLowerCase()">{{ cur.diff }}</span>
            </div>
            <h2>{{ cur.title }}</h2>
            <div class="code-actions">
              <a :href="lcUrl(cur)" target="_blank" rel="noopener" class="btn sm"><Icon name="external" :size="13" /> Open problem</a>
              <button class="btn sm" @click="timer.on ? stopTimer() : startTimer()"><Icon name="clock" :size="13" /> {{ timer.on ? 'Stop' : 'Start' }} {{ fmt(timer.secs) }}</button>
              <router-link v-if="cur.read" :to="`/read/${cur.read}`" class="btn sm ghost"><Icon name="book" :size="13" /> Related chapter</router-link>
            </div>
            <div class="hints">
              <div v-for="(h, i) in cur.hints.slice(0, hintsShown)" :key="i" class="hint"><b>Hint {{ i + 1 }}</b>{{ h }}</div>
              <button v-if="hintsShown < cur.hints.length" class="btn sm ghost" @click="hintsShown++">Show hint {{ hintsShown + 1 }} of {{ cur.hints.length }}</button>
            </div>
            <div v-if="showApproach" class="approach"><b>Approach</b><p>{{ cur.approach }}</p><b>Complexity</b><p>{{ cur.cx }}</p></div>
            <button v-else class="btn sm ghost" @click="showApproach = true">Reveal the approach</button>
            <div class="code-foot">
              <button class="btn" :class="state.solved[cur.id] ? 'ghost' : 'primary'" @click="markSolved(cur)">
                <Icon :name="state.solved[cur.id] ? 'refresh' : 'check'" :size="15" /> {{ state.solved[cur.id] ? 'Mark unsolved' : 'Mark solved' }}
              </button>
              <span v-if="state.solved[cur.id]" class="code-meta">Solved in {{ fmt(state.solved[cur.id].secs || 0) }} with {{ state.solved[cur.id].hints || 0 }} hint(s)</span>
            </div>
          </article>
          <div v-else class="code-empty">Pick a problem. Try it on your own first, use hints one at a time, and reveal the approach only if you're stuck.</div>
        </div>
      </div>
    </section>

    <!-- DESIGN -->
    <section v-else-if="tab === 'design'" class="dz">
      <div class="dz-pick">
        <button v-for="x in DESIGNS" :key="x.id" class="chip-btn" :class="{ on: dz === x.id }" @click="pickDesign(x.id)">{{ x.title }}</button>
      </div>
      <div class="dz-brief">
        <div><h2>{{ design.title }}</h2><p>{{ design.prompt }}</p>
          <router-link :to="`/read/${design.read}`" class="dz-read"><Icon name="book" :size="13" /> Read the related case study after you finish</router-link></div>
        <div class="dz-clock" :class="{ over: timer.secs > 45 * 60 }">
          <span>{{ fmt(timer.secs) }} <small>/ 45:00</small></span>
          <button class="btn sm" @click="timer.on ? stopTimer() : startTimer(2700)">{{ timer.on ? 'Pause' : timer.secs ? 'Resume' : 'Start 45 min' }}</button>
        </div>
      </div>
      <div class="dz-secs">
        <div v-for="(s, i) in DESIGN_SECTIONS" :key="s.id" class="dz-sec">
          <div class="dz-sec-h"><span class="stage-n">{{ i + 1 }}</span><div><b>{{ s.label }}</b><small>{{ s.hint }}</small></div></div>
          <textarea v-model="answers[s.id]" rows="4" :placeholder="'Your ' + s.label.toLowerCase() + '…'"></textarea>
          <div class="dz-row">
            <span class="code-meta">{{ words(answers[s.id]) }} words</span>
            <button class="btn sm ghost" @click="revealed[s.id] = !revealed[s.id]">{{ revealed[s.id] ? 'Hide' : 'Compare with' }} model answer</button>
          </div>
          <div v-if="revealed[s.id]" class="approach"><b>Model answer</b><p>{{ design.model[s.id] }}</p></div>
        </div>
      </div>
    </section>

    <!-- STORIES -->
    <section v-else-if="tab === 'stories'" class="st">
      <div class="st-form">
        <h2>{{ editing >= 0 ? 'Edit story' : 'New story' }}</h2>
        <label>Title<input v-model="draft.title" placeholder="e.g. Cutting HIDS false positives by 70%" /></label>
        <label>Which question does it answer?<select v-model="draft.prompt"><option v-for="p in STORY_PROMPTS" :key="p">{{ p }}</option></select></label>
        <label>Situation <small>, one or two sentences of context</small><textarea v-model="draft.s" rows="2"></textarea></label>
        <label>Task <small>, what you owned</small><textarea v-model="draft.t" rows="2"></textarea></label>
        <label>Action <small>, what YOU did, in detail; most of the story</small><textarea v-model="draft.a" rows="5"></textarea></label>
        <label>Result <small>, numbers</small><textarea v-model="draft.r" rows="2"></textarea></label>
        <label>Learning <small>, what you'd do differently</small><textarea v-model="draft.l" rows="2"></textarea></label>
        <div class="dz-row"><button class="btn primary" @click="saveStory"><Icon name="check" :size="15" /> {{ editing >= 0 ? 'Save changes' : 'Save story' }}</button><span class="code-meta">Stories are saved in this browser only.</span></div>
      </div>
      <div class="st-list">
        <div class="topics-h">Coverage</div>
        <div v-for="[p, n] in coverage" :key="p" class="st-cov" :class="{ ok: n }"><i>{{ n || '–' }}</i>{{ p }}</div>
        <div class="topics-h" style="margin-top:18px">Your stories ({{ state.stories.length }})</div>
        <div v-for="(s, i) in state.stories" :key="i" class="st-item">
          <b>{{ s.title }}</b><small>{{ s.prompt }}</small>
          <div class="dz-row"><button class="btn sm ghost" @click="editStory(i)">Edit</button><button class="btn sm ghost" @click="copyStory(s, i)">{{ copied === i ? 'Copied' : 'Copy text' }}</button><button class="btn sm ghost" @click="removeStory(i)">Delete</button></div>
        </div>
        <p v-if="!state.stories.length" class="code-meta">No stories yet. Aim for 8–12 that together cover every prompt on the left.</p>
      </div>
    </section>

    <!-- REVIEW -->
    <section v-else class="rv">
      <template v-if="due.length">
        <p class="wrap-p">{{ due.length }} question{{ due.length > 1 ? 's' : '' }} you missed are due. Answer correctly and each comes back less often (1 → 3 → 7 → 16 days) until it retires.</p>
        <div v-for="[id, r] in due" :key="id" class="rv-item">
          <router-link :to="`/read/${chapterOf(id)}?view=quiz`" class="chap-crumb">{{ chapterOf(id).replace('/', ' / ') }}</router-link>
          <Quiz v-bind="{ q: r.q, options: r.options, answer: r.answer, explain: r.explain }" :id="id" />
        </div>
      </template>
      <div v-else class="code-empty">Nothing due right now. Questions you answer wrongly in any chapter quiz appear here a day later.</div>
      <template v-if="later.length">
        <div class="topics-h" style="margin-top:22px">Coming up</div>
        <div v-for="[id, r] in later" :key="id" class="st-cov"><i>{{ inDays(r.due) }}d</i>{{ r.q }}</div>
      </template>
    </section>
  </div>
</template>
