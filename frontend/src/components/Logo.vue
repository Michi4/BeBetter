<template>
  <svg :width="size" :height="size" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
    <rect width="500" height="500" :fill="isLight ? '#eef1f5' : '#0f1722'" rx="22"/>
    <rect x="0" y="0" width="500" height="500" rx="22" fill="none" :stroke="isLight ? '#d8dde3' : '#1e293b'" stroke-width="6"/>
    <g fill="#21c55d" rx="22" ry="22">
      <rect x="20" y="20" width="80" height="80" rx="22"/>
      <rect x="115" y="20" width="80" height="80" rx="22"/>
      <rect x="210" y="20" width="80" height="80" rx="22" fill="#21c55daa"/>
      <rect x="305" y="20" width="80" height="80" rx="22"/>
      <rect x="400" y="20" width="80" height="80" rx="22" fill="#21c55d30"/>
      <rect x="20" y="115" width="80" height="80" rx="22"/>
      <rect x="115" y="115" width="80" height="80" rx="22" fill="#21c55d30"/>
      <rect x="210" y="115" width="80" height="80" rx="22"/>
      <rect x="305" y="115" width="80" height="80" rx="22" fill="#21c55d30"/>
      <rect x="400" y="115" width="80" height="80" rx="22"/>
      <rect x="20" y="210" width="80" height="80" rx="22"/>
      <rect x="115" y="210" width="80" height="80" rx="22"/>
      <rect x="210" y="210" width="80" height="80" rx="22" fill="#21c55daa"/>
      <rect x="305" y="210" width="80" height="80" rx="22"/>
      <rect x="400" y="210" width="80" height="80" rx="22" fill="#21c55d30"/>
      <rect x="20" y="305" width="80" height="80" rx="22"/>
      <rect x="115" y="305" width="80" height="80" rx="22"/>
      <rect x="210" y="305" width="80" height="80" rx="22"/>
      <rect x="305" y="305" width="80" height="80" rx="22"/>
      <rect x="400" y="305" width="80" height="80" rx="22"/>
      <rect x="20" y="400" width="80" height="80" rx="22"/>
      <rect x="115" y="400" width="80" height="80" rx="22"/>
      <rect x="210" y="400" width="80" height="80" rx="22"/>
      <rect x="305" y="400" width="80" height="80" rx="22"/>
      <rect x="400" y="400" width="80" height="80" rx="22"/>
    </g>
  </svg>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  size: { type: [Number, String], default: 28 },
})

const isLight = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('light'))

let observer = null
onMounted(() => {
  observer = new MutationObserver(() => {
    isLight.value = document.documentElement.classList.contains('light')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onUnmounted(() => observer?.disconnect())
</script>
