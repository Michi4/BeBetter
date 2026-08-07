<template>
  <div class="min-h-screen bg-[var(--bb-bg)] text-[var(--bb-ink)] flex flex-col">
    <header class="border-b border-[var(--app-nav-border)] bg-[var(--app-nav-bg)] backdrop-blur-xl sticky top-0 z-50 safe-top">
      <div class="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2 font-bold text-lg">
          <Logo :size="28" />
          <span class="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">BeBetter</span>
        </a>
        <div class="flex items-center gap-1 shrink-0">
          <button @click="toggleTheme" class="p-2.5 rounded-lg text-[var(--bb-muted)] hover:text-[var(--bb-ink)] hover:bg-[var(--bb-line)] transition-colors touch-target inline-flex items-center justify-center" aria-label="Toggle theme">
            <Sun v-if="isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
          <router-link to="/login" class="text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-[var(--bb-line)] transition-colors underline underline-offset-2">Sign In</router-link>
          <router-link to="/register" class="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition-colors">Sign Up</router-link>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <section class="max-w-3xl mx-auto px-4 py-16 space-y-10">
        <header class="text-center space-y-3">
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Imprint</h1>
          <p class="text-[var(--bb-muted)] text-sm">Legal disclosure per &sect;5 ECG (E-Commerce-Gesetz), &sect;14 UGB, &sect;25 MedienG</p>
        </header>

        <div class="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed" :style="{ color: 'var(--bb-muted)' }">
          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Service Provider</h2>
            <address class="not-italic space-y-1">
              <p><strong>Websters</strong></p>
              <p>Michael Ruep</p>
              <p>Engerwitzdorf, Austria</p>
              <p>Email: <a href="mailto:office@websters.at" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">office@websters.at</a></p>
              <p>Web: <a href="https://websters.at" target="_blank" rel="noopener" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">websters.at</a></p>
            </address>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Project Information</h2>
            <p><strong>BeBetter</strong> is a habit tracking, task management, and social competition application developed and operated by Websters.</p>
            <p>Source code: <a href="https://github.com/Michi4/BeBetter" target="_blank" rel="noopener" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">github.com/Michi4/BeBetter</a></p>
            <p>License: MIT License &mdash; free to use, modify, and distribute subject to the license terms.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Hosting &amp; Infrastructure</h2>
            <p>This instance (bebetter.websters.at) is hosted on infrastructure managed by Websters. Server locations are within Austria / the European Economic Area.</p>
            <p>For self-hosted deployments, the operator of that instance is the service provider and bears full responsibility for its operation and compliance.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Data Protection Officer</h2>
            <p>For data protection matters, contact: <a href="mailto:office@websters.at" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">office@websters.at</a></p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Disclaimer &ndash; Liability for Content</h2>
            <p>The content of this service has been prepared with due care. However, we assume no liability for the accuracy, completeness, or timeliness of the content. As a service provider, we are responsible for our own content on these pages under general law. We are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Disclaimer &ndash; Liability for Links</h2>
            <p>This service may contain links to external third-party websites. We have no influence on the content of those websites and therefore assume no liability for them. The respective provider or operator of the linked pages is always responsible for their content. The linked pages were checked for possible legal violations at the time of linking; no unlawful content was identifiable at that time.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Disclaimer &ndash; User-Generated Content</h2>
            <p>Users may create and share content (habits, tasks, messages, etc.) through the Service. We do not endorse, guarantee, or assume responsibility for any user-generated content. Users are solely responsible for their own content and the consequences of sharing it.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Disclaimer &ndash; No Gambling / No Financial Advice</h2>
            <p>BeBetter offers informal challenge mechanisms for motivational purposes only. It does not facilitate real-money gambling, betting, or wagering. Any informal stakes agreed between users are private arrangements with no involvement from the Service. BeBetter is not a financial advisory tool.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Dispute Resolution</h2>
            <p>We are not obligated to participate in consumer arbitration proceedings. We aim to resolve any disputes directly and amicably. Please contact us at <a href="mailto:office@websters.at" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">office@websters.at</a>.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Copyright</h2>
            <p>The BeBetter name, logo, and brand identity are the property of Websters. The source code is licensed under the MIT License. Third-party libraries and assets retain their respective licenses.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">Contact</h2>
            <address class="not-italic space-y-1">
              <p><strong>Websters</strong></p>
              <p>Engerwitzdorf, Austria</p>
              <p>Email: <a href="mailto:office@websters.at" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">office@websters.at</a></p>
              <p>Web: <a href="https://websters.at" target="_blank" rel="noopener" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">websters.at</a></p>
            </address>
          </section>
        </div>
      </section>
    </main>

    <footer class="border-t border-[var(--bb-line)] py-8">
      <div class="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--bb-faint)]">
        <div>&copy; 2026 Websters. All rights reserved.</div>
        <div class="flex gap-4">
          <router-link to="/terms" class="hover:text-[var(--bb-muted)] underline underline-offset-2">Terms of Service</router-link>
          <router-link to="/privacy" class="hover:text-[var(--bb-muted)] underline underline-offset-2">Privacy Policy</router-link>
          <a href="https://github.com/Michi4/BeBetter" target="_blank" rel="noopener" class="hover:text-[var(--bb-muted)] underline underline-offset-2">GitHub</a>
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
