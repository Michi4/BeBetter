<template>
  <div class="card-hover flex items-center gap-3" @click="handleCardClick">
    <button v-bind="checkTap" @click.stop.prevent :aria-label="isCompleted ? `Completed ${habit.title}` : `Complete ${habit.title}`" :aria-pressed="String(isCompleted)" class="w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-150"
      :class="isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400'">
      <Camera v-if="needsCamera && !isCompleted" :size="18" />
      <CheckCircle2 v-else :size="18" />
    </button>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <h4 class="font-medium text-sm truncate">{{ habit.title }}</h4>
        <span v-if="scheduledTime" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
          {{ formatTime(scheduledTime) }}
        </span>
        <span v-if="habit.challengeId" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">challenge</span>
        <span v-if="habit.currentStreak > 0" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{{ habit.currentStreak }}d</span>
        <span v-if="habit.hasBreak" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">pause</span>
      </div>
      <p v-if="habit.description" class="text-xs text-gray-500 truncate mt-0.5">{{ habit.description }}</p>
      <p v-if="habit.challengeId && habit.challengeOpponent" class="text-[10px] text-amber-400/70 mt-0.5">vs {{ habit.challengeOpponent.username }}</p>
    </div>
    <div v-if="isCompleted" class="flex items-center gap-1 shrink-0">
      <span class="text-emerald-400 text-[10px] font-medium">Done</span>
      <button v-bind="undoTap" @click.stop.prevent aria-label="Mark habit as not done"
        class="p-1.5 rounded text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Mark as not done">
        <Undo2 :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle2, Camera, Undo2 } from 'lucide-vue-next'
import { formatTime } from '../utils/timeFormat'
import { useTap } from '../utils/tapTrigger'

const props = defineProps({
  habit: { type: Object, required: true },
  scheduledTime: { type: String, default: null },
})
const emit = defineEmits(['finish', 'cam', 'undo'])
const router = useRouter()

const checkTap = useTap(() => handleClick())
const undoTap = useTap(() => emit('undo', props.habit, props.scheduledTime))

const needsCamera = computed(() => {
  return props.habit.verificationType === 'be_better_cam' || props.habit.verificationType === 'photo'
})

const isCompleted = computed(() => {
  if (props.scheduledTime && props.habit.completedSlots) {
    return props.habit.completedSlots.includes(props.scheduledTime)
  }
  return props.habit.completedToday
})

function handleCardClick() {
  if (props.habit.challengeId) {
    router.push(`/challenges/${props.habit.challengeId}`)
  } else {
    router.push(`/habits/${props.habit.id}`)
  }
}

function handleClick() {
  if (isCompleted.value) return
  if (needsCamera.value) {
    emit('cam', props.habit)
  } else {
    emit('finish', props.habit)
  }
}
</script>
