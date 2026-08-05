<template>
  <header class="sticky top-0 z-50">
    <div class="border-b border-[var(--bb-line)] bg-[var(--bb-bg)]/85 backdrop-blur-xl safe-top">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-[1fr_auto_1fr] items-center">
        <a href="/" class="flex items-center gap-2.5 justify-self-start group" aria-label="BeBetter Home">
          <Logo :size="30" class="transform group-hover:scale-105 transition-transform" />
          <span class="font-extrabold text-lg tracking-tight text-[var(--bb-ink)]">BeBetter</span>
        </a>

        <nav class="bb-nav hidden md:flex items-center gap-1" aria-label="Main">
          <a v-for="item in desktopItems" :key="item.href" :href="item.href"
            class="px-3 py-2 rounded-lg text-sm font-medium text-[var(--bb-muted)] hover:text-[var(--bb-ink)] hover:bg-[var(--bb-line)] transition-colors touch-target">
            {{ item.label }}
          </a>
        </nav>

        <div class="flex items-center gap-3 justify-self-end">
          <button @click="toggleTheme" class="p-2.5 rounded-lg text-[var(--bb-muted)] hover:text-[var(--bb-ink)] hover:bg-[var(--bb-line)] transition-colors touch-target" aria-label="Toggle theme">
            <Sun v-if="isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
          <a href="/login" class="hidden sm:block text-sm font-medium text-[var(--bb-muted)] hover:text-[var(--bb-ink)] px-4 py-2 rounded-lg transition-colors touch-target">Sign In</a>
          <a href="/register" class="btn text-sm px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)] font-semibold">
            Get Started Free
          </a>
          <button @click="mobileOpen = !mobileOpen" class="md:hidden p-2.5 rounded-lg text-[var(--bb-muted)] hover:text-[var(--bb-ink)] hover:bg-[var(--bb-line)] transition-colors touch-target" aria-label="Menu" :aria-expanded="mobileOpen">
            <Menu v-if="!mobileOpen" :size="20" />
            <X v-else :size="20" />
          </button>
        </div>
      </div>
    </div>

    <transition name="mobile-menu">
      <nav v-if="mobileOpen" class="bb-nav md:hidden border-b border-[var(--bb-line)] bg-[var(--bb-bg)]/95 backdrop-blur-xl" aria-label="Mobile">
        <div class="max-w-7xl mx-auto px-4 py-3 space-y-1">
          <a v-for="item in mobileItems" :key="item.href" :href="item.href" @click="mobileOpen = false"
            class="block px-3 py-3 rounded-lg text-sm font-medium text-[var(--bb-muted)] hover:text-[var(--bb-ink)] hover:bg-[var(--bb-line)] transition-colors touch-target">
            {{ item.label }}
          </a>
        </div>
      </nav>
    </transition>
  </header>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import Logo from '../components/Logo.vue'
import { Sun, Moon, Menu, X } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
const mobileOpen = ref(false)

const desktopItems = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#challenges', label: 'Challenges' },
  { href: '#showcase', label: 'Showcase' },
]

const mobileItems = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#challenges', label: 'Challenges' },
  { href: '#showcase', label: 'Showcase' },
  { href: '/login', label: 'Sign In' },
]

watch(mobileOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

function onScroll() {
  if (mobileOpen.value) mobileOpen.value = false
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.mobile-menu-leave-active {
  transition: opacity 0.15s ease;
}
.mobile-menu-enter-active {
  transition: opacity 0.15s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}
</style>
