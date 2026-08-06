<template>
  <div class="ambient" aria-hidden="true">
    <canvas ref="canvasRef" class="ambient-canvas"></canvas>
    <div class="ambient-frost"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref(null)
let raf = null
let particles = []
let auras = []
let running = false
let reduced = false
let w = 0
let h = 0
let dpr = 1
let scrollY = 0
let mouse = { x: -9999, y: -9999, vx: 0, vy: 0 }
let lastMouse = { x: -9999, y: -9999 }
let bloom = { x: -9999, y: -9999, s: 0 }

const isLight = () => document.documentElement.classList.contains('light')
const TAU = Math.PI * 2

function rand(a, b) { return a + Math.random() * (b - a) }

function build() {
  const count = Math.min(160, Math.max(80, Math.round(w * h / 14000)))
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: rand(0.8, 2.2) * dpr,
      vx: rand(-0.12, 0.12) * dpr,
      vy: rand(-0.10, 0.10) * dpr,
      ph: Math.random() * TAU,
      sp: rand(0.004, 0.012),
      warm: Math.random() > 0.6,
    })
  }
  const spots = [
    [0.12, 0.66, 0.34],
    [0.88, 0.72, 0.38],
    [0.62, 0.10, 0.26],
    [0.30, 0.24, 0.22],
  ]
  auras = spots.map(([px, py, pr], i) => ({
    x: px * w,
    y: py * h,
    r: pr * Math.max(w, h),
    ph: i * 1.7,
    sp: rand(0.004, 0.008),
    warm: i % 2 === 0,
  }))
  Object.assign(bloom, { x: w * 0.5, y: h * 0.5, s: 0 })
  lastMouse.x = -9999
  lastMouse.y = -9999
}

function draw() {
  const ctx = canvasRef.value.getContext('2d')
  const light = isLight()
  ctx.clearRect(0, 0, w, h)

  // Auras — large ultra-soft color washes, near-imperceptible on purpose.
  for (const a of auras) {
    a.ph += a.sp
    a.x += Math.sin(a.ph * 0.8) * 0.08 * dpr
    a.y += Math.cos(a.ph * 0.6) * 0.06 * dpr
    const alpha = light ? 0.05 : 0.085
    const pulse = 0.85 + Math.sin(a.ph) * 0.15
    const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r)
    if (a.warm) {
      g.addColorStop(0, `rgba(52, 211, 153, ${alpha * pulse})`)
      g.addColorStop(0.5, `rgba(16, 185, 129, ${alpha * pulse * 0.4})`)
    } else {
      g.addColorStop(0, `rgba(94, 234, 212, ${alpha * pulse})`)
      g.addColorStop(0.5, `rgba(45, 212, 191, ${alpha * pulse * 0.35})`)
    }
    g.addColorStop(1, 'rgba(16, 185, 129, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(a.x, a.y, a.r, 0, TAU)
    ctx.fill()
  }

  // Particles — tiny floating motes with faint constellation lines nearby.
  const parallax = scrollY * 0.04 * dpr
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy + (p.y < h * 0.5 ? -0.004 * dpr : 0)
    p.ph += p.sp
    // Soft cursor repulsion so the field feels alive, not gimmicky.
    const dx = p.x - mouse.x * dpr
    const dy = p.y - (mouse.y + parallax) * dpr
    const distSq = dx * dx + dy * dy
    if (distSq < 110 * 110 * dpr * dpr) {
      const d = Math.sqrt(distSq) || 1
      const f = 14 * dpr / (d + 2)
      p.x += (dx / d) * f
      p.y += (dy / d) * f
    }
    if (p.x < -10) p.x = w + 10
    if (p.x > w + 10) p.x = -10
    if (p.y < -10) p.y = h + 10
    if (p.y > h + 10) p.y = -10

    const tw = 0.6 + 0.4 * Math.sin(p.ph * 2)
    const alpha = light ? 0.16 * tw : 0.30 * tw
    ctx.fillStyle = p.warm ? `rgba(52, 211, 153, ${alpha})` : `rgba(148, 163, 188, ${alpha})`
    ctx.beginPath()
    ctx.arc(p.x, p.y - parallax, p.r, 0, TAU)
    ctx.fill()
  }

  // Cursor bloom — gentle light that chases the pointer.
  bloom.x += (mouse.x * dpr - bloom.x) * 0.06
  bloom.y += (mouse.y * dpr - bloom.y) * 0.06
  bloom.s += ((Math.min(1, Math.hypot(mouse.vx, mouse.vy) / 14)) - bloom.s) * 0.06
  if (bloom.x >= 0) {
    const alpha = (light ? 0.05 : 0.09) * (0.35 + bloom.s * 0.65)
    const r = 190 * dpr
    const g = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, r)
    g.addColorStop(0, `rgba(110, 231, 183, ${alpha})`)
    g.addColorStop(0.6, `rgba(16, 185, 129, ${alpha * 0.4})`)
    g.addColorStop(1, 'rgba(16, 185, 129, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(bloom.x, bloom.y, r, 0, TAU)
    ctx.fill()
  }

  if (running) raf = requestAnimationFrame(draw)
}

function start() {
  if (running) return
  running = true
  draw()
}
function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
}

function setup() {
  const canvas = canvasRef.value
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = Math.round(window.innerWidth * dpr)
  h = Math.round(window.innerHeight * dpr)
  canvas.width = w
  canvas.height = h
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
  build()
  if (reduced) draw()
}

function onResize() { setup() }
function onScroll() { scrollY = window.scrollY }

function onMouse(e) {
  mouse.vx = e.clientX - lastMouse.x
  mouse.vy = e.clientY - lastMouse.y
  lastMouse.x = e.clientX
  lastMouse.y = e.clientY
  mouse.x = e.clientX
  mouse.y = e.clientY
}

function onVisibility() {
  if (document.hidden) stop()
  else if (!reduced) start()
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setup()
  if (!reduced) start()
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('mousemove', onMouse, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('mousemove', onMouse)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.ambient-canvas {
  position: absolute;
  inset: 0;
  opacity: 0.9;
}
.ambient-frost {
  position: absolute;
  inset: 0;
  background: rgba(11, 12, 15, 0.08);
}
html.light .ambient-frost {
  background: rgba(250, 249, 246, 0.45);
}
@media (prefers-reduced-motion: reduce) {
  .ambient-canvas {
    opacity: 0.5;
  }
}
</style>
