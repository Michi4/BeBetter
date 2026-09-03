<template>
  <div class="space-y-4">
    <!-- Title -->
    <div>
      <label class="text-xs font-medium text-gray-400 mb-1 block">Title *</label>
      <div class="flex gap-2">
        <EmojiPicker v-model="form.emoji" />
        <input v-model="form.title" class="input flex-1" placeholder="Habit title" />
      </div>
    </div>

    <!-- Description -->
    <div>
      <label class="text-xs font-medium text-gray-400 mb-1 block">Description</label>
      <textarea v-model="form.description" class="input min-h-[60px]" placeholder="Optional description" rows="2"></textarea>
    </div>

    <!-- Schedule -->
    <RecurrenceBuilder v-model="form.schedules" />

    <!-- Reminders -->
    <div>
      <label class="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
        <Bell :size="12" /> Reminders
      </label>
      <div v-if="form.reminderMinutes && form.reminderMinutes.length" class="flex flex-wrap gap-1.5 mb-2">
        <span v-for="(m, i) in form.reminderMinutes" :key="i"
          class="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
          {{ m === 0 ? 'At time' : m + 'm before' }}
          <button @click="removeReminder(i)" class="hover:text-red-400"><X :size="10" /></button>
        </span>
      </div>
      <div class="flex flex-wrap gap-1.5 mb-2">
        <button v-for="p in reminderPresets" :key="p.value" type="button" @click="addReminder(p.value)"
          class="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
          :class="isReminderActive(p.value) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
          {{ p.label }}
        </button>
      </div>
      <div class="flex gap-1.5">
        <input v-model="customReminderInput" type="number" min="1" max="1440" placeholder="Custom"
          class="input text-xs flex-1" @keydown.enter="addCustomReminder" />
        <button type="button" @click="addCustomReminder" class="btn-secondary text-xs px-3"
          :disabled="!customReminderInput || customReminderInput < 1">
          <Plus :size="12" />
        </button>
      </div>
    </div>

    <!-- Advanced toggle -->
    <button type="button" @click="showAdvanced = !showAdvanced"
      class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
      <ChevronDown :size="14" class="transition-transform duration-200" :class="showAdvanced ? 'rotate-180' : ''" />
      {{ showAdvanced ? 'Hide advanced' : 'Show advanced' }}
    </button>

    <!-- Advanced options -->
    <div v-if="showAdvanced" class="space-y-4 pt-1 border-t border-gray-800">
      <!-- Verification Type -->
      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Verification</label>
        <div class="flex gap-2">
          <button type="button" @click="form.verificationType = 'honor'"
            class="flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            :class="form.verificationType === 'honor' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
            <div class="flex items-center justify-center gap-1.5">
              <Shield :size="14" />
              Honor
            </div>
          </button>
          <button type="button" @click="form.verificationType = 'photo'"
            class="flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            :class="form.verificationType === 'photo' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
            <div class="flex items-center justify-center gap-1.5">
              <Camera :size="14" />
              Photo
            </div>
          </button>
        </div>
        <p class="text-[10px] text-gray-600 mt-1">
          {{ form.verificationType === 'photo' ? 'Requires a photo proof each time' : 'Self-reported, no proof needed' }}
        </p>
      </div>

      <!-- Wagers -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-medium text-gray-400">Wagers</label>
          <button type="button" @click="addWager"
            class="text-[10px] px-2 py-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1">
            <Plus :size="10" /> Add wager
          </button>
        </div>
        <div v-if="form.wagers.length === 0" class="text-[11px] text-gray-600">No wagers — add one for accountability</div>
        <div v-for="(wager, i) in form.wagers" :key="i" class="rounded-lg bg-gray-800/50 border border-gray-700 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-gray-500 font-medium">Wager {{ i + 1 }}</span>
            <button type="button" @click="removeWager(i)" class="text-gray-600 hover:text-red-400 transition-colors">
              <X :size="12" />
            </button>
          </div>
          <input v-model="wager.condition" class="input text-xs" placeholder="Condition (e.g. Miss 2 days)" />
          <input v-model="wager.penaltyText" class="input text-xs" placeholder="Penalty (e.g. Buy coffee for a friend)" />
        </div>
      </div>

      <!-- Create as Public Preset -->
      <div v-if="showPresetOption">
        <button type="button" @click="form.createPreset = !form.createPreset"
          class="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left"
          :class="form.createPreset ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'">
          <div class="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
            :class="form.createPreset ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-600'">
            <Check v-if="form.createPreset" :size="12" :stroke-width="3" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium" :class="form.createPreset ? 'text-emerald-300' : 'text-gray-300'">Publish as public preset</div>
            <div class="text-[10px] text-gray-500">Others can discover and use this habit template</div>
          </div>
          <Globe :size="16" :class="form.createPreset ? 'text-emerald-400' : 'text-gray-600'" class="shrink-0" />
        </button>
        <div v-if="form.createPreset" class="mt-2 pl-8">
          <label class="text-xs font-medium text-gray-400 mb-1 block">Category</label>
          <select v-model="form.presetCategory" class="input text-xs">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ChevronDown, Shield, Camera, Plus, X, Check, Globe, Bell } from 'lucide-vue-next'
import RecurrenceBuilder from './RecurrenceBuilder.vue'
import EmojiPicker from './EmojiPicker.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  showPresetOption: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const categories = ['Fitness', 'Health', 'Learning', 'Productivity', 'Mindfulness', 'Social', 'Other']
const showAdvanced = ref(false)

const form = reactive({
  title: '',
  description: '',
  emoji: '🎯',
  schedules: [{ time: null, days: [0, 1, 2, 3, 4, 5, 6] }],
  verificationType: 'honor',
  wagers: [],
  createPreset: false,
  presetCategory: 'Other',
  ...props.modelValue,
  // Deep-clone nested arrays so editing the form never mutates the parent's
  // reactive wagers/schedules (would cause a feedback loop in the emit watch)
  wagers: Array.isArray(props.modelValue?.wagers) ? props.modelValue.wagers.map(w => ({ ...w })) : [],
  schedules: Array.isArray(props.modelValue?.schedules) && props.modelValue.schedules.length
    ? props.modelValue.schedules.map(s => ({ time: s?.time ?? null, days: [...(s?.days || [])] }))
    : [{ time: null, days: [0, 1, 2, 3, 4, 5, 6] }],
})

if (!form.schedules || !form.schedules.length) {
  form.schedules = [{ time: null, days: [0, 1, 2, 3, 4, 5, 6] }]
}

watch(form, (val) => {
  emit('update:modelValue', { ...val })
}, { deep: true })

watch(() => props.modelValue, (val) => {
  if (val.title !== undefined) form.title = val.title
  if (val.description !== undefined) form.description = val.description
  if (val.emoji !== undefined) form.emoji = val.emoji
  if (val.schedules !== undefined && Array.isArray(val.schedules)) {
    form.schedules = val.schedules.map(s => ({ time: s?.time ?? null, days: [...(s?.days || [])] }))
  }
  if (val.verificationType !== undefined) form.verificationType = val.verificationType
  if (val.wagers !== undefined && Array.isArray(val.wagers)) form.wagers = val.wagers.map(w => ({ ...w }))
  if (val.createPreset !== undefined) form.createPreset = val.createPreset
  if (val.presetCategory !== undefined) form.presetCategory = val.presetCategory
}, { deep: true })

function addWager() {
  form.wagers.push({ condition: '', penaltyText: '' })
}

function removeWager(i) {
  form.wagers.splice(i, 1)
}

const reminderPresets = [
  { label: 'At time', value: 0 },
  { label: '5m', value: 5 },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
]
const customReminderInput = ref('')

if (!form.reminderMinutes) form.reminderMinutes = []

function isReminderActive(val) {
  return (form.reminderMinutes || []).includes(val)
}
function addReminder(val) {
  if (!form.reminderMinutes) form.reminderMinutes = []
  if (form.reminderMinutes.includes(val)) {
    form.reminderMinutes = form.reminderMinutes.filter(v => v !== val)
  } else {
    form.reminderMinutes.push(val)
    form.reminderMinutes.sort((a, b) => b - a)
  }
}
function removeReminder(i) {
  form.reminderMinutes.splice(i, 1)
}
function addCustomReminder() {
  const val = parseInt(customReminderInput.value)
  if (!val || val < 0) return
  if (!form.reminderMinutes) form.reminderMinutes = []
  if (!form.reminderMinutes.includes(val)) {
    form.reminderMinutes.push(val)
    form.reminderMinutes.sort((a, b) => b - a)
  }
  localStorage.setItem('bebetter_lastReminder', String(val))
  customReminderInput.value = ''
}
</script>
