<template>
  <div class="min-h-[100dvh]">
    <!-- Top bar -->
    <nav class="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50 safe-top">
      <div class="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        <router-link to="/dashboard" class="flex items-center gap-2 font-bold text-lg shrink-0">
          <Logo :size="28" />
          <span class="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">BeBetter</span>
        </router-link>
        <div class="flex items-center gap-1 shrink-0">
          <button @click="toggleTheme" class="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors touch-target">
            <Sun v-if="isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
          <router-link v-if="auth.user" :to="`/profile/${auth.user.username || auth.user.id}`"
            class="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
            {{ (auth.user.name || auth.user.username || '?')[0].toUpperCase() }}
          </router-link>
          <button v-if="auth.user" @click="handleLogout" class="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors touch-target">
            <LogOut :size="18" />
          </button>
        </div>
      </div>
    </nav>

    <router-view />

    <!-- Bottom nav (mobile only, authenticated) -->
    <nav v-if="auth.user" class="fixed bottom-0 inset-x-0 z-50 border-t border-gray-800/60 bg-gray-900/95 backdrop-blur-xl safe-bottom md:hidden">
      <div class="flex items-center justify-around h-16 max-w-lg mx-auto">
        <router-link v-for="item in bottomNavItems" :key="item.to" :to="item.to"
          class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[56px]"
          :class="isActive(item.to) ? 'text-emerald-400' : 'text-gray-500'">
          <component :is="item.icon" :size="22" :stroke-width="isActive(item.to) ? 2.5 : 1.5" />
          <span class="text-[10px] font-medium">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { LogOut, LayoutDashboard, ListTodo, Users, Trophy, BookOpen, Shield, Sun, Moon } from 'lucide-vue-next'
import Logo from './components/Logo.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const isDark = ref(true)

const bottomNavItems = computed(() => {
  const items = [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/habits', label: 'Habits', icon: ListTodo },
    { to: '/friends', label: 'Friends', icon: Users },
    { to: '/leaderboard', label: 'Ranks', icon: Trophy },
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
