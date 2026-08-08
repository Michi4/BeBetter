<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="cancel">
      <div class="card w-full max-w-sm mx-0 sm:mx-4 space-y-4 rounded-b-2xl sm:rounded-2xl safe-bottom" style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 20px)" role="alertdialog" aria-modal="true">
        <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0" :class="tone.bg">
          <component :is="tone.icon" :size="20" :class="tone.text" />
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold text-base">{{ state.title }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed">{{ state.message }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="cancel" class="btn-secondary flex-1">{{ state.cancelLabel }}</button>
          <button @click="confirm" class="btn flex-1" :class="state.danger ? '!bg-red-600 hover:!bg-red-500' : ''">{{ state.confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { AlertTriangle, Trash2 } from 'lucide-vue-next'

const emit = defineEmits(['confirmed', 'cancelled'])

const show = ref(false)
const resolve = ref(null)
const state = ref({
  danger: true,
  title: 'Are you sure?',
  message: 'This action cannot be undone.',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
})

const tone = computed(() => ({
  bg: state.value.danger ? 'bg-red-500/15' : 'bg-amber-500/15',
  text: state.value.danger ? 'text-red-400' : 'text-amber-400',
  icon: state.value.danger ? Trash2 : AlertTriangle,
}))

function open(opts = {}) {
  state.value = { ...state.value, ...opts }
  show.value = true
  return new Promise((res) => { resolve.value = res })
}

function confirm() {
  show.value = false
  resolve.value?.(true)
  emit('confirmed')
}

function cancel() {
  show.value = false
  resolve.value?.(false)
  emit('cancelled')
}

defineExpose({ open })
</script>