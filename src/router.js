import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Track from './views/Track.vue'
import Chapter from './views/Chapter.vue'
import Library from './views/Library.vue'
import Labs from './views/Labs.vue'
import Search from './views/Search.vue'
import Practice from './views/Practice.vue'
import Cheatsheets from './views/Cheatsheets.vue'
export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Home },
    { path: '/track/:track', component: Track },
    { path: '/read/:track/:chapter/:lesson?', component: Chapter },
    { path: '/library', component: Library },
    { path: '/labs', component: Labs },
    { path: '/search', component: Search },
    { path: '/practice', component: Practice },
    { path: '/cheatsheets', component: Cheatsheets },
  ],
  scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 70 } : { top: 0 }),
})
