import { reactive, watch } from 'vue'
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
export const state = reactive({
  done: load('tf-done', {}),          // { "os/boot": true }
  saved: load('tf-saved', []),        // reading list from Library
  theme: load('tf-theme', 'light'),
  quiz: load('tf-quiz', {}),
  sideCollapsed: load('tf-sideCollapsed', false),
  solved: load('tf-solved', {}),       // { "two-sum": { at, secs } }
  designs: load('tf-designs', {}),     // { promptId: { sectionId: text } }
  stories: load('tf-stories', []),     // STAR stories
  review: load('tf-review', {}),       // missed quiz questions with spaced-repetition box/due
})
for (const k of ['done', 'saved', 'theme', 'quiz', 'sideCollapsed', 'solved', 'designs', 'stories', 'review'])
  watch(() => state[k], v => { try { localStorage.setItem('tf-' + k, JSON.stringify(v)) } catch {} }, { deep: true })
watch(() => state.theme, t => (document.documentElement.dataset.theme = t), { immediate: true })
