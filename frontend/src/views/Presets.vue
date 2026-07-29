<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
    <h1 class="text-xl font-bold">Presets</h1>

    <div class="flex gap-2">
      <input v-model="searchQuery" @input="loadPresets" type="text" placeholder="Search presets..." class="input flex-1" />
      <select v-model="selectedCategory" @change="loadPresets" class="input w-auto">
        <option value="">All</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <button @click="showCreateForm = !showCreateForm" class="btn text-xs">
      <Plus :size="14" /> Create Preset
    </button>

    <div v-if="showCreateForm" class="card space-y-3">
      <div v-if="myHabits.length" class="space-y-1">
        <label class="text-xs font-medium text-gray-400">Start from a habit</label>
        <select @change="importFromHabit($event.target.value); $event.target.value = ''" class="input text-sm">
          <option value="">Select a habit...</option>
          <option v-for="h in myHabits" :key="h.id" :value="h.id">{{ h.title }}</option>
        </select>
      </div>

      <input v-model="createForm.title" class="input" placeholder="Title" />
      <input v-model="createForm.description" class="input" placeholder="Description" />
      <select v-model="createForm.category" class="input">
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <RecurrenceBuilder v-model="createForm.recurrence" />
      <div class="flex gap-2">
        <button @click="createPreset" class="btn text-xs">Create</button>
        <button @click="showCreateForm = false" class="btn-secondary text-xs">Cancel</button>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <router-link v-for="p in presets" :key="p.id" :to="`/presets/${p.id}`" class="card-hover">
        <h3 class="font-medium text-sm">{{ p.title }}</h3>
        <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ p.description }}</p>
        <div class="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span class="px-1.5 py-0.5 rounded bg-gray-800">{{ p.category }}</span>
          <span>❤️ {{ p.likes || 0 }}</span>
          <span>🍴 {{ p.forks || 0 }}</span>
        </div>
      </router-link>
    </div>

    <p v-if="!presets.length" class="text-sm text-gray-500 text-center py-4">No presets found</p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus } from 'lucide-vue-next'
import RecurrenceBuilder from '../components/RecurrenceBuilder.vue'

const toast = useToast()
const searchQuery = ref('')
const selectedCategory = ref('')
const presets = ref([])
const myHabits = ref([])
const showCreateForm = ref(false)
const categories = ['Fitness', 'Health', 'Learning', 'Productivity', 'Mindfulness', 'Social', 'Other']
const createForm = reactive({ title: '', description: '', category: 'Other', recurrence: { type: 'daily' } })

async function loadPresets() {
  try {
    const res = await api.get('/presets', { params: { q: searchQuery.value, category: selectedCategory.value } })
    presets.value = res.data.presets || res.data || []
  } catch { presets.value = [] }
}

async function loadMyHabits() {
  try {
    const res = await api.get('/habits')
    myHabits.value = res.data.habits || []
  } catch { myHabits.value = [] }
}

function importFromHabit(id) {
  const h = myHabits.value.find(h => h.id === id)
  if (!h) return
  createForm.title = h.title
  createForm.description = h.description || ''
  if (h.recurrence) createForm.recurrence = { ...h.recurrence }
}

async function createPreset() {
  try {
    await api.post('/presets', createForm)
    toast.success('Preset created')
    showCreateForm.value = false
    Object.assign(createForm, { title: '', description: '', category: 'Other', recurrence: { type: 'daily' } })
    loadPresets()
  } catch { toast.error('Failed') }
}

onMounted(() => { loadPresets(); loadMyHabits() })
</script>
