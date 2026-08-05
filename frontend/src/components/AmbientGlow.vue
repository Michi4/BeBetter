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
let blobs = []
let running = false
let prefersReduced = false
let mouse = { x: -9999, y: -9999 }
let scrollVel = 0

function buildBlobs() {
  const canvas = canvasRef.value
  const w = canvas.width
  const h = canvas.height
  const count = 5
  blobs = []
  for (let i = 0; i < count; i++) {
    blobs.push({
      x: (0.1 + 0.8 * Math.random()) * w,
      y: (0.1 + 0.8 * Math.random()) * h,
      r: (0.16 + 0.24 * Math.random()) * Math.max(w, h),
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.008,
      a: 0.35 + Math.random() * 0.4,
      hue: Math.random(),
    })
  }
}

function blobPoint(o, theta, t) {
  const wobble =
    1 +
    0.14 * Math.sin(3 * theta + t * o.speed * 1.7 + o.phase1) +
    0.1 * Math.sin(5 * theta - t * o.speed * 1.2 + o.phase2) +
    0.06 * Math.sin(7 * theta + t * o.speed * 0.8 + o.phase3)
  const rad = o.r * wobble
  return { x: o.x + Math.cos(theta) * rad, y: o.y + Math.sin(theta) * rad }
}

function drawBlob(ctx, o, t, bright) {
  const steps = 22
  const points = []
  for (let i = 0; i < steps; i++) {
    points.push(blobPoint(o, (i / steps) * Math.PI * 2, t))
  }

  const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r)
  const alpha = Math.min(o.a * bright, 1)
  if (o.hue < 0.5) {
    grad.addColorStop(0, `rgba(110, 231, 183, ${alpha})`)
    grad.addColorStop(0.35, `rgba(52, 211, 153, ${alpha * 0.55})`)
    grad.addColorStop(1, 'rgba(16, 185, 129, 0)')
  } else {
    grad.addColorStop(0, `rgba(45, 212, 191, ${alpha})`)
    grad.addColorStop(0.35, `rgba(20, 184, 166, ${alpha * 0.5})`)
    grad.addColorStop(1, 'rgba(13, 148, 136, 0)')
  }

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const mx = (prev.x + cur.x) / 2
    const my = (prev.y + cur.y) / 2
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my)
  }
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const t = performance.now() / 1000

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'lighter'

  for (const o of blobs) {
    // mouse interaction: gentle pull toward cursor, brighter when close
    const dx = mouse.x - o.x
    const dy = mouse.y - o.y
    const dist = Math.hypot(dx, dy)
    const pull = dist < o.r * 2.2 ? (1 - dist / (o.r * 2.2)) * 0.02 : 0
    if (pull > 0) {
      o.vx += (dx / dist) * pull * 1.4
      o.vy += (dy / dist) * pull * 1.4
    }
    o.vx *= 0.992
    o.vy *= 0.992

    // scroll interaction: nudge vertical drift
    o.y += scrollVel
    scrollVel *= 0.9

    o.x += o.vx + Math.sin(t * 0.05 + o.phase3) * 0.08
    o.y += o.vy + Math.cos(t * 0.05 + o.phase2) * 0.06

    const m = o.r * 0.6
    if (o.x < -m) o.x = canvas.width + m
    if (o.x > canvas.width + m) o.x = -m
    if (o.y < -m) o.y = canvas.height + m
    if (o.y > canvas.height + m) o.y = -m

    const bright = pull > 0 ? 1.35 : 1
    drawBlob(ctx, o, t, bright)
  }

  ctx.globalCompositeOperation = 'source-over'
  if (running) raf = requestAnimationFrame(draw)
}

function setup() {
  const canvas = canvasRef.value
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(window.innerWidth * dpr)
  canvas.height = Math.round(window.innerHeight * dpr)
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
  buildBlobs()
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

function onResize() {
  setup()
}

function onVisibility() {
  if (document.hidden) stop()
  else if (!prefersReduced) start()
}

function onMouseMove(e) {
  mouse.x = e.clientX
  mouse.y = e.clientY
}

function onScroll() {
  scrollVel = Math.max(Math.min((window.scrollY - (onScroll.last || window.scrollY)) * -0.01, 2), -2)
  onScroll.last = window.scrollY
}

onMounted(() => {
  prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setup()
  if (prefersReduced) {
    draw()
  } else {
    start()
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('scroll', onScroll)
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
  filter: blur(2px) saturate(1.15);
  -webkit-filter: blur(2px) saturate(1.15);
}
.ambient-frost {
  position: absolute;
  inset: 0;
  background: rgba(11, 12, 15, 0.18);
}
html.light .ambient-frost {
  background: rgba(250, 249, 246, 0.25);
}
@media (prefers-reduced-motion: reduce) {
  .ambient-canvas { opacity: 0.6; filter: none; -webkit-filter: none; }
}
</style>