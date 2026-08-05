<template>
  <ScrollReveal :variant="variant" :delay="delay" class="h-full">
    <div class="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3 hover:border-emerald-500/30 hover:bg-gray-900/80 transition-all duration-300 group">
      <div class="flex items-center gap-2.5">
        <span class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/70 to-teal-500/70 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {{ initial }}
        </span>
        <p class="font-bold text-sm text-white truncate flex-1">{{ habit.title }}</p>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium shrink-0">{{ habit.streak }} day streak</span>
      </div>
      <p class="text-xs text-gray-400">{{ scheduleText }}</p>
      <div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
        <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="flex items-center justify-between text-[10px] text-gray-400">
        <span>{{ habit.completionCount }} completions</span>
        <span class="flex gap-1" aria-hidden="true">
          <span v-for="d in 7" :key="d" class="w-2.5 h-2.5 rounded-full" :class="d <= completedDays ? 'bg-emerald-400' : 'bg-gray-800'"></span>
        </span>
      </div>
    </div>
  </ScrollReveal>
</template>

<script setup>
import { computed } from 'vue'
import ScrollReveal from './ScrollReveal.vue'

const props = defineProps({
  habit: { type: Object, required: true },
  variant: { type: String, default: 'fade-up' },
  delay: { type: Number, default: 0 },
})

const scheduleText = computed(() => {
  if (!props.habit.scheduleDisplay || props.habit.scheduleDisplay === 'Anytime') {
    return 'Anytime scheduled'
  }
  return `Daily at ${props.habit.scheduleDisplay}`
})

const initial = computed(() => (props.habit.title || '?')[0].toUpperCase())

const progress = computed(() => {
  if (props.habit.streak === 0) return 0
  return Math.min(props.habit.streak * 4, 100)
})

const completedDays = computed(() => {
  const streak = props.habit.streak || 0
  return Math.min(Math.max(streak % 7, streak > 0 ? Math.min(7, streak) : 0), 7)
})
</script>