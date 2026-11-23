<script setup>
// Grid pathfinding: BFS, DFS, Dijkstra (weighted terrain), A* (Manhattan heuristic). Draw walls & mud.
import { ref, onUnmounted } from 'vue'
const R = 14, C = 28, S = [7, 3], T = [7, 24]
const cells = ref(Array(R * C).fill(0)) // 0 empty, 1 wall, 5 mud (cost 5)
const vis = ref({}), path = ref(new Set()), info = ref('Drag to draw. Mud costs 5 to cross — only Dijkstra/A* account for it.'), brush = ref(1), algo = ref('bfs')
let down = false, timer
const k = (r, c) => r * C + c
const paint = i => { if (i === k(...S) || i === k(...T)) return; cells.value[i] = cells.value[i] === brush.value ? 0 : brush.value }
function run() {
  clearInterval(timer); vis.value = {}; path.value = new Set()
  const dist = new Map([[k(...S), 0]]), prev = new Map(), order = [], seen = new Set()
  const h = i => Math.abs(Math.floor(i / C) - T[0]) + Math.abs((i % C) - T[1])
  let fr = [k(...S)]
  while (fr.length) {
    let cur
    if (algo.value === 'bfs') cur = fr.shift(); else if (algo.value === 'dfs') cur = fr.pop()
    else { let bi = 0; fr.forEach((x, i) => { const f = y => dist.get(y) + (algo.value === 'astar' ? h(y) : 0); if (f(x) < f(fr[bi])) bi = i }); cur = fr.splice(bi, 1)[0] }
    if (seen.has(cur)) continue; seen.add(cur); order.push(cur); if (cur === k(...T)) break
    const r = Math.floor(cur / C), c = cur % C
    for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue
      const n = k(nr, nc); if (cells.value[n] === 1 || seen.has(n)) continue
      const nd = dist.get(cur) + (['dijkstra', 'astar'].includes(algo.value) ? (cells.value[n] || 1) : 1)
      if (['bfs', 'dfs'].includes(algo.value)) { if (dist.has(n)) continue; dist.set(n, nd); prev.set(n, cur); fr.push(n) }
      else if (!dist.has(n) || nd < dist.get(n)) { dist.set(n, nd); prev.set(n, cur); fr.push(n) } }
  }
  let i = 0
  timer = setInterval(() => {
    for (let s = 0; s < 3 && i < order.length; s++) vis.value[order[i++]] = true
    if (i < order.length) return; clearInterval(timer)
    if (!prev.has(k(...T))) { info.value = `No path. Explored ${order.length} cells.`; return }
    let p = k(...T), cost = 0, len = 0; const ps = new Set(); while (p !== k(...S)) { ps.add(p); cost += cells.value[p] || 1; len++; p = prev.get(p) } path.value = ps
    info.value = `${algo.value.toUpperCase()}: explored ${order.length} cells · path length ${len} · path cost ${cost}. ${{ bfs: 'Shortest in steps, ignores weights.', dfs: 'Finds *a* path, usually not shortest.', dijkstra: 'Lowest total cost; explores in all directions.', astar: 'Lowest cost, explores far fewer cells thanks to the heuristic.' }[algo.value]}`
  }, 16)
}
const clear = () => { cells.value = Array(R * C).fill(0); vis.value = {}; path.value = new Set() }
const maze = () => { clear(); cells.value = cells.value.map((_, i) => i === k(...S) || i === k(...T) ? 0 : Math.random() < .22 ? 1 : Math.random() < .15 ? 5 : 0) }
const color = i => i === k(...S) ? 'var(--ok)' : i === k(...T) ? 'var(--bad)' : path.value.has(i) ? '#f59e0b' : cells.value[i] === 1 ? 'var(--muted)' : vis.value[i] ? (cells.value[i] === 5 ? '#a16207' : 'color-mix(in srgb,var(--accent-2) 50%,transparent)') : cells.value[i] === 5 ? '#ca8a0466' : 'var(--soft)'
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div>
    <div class="w-title">Graph search on a grid</div>
    <p class="w-sub">{{ info }}</p>
    <div class="w-row">
      <button v-for="a in ['bfs', 'dfs', 'dijkstra', 'astar']" :key="a" class="chip-btn" :class="{ on: algo === a }" @click="algo = a">{{ { bfs: 'BFS', dfs: 'DFS', dijkstra: 'Dijkstra', astar: 'A*' }[a] }}</button>
      <button class="btn small" @click="run">Run</button>
      <label><input type="radio" :value="1" v-model="brush" /> wall</label><label><input type="radio" :value="5" v-model="brush" /> mud (cost 5)</label>
      <button class="btn ghost small" @click="maze">Random</button><button class="btn ghost small" @click="clear">Clear</button>
    </div>
    <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${C},1fr)`, gap: '2px', userSelect: 'none' }" @mouseup="down = false" @mouseleave="down = false">
      <div v-for="(_, i) in cells" :key="i" :style="{ aspectRatio: 1, borderRadius: '3px', background: color(i), transition: 'background .15s' }"
        @mousedown="down = true; paint(i)" @mouseenter="down && paint(i)"></div>
    </div>
  </div>
</template>
