<template>
  <div class="min-h-[100dvh]">
    <!-- Top bar -->
    <nav v-if="!publicRoutes.includes(route.name)" class="border-b border-[var(--app-nav-border)] bg-[var(--app-nav-bg)] backdrop-blur-xl sticky top-0 z-50 safe-top">
      <div class="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        <div class="flex items-center gap-2 shrink-0">
          <router-link to="/" class="flex items-center gap-2 font-bold text-lg">
            <Logo :size="28" />
            <span class="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">BeBetter</span>
          </router-link>
          <template v-if="auth.user">
            <div class="hidden md:flex items-center gap-1 ml-4">
              <template v-for="item in desktopNavItems" :key="item.to">
                <button v-if="isLockedForDemo(item.to)" @click="openDemoPrompt()"
                  class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-800">
                  <component :is="item.icon" :size="14" />
                  {{ item.label }}
                </button>
                <router-link v-else :to="item.to"
                  class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  :class="isActive(item.to) ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'">
                  <component :is="item.icon" :size="14" />
                  {{ item.label }}
                </router-link>
              </template>
            </div>
          </template>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button @click="toggleTheme" class="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors touch-target inline-flex items-center justify-center shrink-0" aria-label="Toggle theme">
            <Sun v-if="isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
          <template v-if="auth.user">
            <router-link :to="`/profile/${auth.user.username || auth.user.id}`"
              class="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              {{ (auth.user?.username || '?')[0]?.toUpperCase() || '?' }}
            </router-link>
            <button @click="handleLogout" class="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors touch-target">
              <LogOut :size="18" />
            </button>
          </template>
          <template v-else>
            <router-link to="/login" class="text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors">Sign In</router-link>
            <router-link to="/register" class="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition-colors">Sign Up</router-link>
          </template>
        </div>
      </div>
    </nav>

    <router-view v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>

    <!-- Offline indicator -->
    <div v-if="!online"
      class="fixed bottom-24 md:bottom-6 inset-x-0 z-[70] flex justify-center px-4 pointer-events-none">
      <div class="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium backdrop-blur-xl shadow-lg">
        <WifiOff :size="14" />
        You're offline — showing saved data, changes will sync when you're back
      </div>
    </div>

    <!-- Push prompt (authenticated, first-run) -->
    <div class="max-w-3xl mx-auto px-4">
      <PushPrompt v-if="auth.user" />
    </div>

    <!-- Demo account -> sign up prompt -->
    <SignUpPrompt />

    <!-- Bottom nav (mobile only, authenticated) -->
    <nav v-if="auth.user" class="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--app-nav-border)] bg-[var(--app-nav-bg)] backdrop-blur-xl safe-bottom md:hidden">
      <div class="flex items-center justify-around h-16 max-w-lg mx-auto">
        <template v-for="item in bottomNavItems" :key="item.to">
          <button v-if="isLockedForDemo(item.to)" @click="openDemoPrompt()"
            class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[56px] text-gray-500">
            <component :is="item.icon" :size="22" :stroke-width="1.5" />
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </button>
          <router-link v-else :to="item.to"
            class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[56px]"
            :class="isActive(item.to) ? 'text-emerald-400' : 'text-gray-500'">
            <component :is="item.icon" :size="22" :stroke-width="isActive(item.to) ? 2.5 : 1.5" />
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </router-link>
        </template>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { LogOut, LayoutDashboard, ListTodo, Users, Trophy, BookOpen, Shield, Sun, Moon, WifiOff } from 'lucide-vue-next'
import Logo from './components/Logo.vue'
import PushPrompt from './components/PushPrompt.vue'
import SignUpPrompt from './components/SignUpPrompt.vue'
import { useTheme } from './composables/useTheme'
import { useOnline } from './composables/useOnline'
import { openDemoPrompt } from './utils/demoPrompt'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const { online } = useOnline()

const publicRoutes = ['landing', 'landing-alt', 'forgot-password', 'reset-password', 'privacy', 'terms', 'imprint']

const desktopNavItems = computed(() => {
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
  if (to === '/habits') return path.startsWith('/habits')
  if (to === '/friends') return path === '/friends'
  if (to === '/presets') return path.startsWith('/presets')
  if (to === '/admin') return path === '/admin'
  return path.startsWith(to)
}

function isLockedForDemo(to) {
  if (!auth.isDemo) return false
  return to === '/friends' || to === '/leaderboard'
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
