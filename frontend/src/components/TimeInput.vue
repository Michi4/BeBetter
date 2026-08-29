<template>
  <div class="flex items-center gap-1" :class="{ 'opacity-40 pointer-events-none': disabled }">
    <!-- Clickable empty state when no time set -->
    <button v-if="!modelValue" type="button" @click="emit('update:modelValue', '08:00')" :disabled="disabled"
      class="px-2.5 py-1 rounded-lg border border-dashed border-gray-700 bg-gray-800/40 text-xs text-gray-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors flex items-center gap-1.5 cursor-pointer">
      <Clock :size="12" />
      <span>{{ emptyLabel }}</span>
    </button>

    <template v-else>
      <!-- 12h mode: hour / minute / AM-PM selects -->
      <template v-if="is12h">
        <select :value="hour12" @change="setPart('hour', $event.target.value)" aria-label="Hour"
          class="input !w-auto px-1.5 py-1.5 text-xs text-center bg-gray-800 border-gray-700 text-gray-100 rounded-lg appearance-none cursor-pointer">
          <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
        </select>
        <span class="text-gray-500 text-xs">:</span>
        <select :value="minute" @change="setPart('minute', $event.target.value)" aria-label="Minute"
          class="input !w-auto px-1.5 py-1.5 text-xs text-center bg-gray-800 border-gray-700 text-gray-100 rounded-lg appearance-none cursor-pointer">
          <option v-if="!minutes.includes(minute)" :value="minute">{{ String(minute).padStart(2, '0') }}</option>
          <option v-for="m in minutes" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
        </select>
        <select :value="ampm" @change="setPart('ampm', $event.target.value)" aria-label="AM or PM"
          class="input !w-auto px-1.5 py-1.5 text-xs text-center bg-gray-800 border-gray-700 text-gray-100 rounded-lg appearance-none cursor-pointer">
          <option value="am">AM</option>
          <option value="pm">PM</option>
        </select>
      </template>

      <!-- 24h mode: native time input -->
      <input v-else :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"
        type="time" class="input w-24 text-xs text-center" :disabled="disabled" />

      <button v-if="allowClear" type="button" @click="emit('update:modelValue', '')"
        class="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0" :aria-label="clearLabel">
        <X :size="12" />
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getTimeFormat } from '../utils/timeFormat'
import { Clock, X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  allowClear: { type: Boolean, default: false },
  emptyLabel: { type: String, default: 'Anytime' },
  clearLabel: { type: String, default: 'Clear time' },
})

const emit = defineEmits(['update:modelValue'])

const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

const is12h = computed(() => getTimeFormat() === '12h')

const parts = computed(() => {
  const [h, m] = (props.modelValue || '08:00').split(':').map(Number)
  return { hour: isNaN(h) ? 8 : h, minute: isNaN(m) ? 0 : m }
})

const hour12 = computed(() => {
  const h = parts.value.hour % 12
  return h === 0 ? 12 : h
})

const minute = computed(() => parts.value.minute)

const ampm = computed(() => (parts.value.hour >= 12 ? 'pm' : 'am'))

function to24h(h12, isPm) {
  if (h12 === 12) return isPm ? 12 : 0
  return isPm ? h12 + 12 : h12
}

function setPart(part, value) {
  let { hour, minute: min } = parts.value
  if (part === 'hour') {
    hour = to24h(Number(value), ampm.value === 'pm')
  } else if (part === 'minute') {
    min = Number(value)
  } else if (part === 'ampm') {
    const h12 = hour % 12 === 0 ? 12 : hour % 12
    hour = to24h(h12, value === 'pm')
  }
  emit('update:modelValue', `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
}
</script>