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
  let groups = ''
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
    const x = col * 10
    const y = row * 10
    const lit = v > 0 && seeded(i) < props.litRatio
    groups += `<g class="cell"><rect class="hit" x="${x}" y="${y}" width="10" height="10" rx="2" fill="transparent"/>`
    if (lit) {
      const color = shades[Math.min(v, shades.length - 1)]
      groups += `<rect class="dot" x="${x + 1.5}" y="${y + 1.5}" width="7" height="7" rx="1.5" fill="${color}"/>`
    }
    groups += `</g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 10 - 3}" height="${h * 10 - 3}" viewBox="0 0 ${w * 10 - 3} ${h * 10 - 3}">${groups}</svg>`
})
</script>

<style scoped>
.year-grid :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
  animation: grid-in 0.6s ease both;
}
.year-grid :deep(.cell) {
  cursor: pointer;
}
.year-grid :deep(.cell:hover .hit) {
  fill: var(--bb-grid);
  fill-opacity: 0.28;
}
.year-grid :deep(.dot) {
  transition: fill 0.15s ease, transform 0.15s ease;
  transform-box: fill-box;
  transform-origin: center;
}
.year-grid :deep(.cell:hover .dot),
.year-grid :deep(.cell:focus-within .dot) {
  fill: #f9fafb !important;
  transform: scale(1.3);
}
html.light .year-grid :deep(.cell:hover .dot),
html.light .year-grid :deep(.cell:focus-within .dot) {
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
