<template>
  <svg :width="size" :height="size" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
    <rect width="500" height="500" fill="#0f1722" rx="22"/>
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
defineProps({
  size: { type: [Number, String], default: 28 },
})
</script>
