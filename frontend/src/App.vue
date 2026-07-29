<template>
  <div class="min-h-screen">
    <!-- Authenticated nav -->
    <nav v-if="auth.user" class="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <router-link to="/dashboard" class="flex items-center gap-2 font-bold text-lg shrink-0">
          <span class="text-emerald-400">🔥</span>
          <span class="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent hidden sm:inline">BeBetter</span>
        </router-link>
        <div class="flex items-center gap-1 overflow-x-auto">
          <router-link v-for="item in navItems" :key="item.to" :to="item.to"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 shrink-0"
            :class="isActive(item.to) ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'">
            <component :is="item.icon" :size="16" />
            <span class="hidden md:inline">{{ item.label }}</span>
          </router-link>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button @click="toggleTheme" class="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors duration-150">
            <Sun v-if="isDark" :size="16" />
            <Moon v-else :size="16" />
          </button>
          <router-link v-if="auth.user" :to="`/profile/${auth.user.username || auth.user.id}`" class="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors duration-150 hover:bg-gray-800">
            <div class="w-7 h-7 rounded-full bg-emerald-600/20 flex items-center justify-center text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              {{ (auth.user.name || auth.user.username || '?')[0].toUpperCase() }}
            </div>
          </router-link>
          <button @click="handleLogout" class="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors duration-150">
            <LogOut :size="16" />
          </button>
        </div>
      </div>
    </nav>

    <!-- Guest nav -->
    <nav v-else class="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <router-link to="/login" class="flex items-center gap-2 font-bold text-lg">
          <span class="text-emerald-400">🔥</span>
          <span class="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">BeBetter</span>
        </router-link>
        <button @click="toggleTheme" class="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors duration-150">
          <Sun v-if="isDark" :size="16" />
          <Moon v-else :size="16" />
        </button>
      </div>
    </nav>

    <main class="max-w-5xl mx-auto px-4 py-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { LogOut, LayoutDashboard, ListTodo, Users, Trophy, BookOpen, Shield, Sun, Moon } from 'lucide-vue-next'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const isDark = ref(true)

const navItems = computed(() => {
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/habits', label: 'Habits', icon: ListTodo },
    { to: '/friends', label: 'Friends', icon: Users },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/presets', label: 'Presets', icon: BookOpen },
  ]
  if (auth.user?.role === 'admin') {
    items.push({ to: '/admin', label: 'Admin', icon: Shield })
  }
  return items
})

function isActive(to) {
  const path = route.path
  if (to === '/dashboard') return path === '/dashboard'
  if (to === '/habits') return path === '/habits'
  return path.startsWith(to)
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('light', !isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'light') {
    isDark.value = false
    document.documentElement.classList.add('light')
  }
})
</script>
