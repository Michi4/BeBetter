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
let orbs = []
let running = false
let prefersReduced = false
let sprite = null

function buildSprite() {
  const size = 256
  sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size
  const ctx = sprite.getContext('2d')
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(52, 211, 153, 0.9)')
  grad.addColorStop(0.25, 'rgba(52, 211, 153, 0.4)')
  grad.addColorStop(0.6, 'rgba(16, 185, 129, 0.12)')
  grad.addColorStop(1, 'rgba(16, 185, 129, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
}

function buildOrbs() {
  const canvas = canvasRef.value
  const w = canvas.width
  const h = canvas.height
  const count = 5
  orbs = []
  for (let i = 0; i < count; i++) {
    orbs.push({
      x: (0.12 + 0.76 * Math.random()) * w,
      y: (0.1 + 0.8 * Math.random()) * h,
      // big, bloomy: radius is a large fraction of viewport
      r: (0.18 + 0.22 * Math.random()) * Math.max(w, h),
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      drift: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.004,
      a: 0.5 + Math.random() * 0.5,
    })
  }
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'lighter'
  for (const o of orbs) {
    o.drift += o.speed
    o.x += o.vx + Math.sin(o.drift) * 0.15
    o.y += o.vy + Math.cos(o.drift) * 0.12
    const m = 60
    if (o.x < -m) o.x = canvas.width + m
    if (o.x > canvas.width + m) o.x = -m
    if (o.y < -m) o.y = canvas.height + m
    if (o.y > canvas.height + m) o.y = -m
    const pulse = 0.85 + Math.sin(o.drift * 2) * 0.15
    ctx.globalAlpha = o.a * pulse
    const d = o.r * 2
    ctx.drawImage(sprite, o.x - o.r, o.y - o.r, d, d)
  }
  ctx.globalAlpha = 1
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
  buildOrbs()
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

onMounted(() => {
  prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  buildSprite()
  setup()
  if (prefersReduced) {
    draw()
  } else {
    start()
  }
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize)
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
}
.ambient-frost {
  position: absolute;
  inset: 0;
  background: rgba(11, 12, 15, 0.28);
}
html.light .ambient-frost {
  background: rgba(250, 249, 246, 0.35);
}
@media (prefers-reduced-motion: reduce) {
  .ambient-canvas { opacity: 0.8; }
}
</style>