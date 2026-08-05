<template>
  <div class="ambient" aria-hidden="true">
    <canvas ref="canvasRef" class="ambient-canvas"></canvas>
    <div class="ambient-frost"></div>
    <div class="ambient-orbs"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref(null)
let raf = null
let particles = []
let running = false
let prefersReduced = false
let sprite = null

function buildSprite() {
  const size = 32
  sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size
  const ctx = sprite.getContext('2d')
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(52, 211, 153, 1)')
  grad.addColorStop(0.4, 'rgba(52, 211, 153, 0.45)')
  grad.addColorStop(1, 'rgba(52, 211, 153, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
}

function buildParticles() {
  const canvas = canvasRef.value
  const count = Math.min(Math.floor((canvas.width * canvas.height) / 34000), 60)
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: (Math.random() * 1.6 + 0.6) * 7,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.25,
      drift: Math.random() * Math.PI * 2,
    })
  }
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'lighter'
  for (const p of particles) {
    p.drift += 0.004
    p.x += p.vx + Math.sin(p.drift) * 0.2
    p.y += p.vy + Math.cos(p.drift) * 0.15
    if (p.x < -40) p.x = canvas.width + 40
    if (p.x > canvas.width + 40) p.x = -40
    if (p.y < -40) p.y = canvas.height + 40
    if (p.y > canvas.height + 40) p.y = -40
    const alpha = p.a * (0.7 + Math.sin(p.drift * 2) * 0.3)
    ctx.globalAlpha = alpha
    const s = p.r * 2
    ctx.drawImage(sprite, p.x - p.r, p.y - p.r, s, s)
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
  buildParticles()
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
  background: radial-gradient(ellipse 60% 50% at 15% 0%, rgba(16, 185, 129, 0.08), transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 100%, rgba(52, 211, 153, 0.07), transparent 60%);
}
.ambient-canvas {
  position: absolute;
  inset: 0;
  opacity: 0.7;
}
.ambient-frost {
  position: absolute;
  inset: 0;
  background: rgba(11, 12, 15, 0.35);
}
html.light .ambient-frost {
  background: rgba(250, 249, 246, 0.4);
}
.ambient-orbs {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle 40% 32% at 78% 12%, rgba(16, 185, 129, 0.12), transparent 70%),
    radial-gradient(circle 36% 30% at 10% 82%, rgba(52, 211, 153, 0.1), transparent 70%);
  filter: blur(30px);
}
@media (prefers-reduced-motion: reduce) {
  .ambient-canvas { opacity: 0.35; }
}
</style>