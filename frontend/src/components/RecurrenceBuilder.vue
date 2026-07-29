<template>
  <div class="space-y-3">
    <label class="text-xs font-medium text-gray-400">Recurrence</label>
    <div class="flex flex-wrap gap-2">
      <button v-for="p in presets" :key="p.value" type="button" @click="selectPreset(p)"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
        :class="modelValue.type === p.value ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
        {{ p.label }}
      </button>
    </div>
    <div v-if="modelValue.type === 'weekly'" class="flex gap-2 mt-2">
      <button v-for="(day, i) in weekDays" :key="i" type="button" @click="toggleDay(i)"
        class="w-8 h-8 rounded-full text-xs font-medium transition-colors duration-150"
        :class="(modelValue.days || []).includes(i) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
        {{ day }}
      </button>
    </div>
    <div v-if="modelValue.type === 'interval'" class="flex items-center gap-2 mt-2">
      <span class="text-xs text-gray-400">Every</span>
      <input type="number" :value="modelValue.intervalDays || 2" @input="e => $emit('update:modelValue', { ...modelValue, intervalDays: parseInt(e.target.value) || 2 })"
        min="1" max="365" class="input w-20" />
      <span class="text-xs text-gray-400">days</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ modelValue: { type: Object, default: () => ({ type: 'daily' }) } })
const emit = defineEmits(['update:modelValue'])

const presets = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Interval', value: 'interval' },
  { label: 'None', value: 'none' },
]
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function selectPreset(p) {
  emit('update:modelValue', { type: p.value, days: p.value === 'weekly' ? [0] : undefined, intervalDays: p.value === 'interval' ? 2 : undefined })
}
function toggleDay(i) {
  const days = [...(props.modelValue.days || [])]
  const idx = days.indexOf(i)
  if (idx >= 0) days.splice(idx, 1)
  else days.push(i)
  emit('update:modelValue', { ...props.modelValue, days })
}
</script>
