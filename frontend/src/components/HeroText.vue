<template>
  <div class="inline-flex items-center gap-2" ref="container">
    <span v-if="staticText" class="font-medium text-gray-400" aria-hidden="true">{{ staticText }}</span>
    <span ref="dynamicText" class="font-semibold text-emerald-400" aria-live="polite"></span>
    <span v-if="showCursor" class="animate-blink text-emerald-400" aria-hidden="true">▋</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  phrases: {
    type: Array,
    required: true,
  },
  staticText: {
    type: String,
    default: '',
  },
  typeSpeed: {
    type: Number,
    default: 50,
  },
  deleteSpeed: {
    type: Number,
    default: 30,
  },
  pauseDuration: {
    type: Number,
    default: 2000,
  },
})

const container = ref(null)
const dynamicText = ref('')
const showCursor = ref(true)
const currentPhraseIndex = ref(0)
const isDeleting = ref(false)
let animationId = null
let prefersReducedMotion = false

function type() {
  const currentPhrase = props.phrases[currentPhraseIndex.value]
  const targetText = isDeleting.value
    ? currentPhrase.slice(0, dynamicText.value.length - 1)
    : currentPhrase.slice(0, dynamicText.value.length + 1)

  dynamicText.value = targetText

  const speed = isDeleting.value ? props.deleteSpeed : props.typeSpeed
  const delay = isDeleting.value && dynamicText.value === ''
    ? props.pauseDuration / 2
    : !isDeleting.value && dynamicText.value === currentPhrase
      ? props.pauseDuration
      : speed

  animationId = setTimeout(type, delay)

  if (!isDeleting.value && dynamicText.value === currentPhrase) {
    isDeleting.value = true
  } else if (isDeleting.value && dynamicText.value === '') {
    isDeleting.value = false
    currentPhraseIndex.value = (currentPhraseIndex.value + 1) % props.phrases.length
  }
}

onMounted(() => {
  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) {
    dynamicText.value = props.phrases[0]
    return
  }
  if (container.value) {
    container.value.style.opacity = '1'
  }
  type()
})

onUnmounted(() => {
  if (animationId) clearTimeout(animationId)
})

watch(() => props.phrases, () => {
  currentPhraseIndex.value = 0
  isDeleting.value = false
  dynamicText.value = ''
}, { deep: true })
</script>

<style scoped>
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.animate-blink {
  animation: blink 1s step-end infinite;
}
</style>