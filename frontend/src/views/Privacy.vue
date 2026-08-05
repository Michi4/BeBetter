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
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p class="text-gray-500 text-sm">Last updated: August 2025</p>
        </header>

        <div class="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">1. Data We Collect</h2>
            <p>We collect only the data you explicitly provide:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Account credentials: email, username, password (hashed)</li>
              <li>Profile information: bio, avatar (optional)</li>
              <li>Habit and task data: titles, descriptions, schedules, completion logs</li>
              <li>Social connections: friend requests, challenges, accountability buddy relationships</li>
              <li>Push notification subscriptions (optional, encrypted)</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">2. How We Use Your Data</h2>
            <p>Your data is used exclusively to provide the BeBetter service:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Authenticate and identify your account</li>
              <li>Store and sync your habits, tasks, and progress across devices</li>
              <li>Enable social features (friend challenges, accountability buddies)</li>
              <li>Send push notifications for reminders (only with explicit permission)</li>
              <li>Calculate streaks, statistics, and contribution grids</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">3. Data Storage & Security</h2>
            <p class="mb-2">All data is stored on the server you host (or the instance you sign up to). We do not share data with third parties.</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Passwords are hashed with bcrypt (cost factor 10)</li>
              <li>JWT tokens for authentication, stored in HttpOnly cookies</li>
              <li>Push subscription keys stored encrypted</li>
              <li>No analytics, tracking pixels, or third-party scripts</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">4. Demo Account</h2>
            <p>BeBetter provides a shared public demo account so you can explore the app before signing up. The demo account contains sample data that is reset automatically, and account actions (uploading photos, creating challenges, changing settings, etc.) are disabled. Anything you do in the demo account is visible to other visitors and is deleted on reset — do not enter personal information while using it.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">5. Self-Hosted Option</h2>
            <p>BeBetter can be self-hosted. When you run your own instance, you have complete control over your data. No data ever leaves your infrastructure unless you configure it to.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">6. Data Deletion</h2>
            <p>You can delete your account at any time from the Profile page. This permanently removes all your personal data, habits, tasks, logs, and social connections. This action is irreversible.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">7. Your Rights</h2>
            <p>Under GDPR and similar regulations, you have the right to:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Erase your data (via account deletion)</li>
              <li>Restrict processing</li>
              <li>Data portability (export your data)</li>
              <li>Object to processing</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2">8. Contact</h2>
            <p>For privacy questions or data requests, contact the instance administrator or visit <a href="https://websters.at" target="_blank" rel="noopener" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">websters.at</a>.</p>
          </section>
        </div>
      </section>
    </main>

    <footer class="border-t border-gray-900 bg-gray-950 py-8">
      <div class="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div>&copy; 2026 Websters. All rights reserved.</div>
        <div class="flex gap-4">
          <a href="/terms" class="hover:text-gray-300 underline underline-offset-2">Terms of Service</a>
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