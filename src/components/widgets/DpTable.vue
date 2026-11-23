<script setup>
// DP table filler for LCS and edit distance, cell by cell, with the recurrence explained and traceback.
import { ref, computed } from 'vue'
const prob = ref('edit'), A = ref('kitten'), B = ref('sitting'), k = ref(-1)
const table = computed(() => {
  const a = A.value, b = B.value, n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0)), why = Array.from({ length: n + 1 }, () => Array(m + 1).fill(''))
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (prob.value === 'lcs') { if (!i || !j) { dp[i][j] = 0; why[i][j] = 'base case: empty prefix'; continue }
      if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; why[i][j] = `'${a[i - 1]}' = '${b[j - 1]}' → diag + 1 = ${dp[i][j]}` }
      else { dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); why[i][j] = `'${a[i - 1]}' ≠ '${b[j - 1]}' → max(up ${dp[i - 1][j]}, left ${dp[i][j - 1]})` } }
    else { if (!i || !j) { dp[i][j] = i + j; why[i][j] = `base: ${i + j} insert/delete ops`; continue }
      const c = a[i - 1] === b[j - 1] ? 0 : 1; dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c)
      why[i][j] = `min(delete ${dp[i - 1][j]}+1, insert ${dp[i][j - 1]}+1, ${c ? 'replace' : 'match'} ${dp[i - 1][j - 1]}+${c}) = ${dp[i][j]}` } }
  return { dp, why, n, m }
})
const total = computed(() => (table.value.n + 1) * (table.value.m + 1))
const cell = idx => [Math.floor(idx / (table.value.m + 1)), idx % (table.value.m + 1)]
const cur = computed(() => k.value >= 0 ? cell(k.value) : null)
</script>

<template>
  <div>
    <div class="w-title">Dynamic programming table</div>
    <p class="w-sub">Each cell depends only on already-computed neighbors (up, left, diagonal). Step through to see the recurrence at work.</p>
    <div class="w-row">
      <button class="chip-btn" :class="{ on: prob === 'edit' }" @click="prob = 'edit'; k = -1">Edit distance (Levenshtein)</button>
      <button class="chip-btn" :class="{ on: prob === 'lcs' }" @click="prob = 'lcs'; k = -1">Longest common subsequence</button>
      <input v-model="A" style="width:100px" @input="k = -1" /><input v-model="B" style="width:100px" @input="k = -1" />
      <button class="btn small" @click="k = Math.min(total - 1, k + 1)">Step</button><button class="btn ghost small" @click="k = total - 1">Fill all</button><button class="btn ghost small" @click="k = -1">Reset</button>
    </div>
    <div style="overflow-x:auto"><table class="mono" style="border-collapse:collapse;font-size:13px"><tbody>
      <tr><td></td><td style="padding:4px 8px;color:var(--muted)">ε</td><td v-for="(c, j) in B" :key="j" style="padding:4px 8px;font-weight:800">{{ c }}</td></tr>
      <tr v-for="i in table.n + 1" :key="i">
        <td style="padding:4px 8px;font-weight:800">{{ i === 1 ? 'ε' : A[i - 2] }}</td>
        <td v-for="j in table.m + 1" :key="j" @click="k = (i - 1) * (table.m + 1) + j - 1" :style="{ width: '34px', height: '30px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--line)',
          background: cur && cur[0] === i - 1 && cur[1] === j - 1 ? 'var(--accent)' : cur && ((cur[0] - 1 === i - 1 && cur[1] === j - 1) || (cur[0] === i - 1 && cur[1] - 1 === j - 1) || (cur[0] - 1 === i - 1 && cur[1] - 1 === j - 1)) ? 'color-mix(in srgb,var(--warn) 40%,transparent)' : 'transparent',
          color: cur && cur[0] === i - 1 && cur[1] === j - 1 ? '#fff' : 'var(--text)' }">{{ (i - 1) * (table.m + 1) + j - 1 <= k ? table.dp[i - 1][j - 1] : '' }}</td>
      </tr></tbody></table></div>
    <div class="w-out">{{ cur ? `dp[${cur[0]}][${cur[1]}]: ${table.why[cur[0]][cur[1]]}` : 'Press Step.' }}
      <b v-if="k === total - 1"><br />Answer: {{ prob === 'edit' ? 'edit distance' : 'LCS length' }} = {{ table.dp[table.n][table.m] }} · time O(n·m) = {{ total }} cells · space can be reduced to O(min(n,m)) by keeping two rows.</b></div>
  </div>
</template>
