<template>
  <ScrollReveal :variant="variant" :delay="delay" class="h-full">
    <div class="card p-6 sm:p-8 space-y-5 h-full hover:border-emerald-500/30 transition-all duration-300 group">
      <div
        class="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl text-emerald-400 group-hover:scale-105 transition-transform duration-300"
        :style="{ backgroundColor: iconBg }"
      >
        <component :is="icon" :size="28" :stroke-width="1.5" :style="{ color: iconColor }" />
      </div>
      <h3 class="text-xl font-bold text-[var(--bb-ink)] group-hover:text-emerald-400 transition-colors">{{ title }}</h3>
      <p class="text-sm text-[var(--bb-muted)] leading-relaxed">{{ description }}</p>
    </div>
  </ScrollReveal>
</template>

<script setup>
import { computed } from 'vue'
import ScrollReveal from './ScrollReveal.vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: Object, required: true },
  iconColor: { type: String, default: '#21c55d' },
  iconBg: { type: String, default: 'rgba(33, 197, 93, 0.1)' },
  variant: { type: String, default: 'fade-up' },
  delay: { type: Number, default: 0 },
})
</script>