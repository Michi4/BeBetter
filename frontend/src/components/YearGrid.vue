<template>
  <div class="year-grid" role="img" :aria-label="ariaLabel" v-html="svg"></div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  width: { type: Number, default: 52 },
  height: { type: Number, default: 7 },
  litRatio: { type: Number, default: 0.42 },
  ariaLabel: { type: String, default: 'A year of habit completions shown as a grid of days, most of them filled in' },
})

const shades = ['#0e1f18', '#14532d', '#166534', '#15803d', '#10b981', '#34d399']

// Deterministic pseudo-random so the pattern is stable across re-renders
function seeded(n) {
  const x = Math.sin(n + 1) * 10000
  return x - Math.floor(x)
}

const svg = computed(() => {
  const w = props.width
  const h = props.height
  let rects = ''
  for (let i = 0; i < w * h; i++) {
    const col = i % w
    const row = Math.floor(i / w)
    const streak = i % 11
    let v = 0
    if (streak < 3) v = 1
    else if (streak < 5) v = 2
    else if (streak < 6) v = 3
    const day = i % props.width
    if (day < 2 && i % 9 === 0) v = 4
    if (i % 29 === 0) v = 5
    const week = Math.floor(i / props.width)
    if ((week + day) % 6 === 0) v = 0
    if (seeded(i) < props.litRatio && v > 0) {
      const color = shades[Math.min(v, shades.length - 1)]
      rects += `<rect x="${col * 10}" y="${row * 10}" width="7" height="7" rx="1.5" fill="${color}" class="dot"/>`
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 10 - 3}" height="${h * 10 - 3}" viewBox="0 0 ${w * 10 - 3} ${h * 10 - 3}">${rects}</svg>`
})
</script>

<style scoped>
.year-grid :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
  animation: grid-in 0.6s ease both;
}
.year-grid :deep(.dot) {
  transition: fill 0.15s ease, transform 0.15s ease;
  transform-box: fill-box;
  transform-origin: center;
  cursor: pointer;
}
.year-grid :deep(.dot:hover),
.year-grid :deep(.dot:focus-visible) {
  fill: #f9fafb !important;
  transform: scale(1.25);
}
html.light .year-grid :deep(.dot:hover),
html.light .year-grid :deep(.dot:focus-visible) {
  fill: #065f46 !important;
}
@keyframes grid-in {
  from { opacity: 0.2; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .year-grid :deep(svg) { animation: none; }
  .year-grid :deep(.dot) { transition: none; transform: none !important; }
}
</style>