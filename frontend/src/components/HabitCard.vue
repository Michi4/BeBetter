<template>
  <div class="card-hover flex items-center gap-3" @click="$router.push(`/habits/${habit.id}`)">
    <button @click.stop="$emit('finish', habit)" class="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150"
      :class="habit.completedToday ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400'">
      <Camera v-if="habit.verificationType === 'photo' && !habit.completedToday" :size="18" />
      <CheckCircle2 v-else :size="18" />
    </button>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h4 class="font-medium text-sm truncate">{{ habit.title }}</h4>
        <span v-if="habit.currentStreak > 0" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{{ habit.currentStreak}}d</span>
        <span v-if="habit.onBreak" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">break</span>
      </div>
      <p v-if="habit.description" class="text-xs text-gray-500 truncate mt-0.5">{{ habit.description }}</p>
    </div>
    <div v-if="habit.completedToday" class="text-emerald-400 text-[10px] font-medium">Done</div>
  </div>
</template>

<script setup>
import { CheckCircle2, Camera } from 'lucide-vue-next'

defineProps({ habit: { type: Object, required: true } })
defineEmits(['finish'])
</script>
