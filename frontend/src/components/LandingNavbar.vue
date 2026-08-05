<template>
  <header class="border-b border-gray-900/60 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 safe-top">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5 group" aria-label="BeBetter Home">
        <Logo :size="32" class="transform group-hover:scale-105 transition-transform" />
        <span class="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">BeBetter</span>
      </a>

      <nav class="hidden md:flex items-center gap-1 ml-8">
        <a href="#features" class="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors underline underline-offset-2">Features</a>
        <a href="#challenges" class="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors underline underline-offset-2">Challenges</a>
        <a href="#showcase" class="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors underline underline-offset-2">Showcase</a>
        <a href="#cta" class="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors underline underline-offset-2">Pricing</a>
      </nav>

      <div class="flex items-center gap-3">
        <button @click="toggleTheme" class="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors touch-target" aria-label="Toggle theme">
          <Sun v-if="isDark" :size="18" />
          <Moon v-else :size="18" />
        </button>
        <a href="/login" class="hidden sm:block text-sm font-medium text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-colors underline underline-offset-2">Sign In</a>
        <a href="/register" class="btn text-sm px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] font-semibold">
          Get Started Free
        </a>
        <button @click="mobileOpen = !mobileOpen" class="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors touch-target" aria-label="Menu" :aria-expanded="mobileOpen">
          <Menu v-if="!mobileOpen" :size="20" />
          <X v-else :size="20" />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <transition name="mobile-menu">
      <nav v-if="mobileOpen" class="md:hidden border-t border-gray-900/60 bg-gray-950/95 backdrop-blur-xl">
        <div class="max-w-7xl mx-auto px-4 py-3 space-y-1">
          <a v-for="item in mobileItems" :key="item.href" :href="item.href" @click="mobileOpen = false"
            class="block px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors underline underline-offset-2 touch-target">
            {{ item.label }}
          </a>
        </div>
      </nav>
    </transition>
  </header>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import Logo from '../components/Logo.vue'
import { Sun, Moon, Menu, X } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
const mobileOpen = ref(false)

const mobileItems = [
  { href: '#features', label: 'Features' },
  { href: '#challenges', label: 'Challenges' },
  { href: '#showcase', label: 'Showcase' },
  { href: '#cta', label: 'Pricing' },
]

watch(mobileOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('scroll', () => {
    if (mobileOpen.value) mobileOpen.value = false
  })
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