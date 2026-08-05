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
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p class="text-gray-500 text-sm">Last updated: August 2025</p>
        </header>

        <div class="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or using BeBetter, you agree to these terms. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">2. The Service</h2>
            <p>BeBetter is a habit tracking, task management, and social accountability application. It is provided "as is" without warranties of any kind. The service may be modified, suspended, or discontinued at any time.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">3. Your Account</h2>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>You are responsible for maintaining the confidentiality of your credentials</li>
              <li>You must provide accurate information and keep it updated</li>
              <li>You are responsible for all activity under your account</li>
              <li>One account per person; no automated registration</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Use the service for illegal activities</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Automate access or scrape data</li>
              <li>Distribute malware, spam, or harmful content</li>
              <li>Reverse engineer or attempt to derive source code</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">5. User Content</h2>
            <p>You retain ownership of content you create (habits, tasks, notes, challenges). By using the service, you grant us a license to store, process, and display your content solely to provide the service. You are solely responsible for your content.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">6. Social Features</h2>
            <p>Friend challenges, accountability buddies, and friend requests are opt-in. You control who you connect with. You may remove connections at any time. We are not responsible for interactions between users.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">7. Self-Hosted Instances</h2>
            <p>If you self-host BeBetter, you are the data controller. These terms apply to your use of the software. You are responsible for compliance with applicable laws in your jurisdiction.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">8. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">9. Limitation of Liability</h2>
            <p>IN NO EVENT SHALL THE CREATORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, PROFITS, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">10. Termination</h2>
            <p>We may suspend or terminate your access for violations of these terms. You may delete your account at any time. Upon termination, your right to use the service ceases immediately.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">11. Governing Law</h2>
            <p>These terms are governed by the laws of Austria. Disputes shall be resolved in the courts of Linz, Austria.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">12. Changes to Terms</h2>
            <p>We may update these terms. Material changes will be communicated via the app or email. Continued use constitutes acceptance.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">12. Contact</h2>
            <p>Questions about these terms? Contact the instance administrator or visit <a href="https://websters.at" target="_blank" rel="noopener" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">websters.at</a>.</p>
          </section>
        </div>
      </section>
    </main>

    <footer class="border-t border-gray-900 bg-gray-950 py-8">
      <div class="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div>&copy; 2026 Websters. All rights reserved.</div>
        <div class="flex gap-4">
          <a href="/privacy" class="hover:text-gray-300 underline underline-offset-2">Privacy Policy</a>
          <a href="/imprint" class="hover:text-gray-300 underline underline-offset-2">Imprint</a>
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