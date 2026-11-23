<script setup>
// A process's virtual address space: text, data, BSS, heap (grows up via brk/mmap), mmap region, stack (grows down).
import { ref } from 'vue'
const frames = ref([{ fn: 'main', bytes: 48 }]), heap = ref([]), mmaps = ref([]), msg = ref('Call functions and malloc to see the stack and heap grow toward each other.')
const FN = ['parse', 'compute', 'helper', 'recurse', 'qsort', 'printf']
const call = () => { const f = FN[Math.floor(Math.random() * FN.length)], b = 32 + 16 * Math.floor(Math.random() * 6)
  if (frames.value.length >= 9) { msg.value = 'Stack overflow: the stack hit its guard page (ulimit -s, usually 8 MiB) → SIGSEGV.'; return }
  frames.value.push({ fn: f, bytes: b }); msg.value = `call ${f}(): push return address + saved RBP + ${b} bytes of locals. RSP decreases.` }
const ret = () => { if (frames.value.length > 1) { const f = frames.value.pop(); msg.value = `ret from ${f.fn}(): RSP moves back up; its locals are now garbage (dangling pointers!).` } }
const malloc = () => { const s = [24, 64, 200, 1024][Math.floor(Math.random() * 4)]
  if (heap.value.length >= 8) { msg.value = 'Large/again: glibc would use mmap() for ≥128 KiB requests instead of brk.'; mmaps.value.push(256); return }
  heap.value.push(s); msg.value = `malloc(${s}): allocator finds a free chunk in the heap; if none, it calls brk()/sbrk() to move the program break up.` }
const free = () => { if (heap.value.length) { heap.value.pop(); msg.value = 'free(): chunk returns to the allocator’s free lists (tcache/bins). Memory is usually NOT returned to the OS immediately.' } }
const REGIONS = [['Kernel space', 'Mapped in every process but only accessible in ring 0 (top half of the 64-bit space).', '#6b7280']]
</script>

<template>
  <div>
    <div class="w-title">Process virtual address space</div>
    <p class="w-sub">High addresses at the top. Each process gets this private layout; the page tables map it onto physical frames.</p>
    <div class="w-row"><button class="btn small" @click="call">call f()</button><button class="btn ghost small" @click="ret">return</button><button class="btn small" @click="malloc">malloc()</button><button class="btn ghost small" @click="free">free()</button></div>
    <div style="display:grid;grid-template-columns:150px 1fr;gap:4px;font-size:13px" class="mono">
      <div style="color:var(--muted)">0xffff…ffff</div><div style="background:#6b7280;color:#fff;padding:6px 10px;border-radius:6px">Kernel space (ring 0 only)</div>
      <div style="color:var(--muted)">0x7ffd…(RSP)</div>
      <div style="border:2px solid #ec4899;border-radius:6px;padding:4px">
        <div style="color:#ec4899;font-weight:800">STACK ↓ grows down</div>
        <div v-for="(f, i) in frames" :key="i" :style="{ background: 'color-mix(in srgb,#ec4899 ' + (20 + i * 8) + '%,transparent)', margin: '2px 0', padding: '3px 8px', borderRadius: '4px' }">frame: {{ f.fn }}() · ret addr · saved rbp · {{ f.bytes }}B locals</div>
      </div>
      <div style="color:var(--muted)">0x7f…</div><div style="border:2px dashed #8b5cf6;border-radius:6px;padding:6px 10px"><b style="color:#8b5cf6">mmap region</b> — shared libs (libc.so), mmap’d files, big mallocs <span v-for="(m, i) in mmaps" :key="i" class="chip">anon {{ m }}K</span></div>
      <div></div><div style="text-align:center;color:var(--muted);padding:6px">⋮ unmapped gap — touching it = segfault ⋮</div>
      <div style="color:var(--muted)">program break</div>
      <div style="border:2px solid #16a34a;border-radius:6px;padding:4px">
        <div style="display:flex;flex-wrap:wrap;gap:3px"><span v-for="(h, i) in heap" :key="i" :style="{ background: '#16a34a', color: '#fff', padding: '2px 6px', borderRadius: '4px', width: Math.min(200, 30 + h / 6) + 'px' }">{{ h }}B</span></div>
        <div style="color:#16a34a;font-weight:800">HEAP ↑ grows up (brk)</div>
      </div>
      <div style="color:var(--muted)"></div><div style="background:var(--soft);padding:6px 10px;border-radius:6px"><b>.bss</b> — zero-initialized globals (no space in the file)</div>
      <div style="color:var(--muted)"></div><div style="background:var(--soft);padding:6px 10px;border-radius:6px"><b>.data</b> — initialized globals</div>
      <div style="color:var(--muted)">0x0040_0000</div><div style="background:var(--node);padding:6px 10px;border-radius:6px"><b>.text</b> — machine code (read + execute, not writable)</div>
      <div style="color:var(--muted)">0x0</div><div style="color:var(--bad);padding:4px 10px">NULL page unmapped → dereferencing NULL faults</div>
    </div>
    <div class="w-out">{{ msg }}</div>
  </div>
</template>
