<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="$emit('close')" tabindex="-1" ref="modalEl">
      <div class="card w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">{{ formatDate(day?.date) }}</h3>
          <button @click="$emit('close')" aria-label="Close" class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"><X :size="16" /></button>
        </div>

        <div v-if="day?.scheduled > 0" class="mb-4">
          <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{{ day.completed }}/{{ day.scheduled }}</span>
          </div>
          <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 rounded-full transition-all duration-300" :style="{ width: Math.min(100, day.completed / day.scheduled * 100) + '%' }"></div>
          </div>
        </div>

        <div v-if="day?.scheduledHabits?.length" class="mb-4">
          <h4 class="text-xs font-medium text-gray-400 mb-2">Habits</h4>
          <div class="space-y-1.5">
            <div v-for="h in day.scheduledHabits" :key="h.id" class="flex items-center gap-2 text-sm">
              <span :class="h.completed ? 'text-emerald-400' : 'text-gray-600'">
                <CheckCircle2 v-if="h.completed" :size="14" />
                <Circle v-else :size="14" />
              </span>
              <span :class="h.completed ? 'text-gray-300' : 'text-gray-500'">{{ h.title }}</span>
              <button v-if="h.proofUrl" @click="openLightbox(h.proofUrl)" class="ml-auto shrink-0">
                <img :src="h.proofUrl" class="w-7 h-7 rounded object-cover ring-1 ring-emerald-500/30" alt="proof" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="day?.habits?.length" class="mb-4">
          <h4 class="text-xs font-medium text-gray-400 mb-2">Completed</h4>
          <div class="space-y-1.5">
            <div v-for="log in day.habits" :key="log.id" class="flex items-center gap-2 text-sm">
              <span class="text-emerald-400"><CheckCircle2 :size="14" /></span>
              <span class="text-gray-300">{{ log.habit?.title || 'Habit' }}</span>
              <button v-if="log.proofUrl" @click="openLightbox(log.proofUrl)" class="ml-auto shrink-0">
                <img :src="log.proofUrl" class="w-7 h-7 rounded object-cover ring-1 ring-emerald-500/30" alt="proof" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="day?.tasks?.length" class="mb-2">
          <h4 class="text-xs font-medium text-gray-400 mb-2">Tasks</h4>
          <div class="space-y-1.5">
            <div v-for="t in day.tasks" :key="t.id" class="flex items-center gap-2 text-sm">
              <span class="text-emerald-400"><CheckCircle2 :size="14" /></span>
              <span class="text-gray-300">{{ t.task?.title || t.title }}</span>
            </div>
          </div>
        </div>

        <p v-if="!day?.scheduledHabits?.length && !day?.habits?.length && !day?.tasks?.length" class="text-sm text-gray-500">No activity for this day.</p>
      </div>
    </div>

    <!-- Photo Lightbox -->
    <div v-if="lightboxSrc" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm" @click.self="lightboxSrc = null" @keydown.escape="lightboxSrc = null" tabindex="-1" ref="lightboxEl">
      <button @click="lightboxSrc = null" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"><X :size="20" /></button>
      <img :src="lightboxSrc" class="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
    </div>
  </Teleport>
</template>

<script setup>
import { X, CheckCircle2 } from 'lucide-vue-next'
import { ref, watch, nextTick } from 'vue'

const props = defineProps({ show: Boolean, day: Object })
defineEmits(['close'])

const modalEl = ref(null)
const lightboxSrc = ref(null)
const lightboxEl = ref(null)

watch(() => props.show, (val) => {
  if (val) nextTick(() => modalEl.value?.focus())
})

watch(lightboxSrc, (val) => {
  if (val) nextTick(() => lightboxEl.value?.focus())
})

function openLightbox(src) {
  lightboxSrc.value = src
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
</script>
