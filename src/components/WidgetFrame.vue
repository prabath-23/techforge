<script setup>
// Wraps every interactive figure with a plain-English guide:
// "What you're looking at" + "Try this". A chapter can override both via props `what` / `steps`.
import { computed } from 'vue'
import { WIDGETS } from './widgets/index.js'
import { GUIDES } from './widgets/guides.js'
import Icon from './Icon.vue'
const p = defineProps({ name: String, props: { type: Object, default: () => ({}) } })
const guide = computed(() => ({ what: p.props.what || GUIDES[p.name]?.what, steps: p.props.steps || GUIDES[p.name]?.steps || [] }))
</script>

<template>
  <figure class="widget-frame" :class="{ wide: name === 'Architecture' || name === 'ClassDiagram' }">
    <div v-if="guide.what" class="w-guide">
      <div><h5><Icon name="info" :size="12" /> What you're looking at</h5>{{ guide.what }}</div>
      <div><h5><Icon name="target" :size="12" /> Try this</h5><ol><li v-for="s in guide.steps" :key="s">{{ s }}</li></ol></div>
    </div>
    <component :is="WIDGETS[name]" v-if="WIDGETS[name]" v-bind="props" />
    <p v-else class="err">Unknown figure: {{ name }}</p>
  </figure>
</template>
