<script setup>
import { ref, computed } from 'vue'
import { WIDGETS, LAB_INDEX } from '../components/widgets/index.js'
import Icon from '../components/Icon.vue'
import WidgetFrame from '../components/WidgetFrame.vue'
const active = ref(LAB_INDEX[0].name)
const groups = computed(() => [...new Set(LAB_INDEX.map(l => l.track))].map(g => [g, LAB_INDEX.filter(l => l.track === g)]))
const current = computed(() => LAB_INDEX.find(l => l.name === active.value))
</script>

<template>
  <div class="page" style="max-width:1000px">
    <span class="eyebrow" style="color:var(--accent)"><Icon name="flask" :size="14" /> Interactive labs</span>
    <h1>Poke at the real mechanisms</h1>
    <p class="lede">Every simulator used across the book, in one place. Change the inputs and watch what the system actually does.</p>
    <div class="lab-tabs" style="flex-direction:column;align-items:stretch">
      <div v-for="[g, labs] in groups" :key="g" class="lab-group">
        <span>{{ g }}</span>
        <button v-for="l in labs" :key="l.name" class="chip-btn" :class="{ on: active === l.name }" @click="active = l.name">{{ l.title }}</button>
      </div>
    </div>
    <WidgetFrame :key="active" :name="active" :props="current.props || {}" />
  </div>
</template>
