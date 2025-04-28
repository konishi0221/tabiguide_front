<template>
  <span :class="classes" class="inline-block leading-none select-none">
    {{ name }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name:  { type: String, required: true },   // 例: "chat", "map"
  size:  { type: String, default: 'base' },  // xs|sm|base|lg|xl
  filled:{ type: Boolean, default: false }
})

const classes = computed(() => {
  const variant = props.filled
    ? 'material-symbols-rounded'
    : 'material-symbols-outlined'
  const sizeMap = { xs:'text-xs', sm:'text-sm', base:'text-base', lg:'text-lg', xl:'text-xl' }
  return `${variant} ${sizeMap[props.size] || 'text-base'}`
})
</script>
