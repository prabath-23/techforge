<script setup>
// LSM tree: writes go to WAL + memtable, flush to immutable SSTables, reads check newest→oldest, compaction merges.
import { ref } from 'vue'
const mem = ref({}), wal = ref(0), tables = ref([]), msg = ref('Write keys, flush the memtable, then read a key and see how many SSTables are checked.'), key = ref('k3'), val = ref(1), LIMIT = 4
function put(k = key.value, v = val.value) { mem.value = { ...mem.value, [k]: v }; wal.value++; msg.value = `PUT ${k}=${v}: append to WAL (sequential disk write, for durability) + insert into in-memory sorted memtable. O(log n), no random I/O.`
  val.value++; key.value = 'k' + Math.floor(Math.random() * 8); if (Object.keys(mem.value).length >= LIMIT) flush() }
function del(k = key.value) { put(k, 'TOMBSTONE'); msg.value = `DELETE ${k}: written as a tombstone — the old value is removed later during compaction.` }
function flush() { if (!Object.keys(mem.value).length) return; const sorted = Object.fromEntries(Object.entries(mem.value).sort()); tables.value.unshift({ id: tables.value.length ? Math.max(...tables.value.map(t => t.id)) + 1 : 1, data: sorted }); mem.value = {}; wal.value = 0
  msg.value = 'Memtable full → flushed to disk as a new immutable, sorted SSTable (one sequential write). WAL truncated.' }
function get(k = key.value) { const path = ['memtable']; if (k in mem.value) return (msg.value = `GET ${k}: found in memtable → ${mem.value[k]} (1 lookup)`)
  for (const t of tables.value) { path.push('SST' + t.id); if (k in t.data) return (msg.value = `GET ${k}: checked ${path.join(' → ')} → ${t.data[k] === 'TOMBSTONE' ? 'tombstone = deleted' : t.data[k]}. Bloom filters let real engines skip tables that surely lack the key.`) }
  msg.value = `GET ${k}: checked ${path.join(' → ')} → not found (read amplification = ${path.length})` }
function compact() { if (tables.value.length < 2) return; const merged = {}; [...tables.value].reverse().forEach(t => Object.assign(merged, t.data))
  for (const k in merged) if (merged[k] === 'TOMBSTONE') delete merged[k]
  const n = tables.value.length; tables.value = [{ id: Math.max(...tables.value.map(t => t.id)) + 1, data: Object.fromEntries(Object.entries(merged).sort()) }]
  msg.value = `Compaction merge-sorted ${n} SSTables into 1, keeping newest values and dropping tombstones. Fewer files → faster reads, at the cost of rewriting data (write amplification).` }
</script>

<template>
  <div>
    <div class="w-title">LSM-tree storage engine (RocksDB, Cassandra, LevelDB)</div>
    <p class="w-sub">{{ msg }}</p>
    <div class="w-row"><input v-model="key" style="width:60px" /><input v-model="val" style="width:60px" />
      <button class="btn small" @click="put()">put</button><button class="btn ghost small" @click="get()">get</button><button class="btn ghost small" @click="del()">delete</button>
      <button class="btn ghost small" @click="flush">flush</button><button class="btn ghost small" @click="compact">compact</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" class="mono">
      <div class="w-out" style="border:2px solid var(--accent)"><b>RAM: memtable</b> ({{ Object.keys(mem).length }}/{{ LIMIT }})<div v-for="(v, k) in Object.fromEntries(Object.entries(mem).sort())" :key="k">{{ k }} = {{ v }}</div></div>
      <div class="w-out" style="border:2px dashed var(--muted)"><b>Disk: WAL</b><div>{{ wal }} appended record(s)</div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px" class="mono">
      <div v-for="t in tables" :key="t.id" class="w-out" style="min-width:110px;font-size:12.5px"><b>SST{{ t.id }}</b> (immutable)<div v-for="(v, k) in t.data" :key="k">{{ k }} = {{ v }}</div></div>
    </div>
  </div>
</template>
