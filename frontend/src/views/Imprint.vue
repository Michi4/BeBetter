<template>
  <div class="page min-h-screen">
    <header class="border-b border-gray-800/60 dark:border-gray-700/60 bg-gray-900/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50 safe-top">
      <div class="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2 font-bold text-lg">
          <Logo :size="28" />
          <span class="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">BeBetter</span>
        </a>
        <div class="flex items-center gap-1 shrink-0">
          <button @click="toggleTheme" class="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors touch-target" aria-label="Toggle theme">
            <Sun v-if="isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
          <a href="/login" class="text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors underline underline-offset-2">Sign In</a>
          <a href="/register" class="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition-colors">Sign Up</a>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <section class="max-w-3xl mx-auto px-4 py-16 space-y-10">
        <header class="text-center space-y-3">
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Imprint</h1>
          <p class="text-gray-500 text-sm">Legal disclosure per §5 TMG / §25 MedienG</p>
        </header>

        <div class="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">Service Provider</h2>
            <address class="not-italic space-y-1">
              <p><strong>Websters</strong></p>
              <p>Michael R., Stevan V., Manuel P.</p>
              <p>Engerwitzdorf, Austria</p>
              <p>Email: <a href="mailto:office@websters.at" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">office@websters.at</a></p>
              <p>Web: <a href="https://websters.at" target="_blank" rel="noopener" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">websters.at</a></p>
            </address>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">Project Information</h2>
            <p><strong>BeBetter</strong> is a habit tracking, task management, and social accountability application developed by Websters.</p>
            <p>Source code: <a href="https://github.com/Michi4/BeBetter" target="_blank" rel="noopener" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">github.com/Michi4/BeBetter</a></p>
            <p>License: MIT License — free to use, modify, and distribute.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">Hosting & Infrastructure</h2>
            <p>This instance is hosted on infrastructure managed by Websters. For self-hosted deployments, the operator of the instance is the service provider.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">Data Protection Officer</h2>
            <p>For data protection inquiries, contact: <a href="mailto:office@websters.at" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">office@websters.at</a></p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">Dispute Resolution</h2>
            <p>We are not obligated to participate in consumer arbitration proceedings. We aim to resolve disputes directly and amicably.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">Copyright</h2>
            <p>The BeBetter name, logo, and brand are property of Websters. The source code is licensed under MIT. Third-party libraries and fonts retain their respective licenses.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">Liability for Links</h2>
            <p>Our service may contain links to external websites. We have no control over their content and assume no liability for them. The respective providers are responsible for their content.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">Contact</h2>
            <p>Websters<br>
            Engerwitzdorf, Austria<br>
            Email: <a href="mailto:office@websters.at" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">office@websters.at</a><br>
            Web: <a href="https://websters.at" target="_blank" rel="noopener" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">websters.at</a>
            </p>
          </section>
        </div>
      </section>
    </main>

    <footer class="border-t border-gray-900 bg-gray-950 py-8">
      <div class="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div>&copy; 2026 Websters. All rights reserved.</div>
        <div class="flex gap-4">
          <a href="/privacy" class="hover:text-gray-300 underline underline-offset-2">Privacy Policy</a>
          <a href="/terms" class="hover:text-gray-300 underline underline-offset-2">Terms of Service</a>
          <a href="https://github.com/Michi4/BeBetter" target="_blank" rel="noopener" class="hover:text-gray-300 underline underline-offset-2">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import Logo from '../components/Logo.vue'
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>