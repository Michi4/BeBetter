<template>
  <Teleport to="body">
    <Transition name="demo-modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/45 backdrop-blur-md" aria-hidden="true"></div>
        <div
          class="relative w-full max-w-sm rounded-2xl border border-white/15 p-6 space-y-4 shadow-2xl backdrop-blur-2xl demo-card"
          role="dialog"
          aria-modal="true"
        >
          <div
            class="w-12 h-12 rounded-xl bg-[var(--bb-accent)]/10 border border-[var(--bb-accent)]/20 flex items-center justify-center"
          >
            <Sparkles :size="22" class="text-[var(--bb-accent)]" />
          </div>

          <div class="space-y-1">
            <h2 class="text-lg font-bold text-[var(--bb-ink)]">Create your free account</h2>
            <p class="text-sm text-[var(--bb-muted)] leading-relaxed">
              Friends, leaderboards, notifications, and publishing presets are only available to
              real accounts. Sign up free in under a minute — your streaks keep going.
            </p>
          </div>

          <div class="flex flex-col gap-2 pt-1">
            <router-link
              to="/register"
              class="btn w-full"
              @click="close"
            >
              <UserPlus :size="16" /> Sign Up
            </router-link>
            <button
              class="btn-secondary w-full"
              @click="close"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Sparkles, UserPlus } from 'lucide-vue-next'
import { demoPromptVisible, closeDemoPrompt } from '../utils/demoPrompt'

const visible = computed(() => demoPromptVisible.value)

function close() {
  closeDemoPrompt()
}
</script>

<style scoped>
.demo-card {
  background: color-mix(in srgb, var(--app-card-bg) 78%, transparent);
}
.demo-modal-enter-active,
.demo-modal-leave-active {
  transition: opacity 0.18s ease;
}
.demo-modal-enter-active .card-inner,
.demo-modal-leave-active .card-inner {
  transition: transform 0.18s ease;
}
.demo-modal-enter-from,
.demo-modal-leave-to {
  opacity: 0;
}
.demo-modal-enter-active > div:last-child,
.demo-modal-leave-active > div:last-child {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
}
.demo-modal-enter-from > div:last-child,
.demo-modal-leave-to > div:last-child {
  transform: translateY(8px) scale(0.97);
  opacity: 0;
}
</style>