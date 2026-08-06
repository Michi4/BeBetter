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
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p class="text-[var(--bb-muted)] text-sm">Last updated: August 2026</p>
        </header>

        <div class="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed" :style="{ color: 'var(--bb-muted)' }">
          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">1. Data Controller</h2>
            <p>The data controller for the BeBetter service (at bebetter.websters.at) is:</p>
            <address class="not-italic space-y-1 mt-2 ml-4">
              <p><strong>Websters</strong></p>
              <p>Michael R., Stevan V., Manuel P.</p>
              <p>Engerwitzdorf, Austria</p>
              <p>Email: <a href="mailto:office@websters.at" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">office@websters.at</a></p>
            </address>
            <p class="mt-2">For self-hosted instances, the instance operator is the data controller. Contact them directly for privacy inquiries.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">2. Data We Collect</h2>
            <p>We collect only the data you explicitly provide to us:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li><strong>Account information:</strong> email address, username, password (hashed with bcrypt)</li>
              <li><strong>Profile information:</strong> bio, avatar image (optional)</li>
              <li><strong>Content data:</strong> habit titles, descriptions, schedules, completion logs, task content</li>
              <li><strong>Social data:</strong> friend connections, challenge participation, accountability buddy relationships</li>
              <li><strong>Notification preferences:</strong> push notification subscriptions (encrypted)</li>
              <li><strong>Agreement record:</strong> timestamp of your acceptance of our Terms and Privacy Policy</li>
            </ul>
            <p class="mt-2">We do <strong>not</strong> collect analytics, browsing behavior, device fingerprints, location data, or any information beyond what you consciously provide.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">3. How We Use Your Data</h2>
            <p>Your personal data is used exclusively to provide and improve the BeBetter service:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>To authenticate you and maintain your account session</li>
              <li>To store, sync, and display your habits, tasks, and progress across devices</li>
              <li>To enable social features such as friend connections, challenges, and accountability buddies</li>
              <li>To send push notifications when you have explicitly opted in</li>
              <li>To calculate streaks, statistics, and contribution grids</li>
              <li>To maintain a record of your consent to these terms</li>
            </ul>
            <p>Your data is never used for advertising, profiling, training AI models, or any purpose other than operating the Service.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">4. Minors &amp; Age of Consent</h2>
            <p>BeBetter is not directed at children under the age of 16. We require all users to be at least 16 years old or to have obtained verifiable permission from a parent or legal guardian. If we become aware that a user under 16 has registered without parental consent, we will delete their account and all associated data promptly.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">5. Data Storage &amp; Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your data:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Passwords are hashed using bcrypt with a cost factor of 10</li>
              <li>Authentication tokens (JWT) are stored in HTTP-only, same-site cookies where supported</li>
              <li>All traffic is encrypted via HTTPS/TLS</li>
              <li>Push subscription keys are stored encrypted</li>
              <li>Server infrastructure is managed with security updates applied regularly</li>
              <li>No analytics scripts, tracking pixels, or third-party monitoring services are used</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">6. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active. If you delete your account, all associated data is permanently removed within a reasonable timeframe. Backups, if any, are purged within 90 days. In the case of self-hosted instances, retention is determined by the instance operator.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">7. Data Sharing &amp; Third Parties</h2>
            <p>We do <strong>not</strong> sell, rent, or share your personal data with third parties. The only exceptions are:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li><strong>Push notifications:</strong> if you opt in, push delivery is handled by the browser vendor (e.g., Google for Chrome) — this is a standard web platform feature</li>
              <li><strong>Email delivery:</strong> password reset emails are sent via an SMTP relay, if configured by the instance operator</li>
              <li><strong>Legal compliance:</strong> if required by applicable law or valid legal process</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">8. Cookies &amp; Local Storage</h2>
            <p>BeBetter uses only essential local storage mechanisms:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li><strong>localStorage / sessionStorage:</strong> stores your authentication token and theme preference. No cookies are used for tracking or advertising</li>
              <li><strong>JWT cookie:</strong> an HTTP-only cookie may be set for authentication. This cookie is essential for the functioning of the service</li>
            </ul>
            <p>No third-party cookies, tracking pixels, or analytics services are used. You can clear stored data at any time via your browser settings without affecting the core functionality (you will need to log in again).</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">9. Demo Account</h2>
            <p>The Service may provide a shared demo account for evaluation. The demo account contains sample data that is reset periodically, and actions such as uploading photos, creating challenges, and changing account settings are disabled. Any data entered in the demo account is visible to other visitors and is not persistent. <strong>Do not enter personal, confidential, or sensitive information while using the demo account.</strong></p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">10. Your Rights (GDPR &amp; Similar)</h2>
            <p>Under the General Data Protection Regulation (GDPR) and similar privacy laws, you have the following rights:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li><strong>Right of access:</strong> request a copy of the personal data we hold about you</li>
              <li><strong>Right to rectification:</strong> request correction of inaccurate data (you can also update most data yourself via your profile)</li>
              <li><strong>Right to erasure ("right to be forgotten"):</strong> delete your account and all associated data at any time from Profile settings</li>
              <li><strong>Right to restrict processing:</strong> request that we limit how we use your data</li>
              <li><strong>Right to data portability:</strong> request an export of your data in a machine-readable format</li>
              <li><strong>Right to object:</strong> object to processing of your data for certain purposes</li>
              <li><strong>Right to withdraw consent:</strong> withdraw your consent at any time (e.g., by deleting your account)</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:office@websters.at" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">office@websters.at</a>. We will respond within the timeframe required by applicable law.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">11. International Data Transfers</h2>
            <p>For the bebetter.websters.at instance, data is stored on servers located in Austria / the European Economic Area. For self-hosted instances, data location is determined by the instance operator. We do not transfer personal data outside the EEA unless adequate safeguards are in place.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Material changes will be communicated via the app or to your registered email address. Continued use of the Service after changes take effect constitutes your acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">13. Complaints &amp; Supervisory Authority</h2>
            <p>If you believe your data protection rights have been violated, you have the right to lodge a complaint with the Austrian data protection authority (<em>Datenschutzbehörde</em>): <a href="https://www.dsb.gv.at" target="_blank" rel="noopener" style="color:var(--bb-accent)" class="hover:underline underline-offset-2">dsb.gv.at</a>. We encourage you to contact us first so we can resolve your concern directly.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">14. Contact</h2>
            <p>For privacy-related inquiries, data requests, or questions about this policy, contact:</p>
            <address class="not-italic space-y-1 mt-2 ml-4">
              <p><strong>Websters</strong></p>
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
          <router-link to="/imprint" class="hover:text-[var(--bb-muted)] underline underline-offset-2">Imprint</router-link>
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
