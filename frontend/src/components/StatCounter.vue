<template>
  <span ref="el">{{ displayValue }}{{ suffix }}</span>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  suffix: { type: String, default: '' },
  duration: { type: Number, default: 1400 },
})

const el = ref(null)
const displayValue = ref(0)
let observer = null
let rafId = null

function animate() {
  const start = performance.now()
  const from = 0
  const to = props.value
  const step = (now) => {
    const t = Math.min((now - start) / props.duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    displayValue.value = Math.round(from + (to - from) * eased)
    if (t < 1) rafId = requestAnimationFrame(step)
  }
  rafId = requestAnimationFrame(step)
}

onMounted(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) {
    displayValue.value = props.value
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate()
          observer?.disconnect()
        }
      })
    },
    { threshold: 0.4 }
  )
  observer.observe(el.value)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  observer?.disconnect()
})
</script>