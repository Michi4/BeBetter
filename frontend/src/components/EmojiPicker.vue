<template>
  <div class="relative">
    <button type="button" @click="toggleOpen"
      class="h-[44px] min-w-[44px] rounded-lg border border-[var(--app-input-border)] bg-[var(--app-input-bg)] flex items-center justify-center text-xl transition-colors hover:border-emerald-500/50 touch-target"
      :class="open ? 'border-emerald-500 ring-1 ring-emerald-500' : ''"
      :aria-expanded="open" aria-haspopup="grid" :title="modelValue || 'Pick an emoji'">
      <span v-if="modelValue">{{ modelValue }}</span>
      <Smile v-else :size="18" class="text-gray-500" />
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[70]" @click.self="close" @keydown.escape="close">
        <div class="card w-[320px] max-w-[calc(100vw-2rem)] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 space-y-3 shadow-xl" @click.stop>
          <div class="relative">
            <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input ref="searchEl" v-model="query" type="text" placeholder="Search emoji…"
              class="input !pl-9 !py-2 text-sm" />
          </div>
          <div ref="gridEl" class="grid grid-cols-8 gap-1 max-h-56 overflow-y-auto pr-1" role="grid">
            <button v-for="e in filtered" :key="e.emoji" type="button"
              class="h-9 rounded-lg text-lg flex items-center justify-center hover:bg-emerald-500/10 transition-colors"
              :title="e.label" @click="pick(e.emoji)">
              {{ e.emoji }}
            </button>
            <p v-if="!filtered.length" class="col-span-8 text-center text-xs text-gray-500 py-4">No emoji found</p>
          </div>
          <div v-if="recent.length" class="flex items-center gap-1 pt-1 border-t border-[var(--app-card-border)]">
            <Clock3 :size="12" class="text-gray-500 mr-1 shrink-0" />
            <button v-for="e in recent" :key="e" type="button"
              class="h-8 w-8 rounded-lg text-base flex items-center justify-center hover:bg-emerald-500/10 transition-colors"
              :title="e" @click="pick(e)">
              {{ e }}
            </button>
            <button type="button" @click="clearRecent" class="ml-auto text-[10px] text-gray-500 hover:text-gray-300 px-1" title="Clear recent">
              Clear
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { Smile, Search, Clock3 } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const searchEl = ref(null)
const gridEl = ref(null)

const RECENT_KEY = 'bebetter_recent_emojis'
const recent = ref([])

try {
  recent.value = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 12)
} catch {}

const EMOJIS = [
  // Health & fitness
  '💪', '🏋️', '🏃', '🚴', '🧘', '🏊', '⛰️', '🧗', '🥊', '⚽', '🏀', '🎾', '🏓', '🎿', '🤸', '🧎',
  // Food & drink
  '🥗', '🥦', '🍎', '🥕', '💧', '🍵', '☕', '🥤', '🍫', '🥑', '🍳', '🍽️', '🚭',
  // Mind & work
  '📚', '✍️', '✏️', '📖', '🧠', '💡', '🎯', '🖥️', '📝', '🧩', '🎨', '🎹', '🎸', '🎤', '📷', '🖌️',
  // Sleep & energy
  '😴', '🌙', '⏰', '🌅', '☀️', '🌞', '🔋', '⚡',
  // Self care & habits
  '🧼', '🪥', '🫧', '🚿', '💊', '❤️', '💖', '🙏', '😊', '✨', '🌟', '🔥', '✅', '📅', '🗓️',
  '🌱', '🌿', '💚', '🧴', '💅', '🛁', '🧸', '👟', '🧦', '🎧', '🕯️',
  // Social & misc
  '👨‍👩‍👧', '👯', '🗣️', '🤝', '💬', '📞', '📱', '💌', '🎁', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '🏅',
  '🚶', '🛌', '🧹', '🧺', '🚗', '🚲', '🦷', '👀', '🖐️', '🍃', '🌊',
]

const categories = {
  'health & fitness': ['💪', '🏋️', '🏃', '🚴', '🧘', '🏊', '⛰️', '🧗', '🥊', '⚽', '🏀', '🎾', '🏓', '🎿', '🤸', '🧎', '🚶'],
  'food & drink': ['🥗', '🥦', '🍎', '🥕', '💧', '🍵', '☕', '🥤', '🍫', '🥑', '🍳', '🍽️', '🚭'],
  'mind & work': ['📚', '✍️', '✏️', '📖', '🧠', '💡', '🎯', '🖥️', '📝', '🧩', '🎨', '🎹', '🎸', '🎤', '📷', '🖌️'],
  'sleep & energy': ['😴', '🌙', '⏰', '🌅', '☀️', '🌞', '🔋', '⚡'],
  'self care': ['🧼', '🪥', '🫧', '🚿', '💊', '❤️', '💖', '🙏', '😊', '✨', '🌟', '🔥', '✅', '📅', '🗓️', '🌱', '🌿', '💚', '🧴', '💅', '🛁', '🧸', '👟', '🧦', '🎧', '🕯️'],
  'misc': ['👨‍👩‍👧', '👯', '🗣️', '🤝', '💬', '📞', '📱', '💌', '🎁', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '🏅', '🛌', '🧹', '🧺', '🚗', '🚲', '🦷', '👀', '🖐️', '🍃', '🌊'],
}

const registry = Object.entries(categories).flatMap(([cat, emojis]) =>
  emojis.map(emoji => ({ emoji, label: `${cat} — ${emoji}` }))
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return registry
  const exact = registry.filter(e => e.emoji.includes(q))
  if (exact.length) return exact
  return registry.filter(e => e.label.includes(q))
})

function pick(emoji) {
  emit('update:modelValue', emoji)
  close()
  recent.value = [emoji, ...recent.value.filter(r => r !== emoji)].slice(0, 12)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value)) } catch {}
}

function clearRecent() {
  recent.value = []
  try { localStorage.removeItem(RECENT_KEY) } catch {}
}

function close() {
  open.value = false
  query.value = ''
}

function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => searchEl.value?.focus())
  }
}
</script>