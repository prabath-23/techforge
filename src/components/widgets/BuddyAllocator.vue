<script setup>
// Buddy allocator over a 1024 KiB arena: splitting on allocate, coalescing with buddy on free.
import { ref } from 'vue'
const TOTAL = 1024, MIN = 32
const blocks = ref([{ off: 0, size: TOTAL, used: false, tag: '' }])
const req = ref(100), msg = ref('Allocate a few sizes, then free them and watch buddies merge back.'), n = ref(1)
const COL = ['#6366f1', '#0ea5e9', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444']
function alloc() {
  let need = MIN; while (need < req.value) need *= 2
  if (need > TOTAL) return (msg.value = 'Too large for the arena.')
  const bs = blocks.value
  let i = bs.map((b, k) => [b, k]).filter(([b]) => !b.used && b.size >= need).sort((a, b) => a[0].size - b[0].size)[0]?.[1]
  if (i === undefined) return (msg.value = `Out of memory for ${need} KiB (external fragmentation, free space exists but no block of that order).`)
  let splits = 0
  while (bs[i].size > need) { const b = bs[i], h = b.size / 2; bs.splice(i, 1, { off: b.off, size: h, used: false }, { off: b.off + h, size: h, used: false }); splits++ }
  const tag = 'A' + n.value++; bs[i].used = true; bs[i].tag = tag; bs[i].req = req.value; bs[i].color = COL[(n.value - 2) % 8]
  msg.value = `${tag}: requested ${req.value} KiB → rounded to order block ${need} KiB (${need - req.value} KiB internal fragmentation). ${splits} split(s).`
}
function free(k) {
  const bs = blocks.value; const tag = bs[k].tag; bs[k].used = false; bs[k].tag = ''; let merges = 0
  for (;;) { const b = bs[k], buddyOff = b.off ^ b.size, j = bs.findIndex(x => x.off === buddyOff && x.size === b.size && !x.used)
    if (j < 0 || b.size === TOTAL) break
    const lo = Math.min(k, j); bs.splice(lo, 2, { off: Math.min(b.off, buddyOff), size: b.size * 2, used: false }); k = lo; merges++ }
  msg.value = `Freed ${tag}. Buddy address = offset XOR size. ${merges} merge(s).`
}
</script>

<template>
  <div>
    <div class="w-title">Buddy allocator (how the kernel hands out physical pages)</div>
    <p class="w-sub">Arena = 1024 KiB, min block 32 KiB. Click an allocated block to free it.</p>
    <div class="w-row"><label>Request (KiB) <input v-model.number="req" type="number" min="1" max="1024" style="width:80px" /></label><button class="btn small" @click="alloc">malloc</button>
      <button class="btn ghost small" @click="blocks = [{ off: 0, size: TOTAL, used: false }]; n = 1">Reset</button></div>
    <div style="display:flex;height:70px;border-radius:10px;overflow:hidden;border:1px solid var(--line);margin:10px 0">
      <div v-for="(b, k) in blocks" :key="b.off + '-' + b.size" :title="`offset ${b.off} size ${b.size}`" @click="b.used && free(k)"
        :style="{ flex: b.size, background: b.used ? b.color : 'var(--soft)', borderRight: '1px solid var(--panel)', color: b.used ? '#fff' : 'var(--muted)', cursor: b.used ? 'pointer' : 'default', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }">
        <b v-if="b.used">{{ b.tag }}</b><span>{{ b.size }}K</span>
        <div v-if="b.used" :style="{ position: 'absolute', bottom: 0, left: 0, height: '5px', width: 100 * b.req / b.size + '%', background: 'rgba(255,255,255,.7)' }"></div>
      </div>
    </div>
    <div class="w-out">{{ msg }}</div>
  </div>
</template>
