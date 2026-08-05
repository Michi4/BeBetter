<template>
  <div class="p-5 rounded-xl border border-[var(--bb-line)] bg-[var(--bb-card)] space-y-3 hover:border-[var(--bb-accent)]/40 transition-all duration-300 group">
    <div class="flex items-center gap-2.5">
      <span class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/70 to-teal-500/70 flex items-center justify-center text-sm font-bold text-white shrink-0">
        {{ initial }}
      </span>
      <p class="font-bold text-sm text-[var(--bb-ink)] truncate flex-1">{{ habit.title }}</p>
      <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bb-accent)]/10 text-[var(--bb-accent)] font-medium shrink-0">{{ habit.streak }} day streak</span>
    </div>
    <p class="text-xs text-[var(--bb-muted)]">{{ scheduleText }}</p>
    <div class="w-full h-1.5 rounded-full overflow-hidden bg-[var(--bb-line)]">
      <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" :style="{ width: progress + '%' }"></div>
    </div>
    <div class="flex items-center justify-between text-[10px] text-[var(--bb-muted)]">
      <span>{{ habit.completionCount }} completions</span>
      <span class="flex gap-1" aria-hidden="true">
        <span v-for="d in 7" :key="d" class="w-2.5 h-2.5 rounded-full" :class="d <= completedDays ? 'bg-[var(--bb-accent)]' : 'bg-[var(--bb-line)]'"></span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  habit: { type: Object, required: true },
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