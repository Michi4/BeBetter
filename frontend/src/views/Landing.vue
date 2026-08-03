<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
    <!-- Navigation -->
    <header class="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2.5 group">
          <Logo :size="32" class="transform group-hover:scale-105 transition-transform" />
          <span class="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            BeBetter
          </span>
        </router-link>

        <div class="flex items-center gap-3">
          <router-link to="/login" class="text-sm font-medium text-gray-400 hover:text-white px-3 py-2 transition-colors">
            Sign In
          </router-link>
          <router-link to="/register" class="btn text-xs px-4 py-2 min-h-0 bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            Join Now
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Section -->
    <main class="flex-1">
      <!-- Hero -->
      <section class="max-w-5xl mx-auto px-4 pt-16 pb-20 text-center space-y-6 relative overflow-hidden">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase mx-auto animate-pulse">
          🚀 Next-Gen Habit & Task Companion
        </div>

        <h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] max-w-3xl mx-auto bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          Build habits that last. <br class="hidden sm:inline" />
          <span class="text-emerald-400">Crush your goals</span> together.
        </h1>

        <p class="text-base sm:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
          BeBetter combines robust habit building, flexible task management, and powerful social accountability to help you stay on track.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <router-link to="/register" class="btn px-8 py-3.5 text-sm bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
            Get Started Free
          </router-link>
          <router-link to="/login" class="btn-secondary px-8 py-3.5 text-sm border-gray-800 hover:bg-gray-900">
            Log In to Account
          </router-link>
        </div>

        <!-- App mockup placeholder/grid preview -->
        <div class="pt-12 max-w-3xl mx-auto">
          <div class="relative rounded-2xl border border-gray-800 bg-gray-900/40 p-4 sm:p-6 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div class="flex items-center gap-1.5 pb-4 border-b border-gray-800/80 mb-4 text-gray-500">
              <span class="w-3 h-3 rounded-full bg-red-500/40"></span>
              <span class="w-3 h-3 rounded-full bg-yellow-500/40"></span>
              <span class="w-3 h-3 rounded-full bg-green-500/40"></span>
              <span class="text-xs font-medium ml-2 select-none tracking-wider uppercase text-gray-600">bebetter.home.websters.at</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                <div class="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                  <span>🎯</span> Morning Run
                </div>
                <p class="text-xs text-gray-400">Daily at 07:00 • 5 days streak 🔥</p>
                <div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-emerald-500 h-full w-[100%]"></div>
                </div>
              </div>

              <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                <div class="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                  <span>📚</span> Read 20 Pages
                </div>
                <p class="text-xs text-gray-400">Anytime scheduled • Up next ⏳</p>
                <div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-gray-700 h-full w-[20%]"></div>
                </div>
              </div>

              <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                <div class="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                  <span>📸</span> Water Intake
                </div>
                <p class="text-xs text-gray-400">Photo Proof Required 📷</p>
                <span class="inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="border-t border-gray-900 bg-gray-900/20 py-20 relative">
        <div class="max-w-5xl mx-auto px-4">
          <div class="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything you need to grow.</h2>
            <p class="text-gray-400 text-sm sm:text-base leading-relaxed">
              Designed with a mobile-first philosophy, BeBetter gives you an ultra-fast habit-building experience wherever you are.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Feature 1 -->
            <div class="card p-6 space-y-4 hover:border-emerald-500/30 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl text-emerald-400 group-hover:scale-105 transition-transform">
                ⚡
              </div>
              <h3 class="text-lg font-bold group-hover:text-emerald-400 transition-colors">Habit Building</h3>
              <p class="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Add highly customized routines. Define multiple exact schedules, offsets, and multi-reminder configurations per habit. 
              </p>
            </div>

            <!-- Feature 2 -->
            <div class="card p-6 space-y-4 hover:border-emerald-500/30 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl text-emerald-400 group-hover:scale-105 transition-transform">
                👥
              </div>
              <h3 class="text-lg font-bold group-hover:text-emerald-400 transition-colors">Social Accountability</h3>
              <p class="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Share invite links to automatically friend. Link accountability buddies to co-sign completions or challenge friends in dual matches.
              </p>
            </div>

            <!-- Feature 3 -->
            <div class="card p-6 space-y-4 hover:border-emerald-500/30 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl text-emerald-400 group-hover:scale-105 transition-transform">
                📅
              </div>
              <h3 class="text-lg font-bold group-hover:text-emerald-400 transition-colors">Tasks & Grid</h3>
              <p class="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Log one-time scheduled tasks and analyze your overall progress with a gorgeous, high-performance calendar contribution grid.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="border-t border-gray-900 py-20 relative overflow-hidden">
        <div class="absolute bottom-0 right-1/2 translate-x-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="max-w-3xl mx-auto px-4 text-center space-y-6">
          <h2 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to become your better self?</h2>
          <p class="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed">
            Create your account today, invite your friends, and start tracking immediately. No subscriptions, no ads, completely self-hosted.
          </p>
          <div class="pt-2">
            <router-link to="/register" class="btn px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              Sign Up Now
            </router-link>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-900 bg-gray-950 py-8">
      <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div>
          &copy; {{ new Date().getFullYear() }} BeBetter. Self-hosted & Proud.
        </div>
        <div class="flex gap-4">
          <a href="#" class="hover:text-gray-300">Privacy Policy</a>
          <a href="#" class="hover:text-gray-300">Terms of Service</a>
          <a href="https://github.com/Michi4/BeBetter" target="_blank" rel="noopener noreferrer" class="hover:text-gray-300">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import Logo from '../components/Logo.vue'
</script>
