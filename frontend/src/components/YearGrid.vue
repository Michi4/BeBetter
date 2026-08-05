<template>
  <div class="year-grid select-none" role="img" :aria-label="ariaLabel">
    <div v-for="(cell, i) in cells" :key="i" class="dot" :class="{ lit: cell > 0 }" :style="dotStyle(cell)"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  width: { type: Number, default: 52 },
  height: { type: Number, default: 7 },
  litRatio: { type: Number, default: 0.42 },
  ariaLabel: { type: String, default: 'A year of habit completions shown as a grid of days, most of them filled in' },
})

const cells = computed(() => {
  const total = props.width * props.height
  const list = []
  for (let i = 0; i < total; i++) {
    let v = 0
    const streak = i % 11
    if (streak < 3) v = 1
    else if (streak < 5) v = 2
    else if (streak < 6) v = 3
    const day = i % props.width
    if (day < 2 && i % 9 === 0) v = 4
    if (i % 29 === 0) v = 5
    const week = Math.floor(i / props.width)
    if ((week + day) % 6 === 0) v = 0
    list.push(Math.random() < props.litRatio && v > 0 ? v : 0)
  }
  return list
})

const shades = ['#0e1f18', '#14532d', '#166534', '#15803d', '#10b981', '#34d399']

function dotStyle(v) {
  if (v <= 0) return {}
  return { backgroundColor: shades[Math.min(v, shades.length - 1)] }
}
</script>

<style scoped>
.year-grid {
  display: grid;
  grid-template-columns: repeat(52, minmax(0, 1fr));
  gap: clamp(3px, 0.5vw, 7px);
}
.dot {
  aspect-ratio: 1;
  border-radius: 3px;
  background: color-mix(in srgb, var(--bb-grid) 60%, transparent);
  transition: background-color 0.3s ease, transform 0.3s ease;
}
.dot.lit {
  animation: dot-pop 0.4s ease both;
}
.dot:hover {
  transform: scale(1.35);
}
@keyframes dot-pop {
  from { transform: scale(0.2); opacity: 0.4; }
  to { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .dot.lit { animation: none; }
}
</style>
