<template>
  <div class="space-y-3" :class="{ 'opacity-50 pointer-events-none': disabled }">
    <label class="text-xs font-medium text-gray-400">Schedule</label>

    <!-- Quick presets -->
    <div class="flex flex-wrap gap-2">
      <button v-for="p in presets" :key="p.value" type="button" @click="selectPreset(p)" :disabled="disabled"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
        :class="isPresetActive(p.value) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
        {{ p.label }}
      </button>
    </div>

    <!-- Interval mode: every N days -->
    <div v-if="intervalDays >= 2" class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-300">Every</span>
        <input :value="intervalDays" @change="setCustomInterval($event.target.value)" type="number" min="2" max="365"
          aria-label="Repeat every N days" :disabled="disabled"
          class="input w-16 text-center text-sm py-1" />
        <span class="text-xs text-gray-300">days, starting today</span>
        <button type="button" @click="clearInterval()" :disabled="disabled"
          class="ml-auto text-[10px] text-gray-500 hover:text-gray-300 underline">weekdays instead</button>
      </div>
      <p class="text-[10px] text-gray-500">Due dates repeat every {{ intervalDays }} days. Times below still set the reminder times.</p>
    </div>

    <!-- Schedule entries -->
    <div class="space-y-3">
      <div v-for="(entry, idx) in entries" :key="idx"
        class="rounded-xl border border-gray-700 bg-gray-800/50 p-3 space-y-2.5">
        <div class="flex items-center justify-between" v-if="entries.length > 1">
          <span class="text-[10px] text-gray-500 font-medium">Time slot {{ idx + 1 }}</span>
          <button type="button" @click="removeEntry(idx)" :disabled="disabled"
            class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <X :size="12" />
          </button>
        </div>

        <!-- Time input -->
        <div class="flex items-center gap-2">
          <Clock :size="14" class="text-gray-500 shrink-0" />
          <TimeInput :model-value="entry.time" :allow-clear="true" empty-label="Anytime" :disabled="disabled"
            @update:model-value="time => updateTime(idx, time || null)" class="flex-1" />
          <span v-if="entry.time" class="text-[10px] text-gray-500 shrink-0">At {{ formatTime(entry.time) }}</span>
        </div>

        <!-- Day picker -->
        <div class="flex gap-1.5">
          <button v-for="(day, di) in weekDays" :key="di" type="button" @click="toggleDay(idx, di)" :disabled="disabled"
            :aria-pressed="entry.days.includes(di)"
            :aria-label="day"
            class="flex-1 h-11 rounded-lg text-xs font-medium transition-colors duration-150"
            :class="entry.days.includes(di) ? 'bg-emerald-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'">
            {{ day }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add another time -->
    <button type="button" @click="addEntry" :disabled="disabled"
      class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 border border-dashed border-emerald-500/30 transition-colors">
      <Plus :size="14" />
      Add another time
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Clock, Plus, X } from 'lucide-vue-next'
import TimeInput from './TimeInput.vue'
import { formatTime } from '../utils/timeFormat'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [{ time: null, days: [0, 1, 2, 3, 4, 5, 6] }],
  },
  intervalDays: {
    type: Number,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['update:modelValue', 'update:intervalDays'])

const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const presets = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Every 2 days', value: 'every2' },
  { label: 'Every 3 days', value: 'every3' },
  { label: 'Every week', value: 'every7' },
]

const entries = ref(
  props.modelValue?.length
    ? props.modelValue.map(e => ({ time: e.time || null, days: [...e.days] }))
    : [{ time: null, days: [0, 1, 2, 3, 4, 5, 6] }]
)

const activePreset = ref('daily')

detectPreset()

function detectPreset() {
  if (props.intervalDays >= 2) {
    activePreset.value = 'interval:' + props.intervalDays
    return
  }
  if (entries.value.length !== 1) { activePreset.value = ''; return }
  const d = entries.value[0].days.sort()
  const all = [0, 1, 2, 3, 4, 5, 6]
  const weekdays = [1, 2, 3, 4, 5]
  const weekends = [0, 6]
  if (JSON.stringify(d) === JSON.stringify(all)) activePreset.value = 'daily'
  else if (JSON.stringify(d) === JSON.stringify(weekdays)) activePreset.value = 'weekdays'
  else if (JSON.stringify(d) === JSON.stringify(weekends)) activePreset.value = 'weekends'
  else activePreset.value = ''
}

watch(entries, () => {
  detectPreset()
  emit('update:modelValue', entries.value.map(e => ({ time: e.time, days: [...e.days] })))
}, { deep: true })

watch(() => props.intervalDays, () => {
  detectPreset()
})

watch(() => props.modelValue, (val) => {
  if (!val || !val.length) return
  const incoming = val.map(e => ({ time: e.time || null, days: [...e.days] }))
  if (JSON.stringify(incoming) !== JSON.stringify(entries.value)) {
    entries.value = incoming
  }
}, { deep: true })

function selectPreset(p) {
  const dayMap = {
    daily: [0, 1, 2, 3, 4, 5, 6],
    weekdays: [1, 2, 3, 4, 5],
    weekends: [0, 6],
  }
  if (p.value === 'every2' || p.value === 'every3' || p.value === 'every7') {
    const n = p.value === 'every2' ? 2 : p.value === 'every3' ? 3 : 7
    // Interval mode: keep the time, weekdays no longer decide due dates.
    entries.value = [{ time: entries.value[0]?.time || null, days: [0, 1, 2, 3, 4, 5, 6] }]
    emit('update:intervalDays', n)
    activePreset.value = 'interval:' + n
    return
  }
  emit('update:intervalDays', null)
  entries.value = [{ time: entries.value[0]?.time || null, days: dayMap[p.value] || [0, 1, 2, 3, 4, 5, 6] }]
}

function setCustomInterval(n) {
  n = Math.max(2, Math.min(365, parseInt(n) || 0))
  if (!n) return
  entries.value = [{ time: entries.value[0]?.time || null, days: [0, 1, 2, 3, 4, 5, 6] }]
  emit('update:intervalDays', n)
  activePreset.value = 'interval:' + n
}

function clearInterval() {
  emit('update:intervalDays', null)
  activePreset.value = ''
}

function addEntry() {
  if (props.intervalDays >= 2) emit('update:intervalDays', null)
  entries.value.push({ time: null, days: [0, 1, 2, 3, 4, 5, 6] })
}

function removeEntry(idx) {
  if (props.intervalDays >= 2) emit('update:intervalDays', null)
  entries.value.splice(idx, 1)
}

function updateTime(idx, time) {
  entries.value[idx].time = time
}

function isPresetActive(value) {
  if (value === 'every2') return props.intervalDays === 2
  if (value === 'every3') return props.intervalDays === 3
  if (value === 'every7') return props.intervalDays === 7
  if (props.intervalDays >= 2) return false
  return activePreset.value === value
}

function toggleDay(idx, day) {
  // Changing weekdays leaves interval mode (interval owns due dates).
  if (props.intervalDays >= 2) emit('update:intervalDays', null)
  const days = entries.value[idx].days
  const i = days.indexOf(day)
  if (i >= 0) days.splice(i, 1)
  else days.push(day)
  days.sort()
}
</script>
