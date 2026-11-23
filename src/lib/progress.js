import { reactive, watch } from 'vue'
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
export const state = reactive({
  done: load('tf-done', {}),          // { "os/boot": true }
  saved: load('tf-saved', []),        // reading list from Library
  theme: load('tf-theme', 'light'),
  quiz: load('tf-quiz', {}),
  sideCollapsed: load('tf-sideCollapsed', false),          // { "os/boot#0": true }
})
for (const k of ['done', 'saved', 'theme', 'quiz', 'sideCollapsed'])
  watch(() => state[k], v => { try { localStorage.setItem('tf-' + k, JSON.stringify(v)) } catch {} }, { deep: true })
watch(() => state.theme, t => (document.documentElement.dataset.theme = t), { immediate: true })
