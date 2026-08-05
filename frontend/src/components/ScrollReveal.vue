<template>
  <div
    ref="element"
    :class="['scroll-reveal', { visible: isVisible }, variants[variant]]"
    :style="{ transitionDelay: `${delay}ms` }"
  >
    <slot />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'fade-up',
    validator: (v) => ['fade-up', 'fade-down', 'fade-left', 'fade-right', 'scale-up'].includes(v),
  },
  delay: {
    type: Number,
    default: 0,
  },
  threshold: {
    type: Number,
    default: 0.1,
  },
  rootMargin: {
    type: String,
    default: '0px 0px -50px 0px',
  },
  once: {
    type: Boolean,
    default: true,
  },
})

const element = ref(null)
const isVisible = ref(false)
let observer = null

const variants = {
  'fade-up': 'translate-y-8 opacity-0',
  'fade-down': '-translate-y-8 opacity-0',
  'fade-left': 'translate-x-8 opacity-0',
  'fade-right': '-translate-x-8 opacity-0',
  'scale-up': 'scale-95 opacity-0',
}

onMounted(() => {
  if (!element.value) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) {
    isVisible.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true
          if (props.once && observer) {
            observer.unobserve(entry.target)
          }
        } else if (!props.once) {
          isVisible.value = false
        }
      })
    },
    { threshold: props.threshold, rootMargin: props.rootMargin }
  )

  observer.observe(element.value)
})

onUnmounted(() => {
  if (observer && element.value) {
    observer.unobserve(element.value)
  }
})
</script>

<style scoped>
.scroll-reveal {
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}
.scroll-reveal.visible {
  transform: translate(0, 0) scale(1);
  opacity: 1;
}
.scroll-reveal.fade-up { transform: translateY(2rem); opacity: 0; }
.scroll-reveal.fade-down { transform: translateY(-2rem); opacity: 0; }
.scroll-reveal.fade-left { transform: translateX(2rem); opacity: 0; }
.scroll-reveal.fade-right { transform: translateX(-2rem); opacity: 0; }
.scroll-reveal.scale-up { transform: scale(0.95); opacity: 0; }
</style>