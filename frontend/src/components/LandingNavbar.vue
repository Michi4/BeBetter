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
            class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-[var(--bb-muted)] touch-target">
            {{ item.label }}
          </a>
        </nav>

        <div class="flex items-center gap-3 justify-self-end">
          <button @click="toggleTheme" class="nav-btn p-2.5 rounded-lg text-[var(--bb-muted)] hover:text-[var(--bb-ink)] transition-colors duration-150 touch-target inline-flex items-center justify-center shrink-0" aria-label="Toggle theme">
            <Sun v-if="isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
          <a href="/login" class="nav-link hidden sm:block text-sm font-medium text-[var(--bb-muted)] px-4 py-2 rounded-lg touch-target">Sign In</a>
          <a href="/register" class="btn text-sm px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)] font-semibold">
            Sign Up
          </a>
          <button @click="mobileOpen = !mobileOpen" class="nav-btn md:hidden p-2.5 rounded-lg text-[var(--bb-muted)] hover:text-[var(--bb-ink)] transition-colors duration-150 touch-target" aria-label="Menu" :aria-expanded="mobileOpen">
            <Menu v-if="!mobileOpen" :size="20" />
            <X v-else :size="20" />
          </button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" aria-hidden="true" @click="mobileOpen = false"></div>
    </transition>

    <transition name="drawer">
      <div v-if="mobileOpen" class="bb-nav fixed inset-y-0 right-0 z-50 w-[84%] max-w-xs bg-[var(--bb-bg)] border-l border-[var(--bb-line)] md:hidden flex flex-col shadow-2xl" aria-label="Mobile" role="dialog" aria-modal="true">
        <div class="flex items-center justify-between px-4 h-16 shrink-0 border-b border-[var(--bb-line)] safe-top">
          <a href="/" class="flex items-center gap-2.5" @click="mobileOpen = false">
            <Logo :size="26" />
            <span class="font-extrabold text-base tracking-tight text-[var(--bb-ink)]">BeBetter</span>
          </a>
          <button @click="mobileOpen = false" class="nav-btn p-2.5 rounded-lg text-[var(--bb-muted)] touch-target inline-flex items-center justify-center" aria-label="Close menu">
            <X :size="20" />
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Mobile">
          <a v-for="item in mobileItems" :key="item.href" :href="item.href" @click="mobileOpen = false"
            class="nav-link block px-3 py-3.5 rounded-lg text-sm font-medium text-[var(--bb-muted)] touch-target">
            {{ item.label }}
          </a>
        </nav>
        <div class="px-4 py-4 shrink-0 border-t border-[var(--bb-line)] space-y-2.5 safe-bottom">
          <a href="/login" class="block w-full text-center text-sm font-medium text-[var(--bb-muted)] hover:text-[var(--bb-ink)] px-4 py-3 rounded-xl border border-[var(--bb-line)] transition-colors touch-target">Sign In</a>
          <a href="/register" class="block w-full text-center btn text-sm px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)] font-semibold">Sign Up</a>
        </div>
      </div>
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
]

const mobileItems = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#challenges', label: 'Challenges' },
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
.nav-link,
.nav-btn {
  background: transparent;
  border: 1px solid transparent;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.nav-link:hover,
.nav-btn:hover {
  color: var(--bb-ink);
  background: color-mix(in srgb, var(--bb-muted) 10%, transparent);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
