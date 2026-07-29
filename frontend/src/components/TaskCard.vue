<template>
  <div class="card-hover flex items-center gap-3" @click="expanded = !expanded">
    <button @click.stop="$emit('complete', task)" class="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150"
      :class="task.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400'">
      <CheckCircle2 :size="18" />
    </button>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h4 class="font-medium text-sm truncate" :class="task.completed ? 'text-gray-400 line-through' : ''">{{ task.title }}</h4>
        <span v-if="task.dueDate" class="text-[10px] px-1.5 py-0.5 rounded"
          :class="dueDateClass">{{ dueDateLabel }}</span>
      </div>
      <p v-if="task.description && expanded" class="text-xs text-gray-500 mt-1">{{ task.description }}</p>
    </div>
    <button v-if="!task.completed" @click.stop="$emit('delete', task)" class="text-gray-600 hover:text-red-400 transition-colors duration-150">
      <X :size="14" />
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CheckCircle2, X } from 'lucide-vue-next'

const props = defineProps({ task: { type: Object, required: true } })
defineEmits(['complete', 'delete'])

const expanded = ref(false)

const dueDateClass = computed(() => {
  if (!props.task.dueDate) return ''
  const d = new Date(props.task.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d < today) return 'bg-red-500/10 text-red-400'
  if (d.toDateString() === today.toDateString()) return 'bg-emerald-500/10 text-emerald-400'
  return 'bg-gray-700/50 text-gray-400'
})

const dueDateLabel = computed(() => {
  if (!props.task.dueDate) return ''
  const d = new Date(props.task.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d - today) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})
</script>
