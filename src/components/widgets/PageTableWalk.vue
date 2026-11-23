<script setup>
// x86-64 4-level paging: split a 48-bit virtual address into PML4/PDPT/PD/PT indices + offset, walk with a TLB.
import { ref, computed } from 'vue'
const addr = ref('0x00007ffd5e8a3c14')
const tlb = ref([]) // virtual page numbers cached
const log = ref([]), step = ref(-1), stats = ref({ hits: 0, misses: 0 })
const parsed = computed(() => {
  let v; try { v = BigInt(addr.value.trim()) } catch { return null }
  v &= (1n << 48n) - 1n
  const f = (sh, bits) => Number((v >> BigInt(sh)) & ((1n << BigInt(bits)) - 1n))
  return { v, pml4: f(39, 9), pdpt: f(30, 9), pd: f(21, 9), pt: f(12, 9), off: f(0, 12), vpn: v >> 12n, bits: v.toString(2).padStart(48, '0') }
})
const fakeFrame = vpn => Number((vpn * 2654435761n) % 0x3ffffn) // deterministic pseudo physical frame
const LEVELS = [['PML4', 'pml4', '#6366f1', 39], ['PDPT', 'pdpt', '#0ea5e9', 30], ['PD', 'pd', '#16a34a', 21], ['PT', 'pt', '#f59e0b', 12], ['Offset', 'off', '#ec4899', 0]]
const SEG = [[0, 9], [9, 18], [18, 27], [27, 36], [36, 48]]
function translate() {
  const a = parsed.value; if (!a) return
  const hit = tlb.value.includes(a.vpn.toString())
  const frame = fakeFrame(a.vpn), phys = '0x' + ((BigInt(frame) << 12n) | BigInt(a.off)).toString(16)
  if (hit) { stats.value.hits++; log.value = [`TLB HIT for VPN 0x${a.vpn.toString(16)} → frame 0x${frame.toString(16)}`, `Physical address = ${phys}. Cost: ~1 cycle. No memory accesses for translation.`]; step.value = 9; return }
  stats.value.misses++
  log.value = [`TLB MISS for VPN 0x${a.vpn.toString(16)} — hardware page walker starts at CR3.`,
    `CR3 → PML4 table base. Read entry [${a.pml4}] → physical address of a PDPT. (memory access 1)`,
    `PDPT[${a.pdpt}] → address of a Page Directory. (memory access 2) — a 1 GiB huge page would stop here.`,
    `PD[${a.pd}] → address of a Page Table. (memory access 3) — a 2 MiB huge page would stop here.`,
    `PT[${a.pt}] → PTE: present=1, frame=0x${frame.toString(16)}, R/W, U/S, NX bits checked. (memory access 4)`,
    `Physical = (frame << 12) | offset 0x${a.off.toString(16)} = ${phys}. Entry inserted into the TLB.`]
  tlb.value = [a.vpn.toString(), ...tlb.value.filter(x => x !== a.vpn.toString())].slice(0, 4)
  step.value = 0
}
const random = () => { addr.value = '0x' + (BigInt(Math.floor(Math.random() * 2 ** 32)) * 4096n + BigInt(Math.floor(Math.random() * 4096))).toString(16) }
const neighbor = () => { if (parsed.value) addr.value = '0x' + (parsed.value.v + 8n).toString(16) }
</script>

<template>
  <div>
    <div class="w-title">x86-64 page table walk</div>
    <p class="w-sub">Enter a virtual address. See how the MMU splits it into four 9-bit table indices and a 12-bit offset, and how the TLB short-circuits the walk.</p>
    <div class="w-row">
      <input v-model="addr" class="mono" style="width:230px" />
      <button class="btn small" @click="translate">Translate</button>
      <button class="btn ghost small" @click="neighbor">Same page (+8 bytes)</button>
      <button class="btn ghost small" @click="random">Random address</button>
    </div>
    <div v-if="parsed" style="overflow-x:auto">
      <div class="mono" style="display:flex;gap:4px;margin:12px 0;font-size:12px">
        <div v-for="(l, i) in LEVELS" :key="l[0]" :style="{ flex: SEG[i][1] - SEG[i][0], border: '2px solid ' + l[2], borderRadius: '8px', padding: '6px', textAlign: 'center', minWidth: '90px' }">
          <div :style="{ color: l[2], fontWeight: 800 }">{{ l[0] }} <small>bits {{ l[3] + (i < 4 ? 8 : 11) }}–{{ l[3] }}</small></div>
          <div style="word-break:break-all">{{ parsed.bits.slice(SEG[i][0], SEG[i][1]) }}</div>
          <div style="font-size:15px;font-weight:800">{{ parsed[l[1]] }}</div>
        </div>
      </div>
    </div>
    <p v-else class="err">Not a valid number.</p>
    <div class="w-out mono" style="font-size:13px">
      <div v-for="(l, i) in log" :key="i" :style="{ opacity: i <= step || step === 9 ? 1 : .3, cursor: 'pointer' }" @click="step = i">{{ l }}</div>
      <em v-if="!log.length">Press Translate.</em>
    </div>
    <div class="w-row" v-if="step >= 0 && step < log.length - 1 && step !== 9"><button class="btn small" @click="step++">Next level</button></div>
    <div class="w-row mono" style="font-size:13px">TLB (4 entries, LRU): <span v-for="v in tlb" :key="v" class="chip">VPN 0x{{ BigInt(v).toString(16) }}</span> · hits {{ stats.hits }} / misses {{ stats.misses }}</div>
  </div>
</template>
