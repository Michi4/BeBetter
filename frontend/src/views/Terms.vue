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
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p class="text-[var(--bb-muted)] text-sm">Last updated: August 2026</p>
        </header>

        <div class="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed" :style="{ color: 'var(--bb-muted)' }">
          <section>
            <h2 class="text-lg font-semibold text-emerald-400 mb-2" style="color:var(--bb-accent)">1. Acceptance of Terms</h2>
            <p>By accessing or using BeBetter ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. These Terms apply to all users, including visitors, registered users, and demo users.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">2. Eligibility &amp; Minors</h2>
            <p>You must be at least 16 years of age, or have obtained verifiable permission from your parent or legal guardian, to create an account. By registering, you confirm that (a) you are at least 16 years old, or (b) your parent or guardian has consented to your use of the Service and agrees to these Terms on your behalf. If you are under 16, your parent or guardian must supervise your use of the Service.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">3. The Service</h2>
            <p>BeBetter is a habit tracking, task management, and social competition application. It is provided "as is" and "as available" without warranties of any kind, express or implied. The Service may be modified, suspended, or discontinued at any time without prior notice.</p>
            <p class="mt-2"><strong>No substitute for professional advice.</strong> BeBetter is not a medical, psychological, fitness, or financial advisory tool. You should consult qualified professionals before making decisions based on your tracked data.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">4. User Accounts &amp; Consent</h2>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>You are responsible for maintaining the confidentiality of your login credentials</li>
              <li>You must provide accurate, current information and keep it updated</li>
              <li>You are responsible for all activity occurring under your account</li>
              <li>One account per person. Bulk or automated account creation is prohibited</li>
              <li>Your acceptance of these Terms and our Privacy Policy is recorded at the time of registration</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to any system, account, or data</li>
              <li>Harass, abuse, defame, threaten, or harm other users</li>
              <li>Impersonate any person or entity</li>
              <li>Automate access, scrape data, or use bots</li>
              <li>Distribute malware, spam, phishing links, or harmful content</li>
              <li>Reverse engineer, decompile, or attempt to derive the source code (except as permitted by applicable open-source license)</li>
              <li>Use the Service in any manner that could damage, disable, or impair the infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">6. User-Generated Content</h2>
            <p>You retain ownership of content you create — including habits, tasks, notes, challenges, and profile information. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to store, process, display, and transmit your content solely for the purpose of providing the Service. You represent and warrant that your content does not violate any law or third-party right. You are solely responsible for your content.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">7. Social Features</h2>
            <p>Friend connections, challenges, accountability buddies, and all social interactions are opt-in. You control your connections and may remove them at any time. We are not responsible for interactions between users. Inappropriate behavior should be reported using in-app tools or by contacting the administrator.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">8. Challenges, Competitions &amp; Wagering</h2>
            <p>Challenges are informal, optional head-to-head competitions between consenting users. The Service does not handle, facilitate, or enforce real-money wagers, prizes, or bets. Any stakes agreed upon by participants (e.g., "loser buys coffee") are informal social agreements between those users only. The Service assumes no responsibility for such arrangements. You may not use the Service for illegal gambling or any activity prohibited by applicable law.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">9. Not Medical, Financial, or Psychological Advice</h2>
            <p>BeBetter provides tools for self-tracking and motivation. It does not provide medical, therapeutic, psychological, fitness, or financial advice. Habit tracking data, streaks, and insights are informational only. Always consult a qualified professional for health, mental health, or financial decisions. Results are not guaranteed: individual outcomes vary, and we do not warrant that use of the Service will produce any specific result.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">10. Demo Account</h2>
            <p>The Service may offer a shared demo account for evaluation. The demo account has limited functionality (social actions, uploads, and write operations are disabled), is provided "as is," may be unavailable at any time, and is reset periodically. Content created in the demo account is public and non-persistent. You must not enter personal, confidential, or sensitive information while using the demo.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">11. Intellectual Property</h2>
            <p>The BeBetter name, logo, brand, and visual design are the property of Websters. The source code is licensed under the MIT License unless otherwise noted. Third-party libraries and assets retain their respective licenses.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">12. Self-Hosted Instances</h2>
            <p>BeBetter can be self-hosted. If you operate a self-hosted instance, you are the data controller and service provider for your users. These Terms apply to your use of the software. You are responsible for compliance with all applicable laws in your jurisdiction, including data protection and consumer protection laws.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">13. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. NO WARRANTY IS MADE THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE. YOU USE THE SERVICE ENTIRELY AT YOUR OWN RISK.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">14. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WEBSTERS, ITS CONTRIBUTORS, OR THE OPERATORS OF ANY INSTANCE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, PROFITS, OR GOODWILL, SERVICE INTERRUPTION, COMPUTER DAMAGE, OR SYSTEM FAILURE, ARISING FROM OR RELATING TO YOUR USE OF, OR INABILITY TO USE, THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THIS LIMITATION APPLIES TO ALL CLAIMS, WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE. SOME JURISDICTIONS DO NOT ALLOW THE LIMITATION OR EXCLUSION OF CERTAIN LIABILITIES, SO SOME OF THESE LIMITATIONS MAY NOT APPLY TO YOU.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">15. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless Websters, its contributors, and any instance operator from and against any claims, liabilities, damages, losses, or expenses (including reasonable attorneys' fees) arising from or related to (a) your use of the Service, (b) your violation of these Terms, (c) your content, or (d) your violation of any rights of a third party.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">16. Termination</h2>
            <p>We may suspend or terminate your access at any time, without prior notice, for violations of these Terms or for any other reason. You may delete your account at any time from the Profile page. Upon termination, your right to use the Service ceases immediately. Sections 9, 13, 14, 15, 19, and 20 survive termination.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">17. Privacy</h2>
            <p>Your use of the Service is also governed by our <router-link to="/privacy" class="text-emerald-400 hover:underline underline-offset-2">Privacy Policy</router-link>. By using the Service, you consent to the collection and use of your data as described therein.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">18. Third-Party Links</h2>
            <p>The Service may contain links to third-party websites. We have no control over their content and assume no liability for them. The respective providers are responsible for their content.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">19. Changes to Terms</h2>
            <p>We may update these Terms at any time. Material changes will be communicated via the app or to your registered email address. Continued use of the Service after changes take effect constitutes your acceptance of the updated Terms. If you do not agree, you must stop using the Service.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">20. Governing Law &amp; Dispute Resolution</h2>
            <p>These Terms are governed by the laws of Austria. Any disputes arising out of or relating to these Terms or the Service shall be resolved in the competent courts of Linz, Austria. We encourage you to contact us first to resolve any concerns amicably.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">21. Severability</h2>
            <p>If any provision of these Terms is found to be unenforceable or invalid under applicable law, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">22. Entire Agreement</h2>
            <p>These Terms, together with the Privacy Policy, constitute the entire agreement between you and Websters regarding your use of the Service and supersede any prior agreements or understandings.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2" style="color:var(--bb-accent)">23. Contact</h2>
            <p>Questions about these Terms? Contact Websters at <a href="mailto:office@websters.at" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">office@websters.at</a> or visit <a href="https://websters.at" target="_blank" rel="noopener" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">websters.at</a>.</p>
          </section>
        </div>
      </section>
    </main>

    <footer class="border-t border-[var(--bb-line)] py-8">
      <div class="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--bb-faint)]">
        <div>&copy; 2026 Websters. All rights reserved.</div>
        <div class="flex gap-4">
          <router-link to="/privacy" class="hover:text-[var(--bb-muted)] underline underline-offset-2">Privacy Policy</router-link>
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
