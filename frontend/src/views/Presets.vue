<template>
  <div class="page">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Presets</h1>
      <button @click="toggleCreate" class="btn-secondary text-xs">
        <Plus :size="14" />
        <span class="hidden sm:inline">Create Preset</span>
        <span class="sm:hidden">Create</span>
      </button>
    </div>

    <div class="flex gap-2">
      <input
        v-model="searchQuery"
        @input="debouncedLoad"
        type="text"
        placeholder="Search presets..."
        class="input flex-1"
      />
      <select v-model="selectedCategory" @change="loadPresets" class="input w-auto min-w-[110px]">
        <option value="">All</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div v-if="showCreateForm" class="card space-y-3">
      <p class="section-title">New Preset</p>

      <div v-if="myHabits.length">
        <label class="text-xs font-medium text-gray-400 mb-1 block">Import from a habit</label>
        <select @change="importFromHabit($event.target.value); $event.target.value = ''" class="input">
          <option value="">Select a habit to import...</option>
          <option v-for="h in myHabits" :key="h.id" :value="h.id">{{ h.title }}</option>
        </select>
      </div>

      <input v-model="createForm.title" class="input" placeholder="Title" />
      <textarea v-model="createForm.description" class="input min-h-[80px]" placeholder="Description" rows="3"></textarea>

      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Category</label>
        <select v-model="createForm.category" class="input">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <RecurrenceBuilder v-model="createForm.recurrence" />

      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Verification</label>
        <div class="flex gap-2">
          <button type="button" @click="createForm.verificationType = 'honor'"
            class="flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            :class="createForm.verificationType === 'honor' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
            Honor
          </button>
          <button type="button" @click="createForm.verificationType = 'photo'"
            class="flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            :class="createForm.verificationType === 'photo' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
            Photo
          </button>
        </div>
      </div>

      <div class="flex gap-2 pt-1">
        <button @click="createPreset" class="btn flex-1" :disabled="!createForm.title.trim()">
          <Plus :size="16" /> Create
        </button>
        <button @click="showCreateForm = false" class="btn-secondary flex-1">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <Loader2 :size="20" class="animate-spin text-gray-500 mx-auto" />
    </div>

    <div v-else-if="presets.length" class="grid grid-cols-2 gap-3">
      <router-link
        v-for="p in presets"
        :key="p.id"
        :to="`/presets/${p.id}`"
        class="card-hover space-y-2"
      >
        <h3 class="font-medium text-sm line-clamp-1">{{ p.title }}</h3>
        <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed">{{ p.description }}</p>
        <div class="flex items-center gap-2">
          <span class="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] text-gray-400">{{ p.category }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs text-gray-500 pt-1 border-t border-gray-800">
          <span class="flex items-center gap-1"><Heart :size="12" /> {{ p.likes || 0 }}</span>
          <span class="flex items-center gap-1"><GitFork :size="12" /> {{ p.forks || 0 }}</span>
        </div>
      </router-link>
    </div>

    <div v-else class="text-center py-12 text-gray-500 text-sm">
      <Search :size="32" class="mx-auto mb-3 opacity-40" />
      <p>No presets found</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus, Heart, GitFork, Search, Loader2 } from 'lucide-vue-next'
import RecurrenceBuilder from '../components/RecurrenceBuilder.vue'

const toast = useToast()

const searchQuery = ref('')
const selectedCategory = ref('')
const presets = ref([])
const myHabits = ref([])
const showCreateForm = ref(false)
const loading = ref(false)

const categories = ['Fitness', 'Health', 'Learning', 'Productivity', 'Mindfulness', 'Social', 'Other']
const createForm = reactive({
  title: '',
  description: '',
  category: 'Other',
  recurrence: { type: 'daily' },
  verificationType: 'honor',
})

let debounceTimer = null
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadPresets, 300)
}

async function loadPresets() {
  loading.value = true
  try {
    const res = await api.get('/presets', { params: { q: searchQuery.value, category: selectedCategory.value } })
    presets.value = res.data.presets || res.data || []
  } catch {
    presets.value = []
  } finally {
    loading.value = false
  }
}

async function loadMyHabits() {
  try {
    const res = await api.get('/habits')
    myHabits.value = res.data.habits || []
  } catch {
    myHabits.value = []
  }
}

function importFromHabit(id) {
  const h = myHabits.value.find(h => String(h.id) === String(id))
  if (!h) return
  createForm.title = h.title
  createForm.description = h.description || ''
  if (h.recurrence) createForm.recurrence = { ...h.recurrence }
  if (h.verificationType) createForm.verificationType = h.verificationType
}

function toggleCreate() {
  showCreateForm.value = !showCreateForm.value
}

async function createPreset() {
  if (!createForm.title.trim()) return
  try {
    await api.post('/presets', {
      title: createForm.title,
      description: createForm.description,
      category: createForm.category,
      config: {
        title: createForm.title,
        description: createForm.description,
        recurrence: createForm.recurrence,
        verificationType: createForm.verificationType,
      },
    })
    toast.success('Preset created')
    showCreateForm.value = false
    Object.assign(createForm, {
      title: '', description: '', category: 'Other',
      recurrence: { type: 'daily' }, verificationType: 'honor',
    })
    loadPresets()
  } catch {
    toast.error('Failed to create preset')
  }
}

onMounted(() => {
  loadPresets()
  loadMyHabits()
})
</script>
