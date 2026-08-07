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
let smallScreen = false
let prevSmall = false
let w = 0
let h = 0
let dpr = 1
let oldW = 0
let oldH = 0
let scrollY = 0
let mouse = { x: -9999, y: -9999, vx: 0, vy: 0 }
let lastMouse = { x: -9999, y: -9999 }
let bloom = { x: -9999, y: -9999, s: 0 }

const isLight = () => document.documentElement.classList.contains('light')
const TAU = Math.PI * 2

function rand(a, b) { return a + Math.random() * (b - a) }

function build() {
  const count = Math.min(smallScreen ? 80 : 150, Math.max(smallScreen ? 40 : 70, Math.round(w * h / (smallScreen ? 26000 : 16000))))
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: rand(4.5, 9.5) * dpr,
      vx: rand(-0.14, 0.14) * dpr,
      vy: rand(-0.12, 0.12) * dpr,
      ph: Math.random() * TAU,
      sp: rand(0.004, 0.012),
      warm: Math.random() > 0.55,
    })
  }
  auras = []
  if (!smallScreen) {
    const spots = [
      [0.12, 0.66, 0.36],
      [0.88, 0.72, 0.40],
      [0.62, 0.10, 0.28],
      [0.30, 0.24, 0.24],
      [0.50, 0.45, 0.30],
    ]
    auras = spots.map(([px, py, pr], i) => ({
      x: px * w,
      y: py * h,
      r: pr * Math.max(w, h),
      ph: i * 1.7,
      sp: rand(0.004, 0.008),
      warm: i % 2 === 0,
    }))
  }
  Object.assign(bloom, { x: w * 0.5, y: h * 0.5, s: 0 })
  lastMouse.x = -9999
  lastMouse.y = -9999
}

function draw() {
  const ctx = canvasRef.value.getContext('2d')
  const light = isLight()
  ctx.clearRect(0, 0, w, h)

  // Auras — large ultra-soft color washes.
  for (const a of auras) {
    a.ph += a.sp
    a.x += Math.sin(a.ph * 0.8) * 0.1 * dpr
    a.y += Math.cos(a.ph * 0.6) * 0.08 * dpr
    const alpha = light ? 0.11 : 0.12
    const pulse = 0.8 + Math.sin(a.ph) * 0.2
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

  const parallax = scrollY * 0.04 * dpr
  const linkDist = (smallScreen ? 0 : 92) * dpr
  const linkAlpha = light ? 0.07 : 0.05

  // Constellation lines — connect particles that drift close together.
  if (linkDist > 0) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j]
      const dx = p.x - q.x
      const dy = p.y - q.y
      const distSq = dx * dx + dy * dy
      if (distSq < linkDist * linkDist) {
        ctx.strokeStyle = `rgba(110, 231, 183, ${linkAlpha * (1 - distSq / (linkDist * linkDist))})`
        ctx.lineWidth = dpr * 0.6
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - parallax)
        ctx.lineTo(q.x, q.y - parallax)
        ctx.stroke()
      }
    }
  }
  }

  // Particles — tiny floating motes.
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
    const alpha = light ? 0.34 * tw : 0.38 * tw
    if (light) {
      ctx.fillStyle = p.warm ? `rgba(4, 120, 87, ${alpha})` : `rgba(71, 85, 105, ${alpha})`
    } else {
      ctx.fillStyle = p.warm ? `rgba(52, 211, 153, ${alpha})` : `rgba(148, 163, 184, ${alpha})`
    }
    // Grid-style dots: small rounded squares, like contribution cells.
    const s = p.r
    const x0 = p.x - s / 2
    const y0 = p.y - parallax - s / 2
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath()
      ctx.roundRect(x0, y0, s, s, s * 0.22)
      ctx.fill()
    } else {
      ctx.fillRect(x0, y0, s, s)
    }
  }

  // Cursor bloom — a bright grid-style dot that chases the pointer.
  bloom.x += (mouse.x * dpr - bloom.x) * 0.09
  bloom.y += (mouse.y * dpr - bloom.y) * 0.09
  bloom.s += ((Math.min(1, Math.hypot(mouse.vx, mouse.vy) / 14)) - bloom.s) * 0.09
  if (bloom.x >= 0) {
    // Soft outer halo.
    const haloAlpha = (light ? 0.2 : 0.22) * (0.4 + bloom.s * 0.6)
    const r = 250 * dpr
    const g = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, r)
    g.addColorStop(0, `rgba(110, 231, 183, ${haloAlpha})`)
    g.addColorStop(0.55, `rgba(16, 185, 129, ${haloAlpha * 0.45})`)
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
  if (!canvas) return
  smallScreen = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
  dpr = Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 2)
  const nw = Math.max(1, Math.round(window.innerWidth * dpr))
  const nh = Math.max(1, Math.round(window.innerHeight * dpr))
  if (smallScreen !== prevSmall) particles = []
  prevSmall = smallScreen
  if (nw === w && nh === h && particles.length) return
  // Scale the existing field proportionally on resize instead of rebuilding,
  // so the dots don't "crash out" / jump around while dragging a window.
  if (particles.length && oldW && oldH) {
    const sx = nw / oldW
    const sy = nh / oldH
    const scaleR = Math.min(sx, sy)
    for (const p of particles) {
      p.x *= sx
      p.y *= sy
      p.r *= scaleR
      p.vx *= scaleR
      p.vy *= scaleR
    }
    const big = Math.max(nw, nh)
    const oldBig = Math.max(oldW, oldH)
    for (const a of auras) {
      a.x *= sx
      a.y *= sy
      a.r *= big / oldBig
    }
    bloom.x *= sx
    bloom.y *= sy
    bloom.s = 0
  }
  oldW = w
  oldH = h
  w = nw
  h = nh
  canvas.width = w
  canvas.height = h
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
  if (!particles.length) build()
  if (reduced) draw()
}

let resizeLocked = false
function onResize() {
  if (resizeLocked) return
  resizeLocked = true
  setup()
  requestAnimationFrame(() => { resizeLocked = false })
}
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
  background: rgba(250, 249, 246, 0.12);
}
@media (prefers-reduced-motion: reduce) {
  .ambient-canvas {
    opacity: 0.5;
  }
}
</style>
