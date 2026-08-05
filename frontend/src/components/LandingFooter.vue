<template>
  <footer class="border-t border-gray-900 bg-gray-950 py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div class="space-y-4">
          <a href="/" class="flex items-center gap-2 font-bold text-lg">
            <Logo :size="28" />
            <span class="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">BeBetter</span>
          </a>
          <p class="text-sm text-gray-400 max-w-xs">Build habits that last. Track what matters. Together.</p>
        </div>

        <div class="space-y-3">
          <h3 class="font-semibold text-gray-300 text-base">Product</h3>
          <nav class="space-y-2 text-sm">
            <a href="#features" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">Features</a>
            <a href="#showcase" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">Showcase</a>
            <a href="#cta" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">Pricing</a>
            <a href="/presets" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">Templates</a>
          </nav>
        </div>

        <div class="space-y-3">
          <h3 class="font-semibold text-gray-300 text-base">Company</h3>
          <nav class="space-y-2 text-sm">
            <a href="https://github.com/Michi4/BeBetter" target="_blank" rel="noopener" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">GitHub</a>
            <a href="https://websters.at" target="_blank" rel="noopener" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">Websters</a>
          </nav>
        </div>

        <div class="space-y-3">
          <h3 class="font-semibold text-gray-300 text-base">Legal</h3>
          <nav class="space-y-2 text-sm">
            <a href="/privacy" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">Privacy Policy</a>
            <a href="/terms" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">Terms of Service</a>
            <a href="/imprint" class="text-gray-400 hover:text-white underline underline-offset-2 transition-colors block">Imprint</a>
          </nav>
        </div>
      </div>

      <div class="border-t border-gray-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p class="text-xs text-gray-400">&copy; 2026 Websters. All rights reserved.</p>
        <p class="text-xs text-gray-400">BeBetter is a project by <a href="https://websters.at" target="_blank" rel="noopener" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">Websters</a>.</p>
        <a href="https://github.com/Michi4/BeBetter" target="_blank" rel="noopener" class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition-colors">
          <Github :size="14" />
          View on GitHub
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup>
import Logo from '../components/Logo.vue'
import { Github } from 'lucide-vue-next'
</script>