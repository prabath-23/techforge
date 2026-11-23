<script setup>
// CIDR / subnet calculator with bit-level view and longest-prefix-match routing demo.
import { ref, computed } from 'vue'
const cidr = ref('192.168.10.77/26'), probe = ref('192.168.10.100')
const ip2n = s => s.split('.').reduce((a, o) => (a << 8 >>> 0) + (+o), 0) >>> 0
const n2ip = n => [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.')
const bin = n => n.toString(2).padStart(32, '0').replace(/(.{8})(?!$)/g, '$1.')
const r = computed(() => {
  const m = cidr.value.trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/); if (!m || +m[2] > 32) return null
  const ip = ip2n(m[1]), len = +m[2], mask = len === 0 ? 0 : (~0 << (32 - len)) >>> 0, net = (ip & mask) >>> 0, bc = (net | ~mask) >>> 0
  const size = 2 ** (32 - len)
  return { ip, len, mask, net, bc, size, hosts: len >= 31 ? size : size - 2, first: len >= 31 ? net : net + 1, last: len >= 31 ? bc : bc - 1 }
})
const inNet = computed(() => r.value && ((ip2n(probe.value) & r.value.mask) >>> 0) === r.value.net)
const ROUTES = [['0.0.0.0/0', 'default → ISP'], ['10.0.0.0/8', 'corp VPN'], ['10.1.0.0/16', 'datacenter A'], ['10.1.2.0/24', 'rack 12'], ['192.168.10.0/24', 'home LAN']]
const lpm = computed(() => { const p = ip2n(probe.value)
  return ROUTES.map(([c, via]) => { const [a, l] = c.split('/'); const mask = +l === 0 ? 0 : (~0 << (32 - l)) >>> 0; return { c, via, l: +l, ok: ((p & mask) >>> 0) === ((ip2n(a) & mask) >>> 0) } }) })
const best = computed(() => lpm.value.filter(x => x.ok).sort((a, b) => b.l - a.l)[0])
</script>

<template>
  <div>
    <div class="w-title">Subnetting & longest-prefix match</div>
    <p class="w-sub">Network bits (blue) identify the network, host bits (pink) identify the machine.</p>
    <div class="w-row"><label>CIDR <input v-model="cidr" class="mono" style="width:180px" /></label>
      <input type="range" min="0" max="32" :value="r?.len ?? 24" @input="cidr = cidr.split('/')[0] + '/' + $event.target.value" /></div>
    <div v-if="r" class="w-out mono" style="font-size:13px;overflow-x:auto">
      <div>address  <span v-for="(b, i) in bin(r.ip)" :key="i" :style="{ color: b === '.' ? 'var(--muted)' : (i - Math.floor(i / 9)) < r.len ? 'var(--accent)' : '#ec4899', fontWeight: 700 }">{{ b }}</span>  {{ n2ip(r.ip) }}</div>
      <div>mask     {{ bin(r.mask) }}  {{ n2ip(r.mask) }}</div>
      <div>network  {{ bin(r.net) }}  <b>{{ n2ip(r.net) }}/{{ r.len }}</b></div>
      <div>broadcast {{ n2ip(r.bc) }} · usable {{ n2ip(r.first) }} – {{ n2ip(r.last) }} · <b>{{ r.hosts.toLocaleString() }} hosts</b></div>
    </div>
    <p v-else class="err">Use a.b.c.d/len</p>
    <div class="w-row"><label>Destination IP <input v-model="probe" class="mono" style="width:160px" /></label>
      <span v-if="r" :style="{ color: inNet ? 'var(--ok)' : 'var(--warn)' }">{{ inNet ? 'Same subnet → deliver directly via ARP' : 'Different subnet → send to default gateway' }}</span></div>
    <div class="w-out mono" style="font-size:13px"><b>Router table (longest prefix wins):</b>
      <div v-for="x in lpm" :key="x.c" :style="{ color: x === best ? 'var(--ok)' : x.ok ? 'var(--text)' : 'var(--muted)', fontWeight: x === best ? 800 : 400 }">{{ x === best ? '▶' : x.ok ? '·' : ' ' }} {{ x.c.padEnd(18) }} {{ x.via }} {{ x.ok ? '(matches)' : '' }}</div></div>
  </div>
</template>
