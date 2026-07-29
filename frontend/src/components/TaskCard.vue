<template>
  <div>
    <div class="flex items-center gap-3 group">
      <!-- Checkbox -->
      <button @click="$emit('complete', task)"
        class="shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200"
        :class="task.completed
          ? 'bg-emerald-500 border-emerald-500 text-white scale-110 animate-check'
          : 'border-gray-600 hover:border-emerald-400 hover:bg-emerald-500/10 text-transparent hover:text-emerald-400/40'">
        <Check :size="14" :stroke-width="3" />
      </button>

      <!-- Body -->
      <div class="flex-1 min-w-0 cursor-pointer" @click="$emit('edit', task)">
        <div class="flex items-center gap-2">
          <h4 class="font-medium text-sm truncate" :class="task.completed ? 'text-gray-400 line-through' : ''">{{ task.title }}</h4>
          <span v-if="task.dueDate" class="text-[10px] px-1.5 py-0.5 rounded shrink-0"
            :class="dueDateClass">{{ dueDateLabel }}</span>
        </div>
        <p v-if="task.description && !task.completed" class="text-xs text-gray-500 mt-0.5 truncate">{{ task.description }}</p>
      </div>

      <!-- Delete -->
      <button @click.stop="$emit('delete', task)"
        class="delete-btn shrink-0 p-1 rounded text-gray-600 hover:text-red-400 transition-all duration-150">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Check, X } from 'lucide-vue-next'

const props = defineProps({ task: { type: Object, required: true } })
defineEmits(['complete', 'delete', 'edit'])

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
