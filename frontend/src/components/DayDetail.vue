<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="$emit('close')">
      <div class="card w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">{{ formatDate(day?.date) }}</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-200 transition-colors duration-150"><X :size="18" /></button>
        </div>
        <div v-if="day?.total > 0" class="mb-4">
          <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{{ day.completed }}/{{ day.total }}</span>
          </div>
          <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 rounded-full transition-colors duration-150" :style="{ width: (day.completed / day.total * 100) + '%' }"></div>
          </div>
        </div>
        <div v-if="day?.habits?.length" class="mb-4">
          <h4 class="text-xs font-medium text-gray-400 mb-2">Habits</h4>
          <div class="space-y-1">
            <div v-for="h in day.habits" :key="h.id" class="flex items-center gap-2 text-sm">
              <span :class="h.completed ? 'text-emerald-400' : 'text-gray-600'">
                <CheckCircle2 v-if="h.completed" :size="14" />
                <Circle v-else :size="14" />
              </span>
              <span :class="h.completed ? 'text-gray-300' : 'text-gray-500'">{{ h.title }}</span>
            </div>
          </div>
        </div>
        <div v-if="day?.tasks?.length" class="mb-2">
          <h4 class="text-xs font-medium text-gray-400 mb-2">Tasks</h4>
          <div class="space-y-1">
            <div v-for="t in day.tasks" :key="t.id" class="flex items-center gap-2 text-sm">
              <span :class="t.completed ? 'text-emerald-400' : 'text-gray-600'">
                <CheckCircle2 v-if="t.completed" :size="14" />
                <Circle v-else :size="14" />
              </span>
              <span :class="t.completed ? 'text-gray-300 line-through' : 'text-gray-500'">{{ t.title }}</span>
            </div>
          </div>
        </div>
        <p v-if="!day?.habits?.length && !day?.tasks?.length" class="text-sm text-gray-500">No activity for this day.</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { X, CheckCircle2, Circle } from 'lucide-vue-next'

defineProps({ show: Boolean, day: Object })
defineEmits(['close'])

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
</script>
