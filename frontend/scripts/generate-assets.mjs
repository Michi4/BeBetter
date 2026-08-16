// Regenerates all brand assets (favicons, PWA icons, OG/share images) from the
// BeBetter logo mark. Usage: node scripts/generate-assets.mjs  (from frontend/)
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, resolve, join } from 'path'

const require = createRequire(import.meta.url)
let sharp = null
for (const p of ['sharp', '/home/home/docker/blog/node_modules/sharp']) {
  try { sharp = require(p); break } catch {}
}
if (!sharp) {
  console.error('sharp not found — install it: npm i -D sharp')
  process.exit(1)
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

// ---------------------------------------------------------------- logo mark --
const CELL = (x, y, fill = '') =>
  `<rect x="${x}" y="${y}" width="80" height="80" rx="22"${fill ? ` fill="${fill}"` : ''}/>`

// The BeBetter grid mark — 5x5 tile grid, rows 4-5 solid (streak base).
function gridMark() {
  return [
    CELL(20, 20), CELL(115, 20), CELL(210, 20, '#21c55daa'), CELL(305, 20), CELL(400, 20, '#21c55d30'),
    CELL(20, 115), CELL(115, 115, '#21c55d30'), CELL(210, 115), CELL(305, 115, '#21c55d30'), CELL(400, 115),
    CELL(20, 210), CELL(115, 210), CELL(210, 210, '#21c55daa'), CELL(305, 210), CELL(400, 210, '#21c55d30'),
    CELL(20, 305), CELL(115, 305), CELL(210, 305), CELL(305, 305), CELL(400, 305),
    CELL(20, 400), CELL(115, 400), CELL(210, 400), CELL(305, 400), CELL(400, 400),
  ].join('')
}

function tileSvg({ tileBg = '#0f1722', tileStroke = '#1e293b', radius = 22, bleed = false } = {}) {
  if (bleed) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="${tileBg}"/>
  <g fill="#21c55d" rx="22" ry="22">${gridMark()}</g>
</svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <rect width="500" height="500" rx="${radius}" fill="${tileBg}"/>
  <rect x="0" y="0" width="500" height="500" rx="${radius}" fill="none" stroke="${tileStroke}" stroke-width="6"/>
  <g fill="#21c55d" rx="22" ry="22">${gridMark()}</g>
</svg>`
}

const FAVICON_SVG = tileSvg()
const fullBleedSvg = (contentScale = 0.82) => {
  const off = (500 * (1 - contentScale)) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/>
      <stop offset="0.55" stop-color="#10b981"/>
      <stop offset="1" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="url(#g)"/>
  <g transform="translate(${off} ${off}) scale(${contentScale})">${logoMark()}</g>
</svg>`
}

// ------------------------------------------------------------------ OG image --
function ogSvg() {
  const cells = []
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 24; c++) {
      cells.push(`<rect x="${40 + c * 48}" y="${40 + r * 48}" width="24" height="24" rx="5" fill="#21c55d" fill-opacity="${r % 2 === 0 ? 0.06 : 0.1}"/>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0f1722"/>
      <stop offset="1" stop-color="#0b0c0f"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#21c55d"/>
      <stop offset="1" stop-color="#2dd4bf"/>
    </linearGradient>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="1" stop-color="#5eead4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${cells.join('')}
  <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>
  <g transform="translate(88 225) scale(0.36)"><g fill="#21c55d" rx="22" ry="22">${gridMark()}</g></g>
  <text x="300" y="300" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="800" fill="#f2f4f8" letter-spacing="1">BeBetter</text>
  <text x="304" y="372" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="500" fill="#a3abb8">Build habits that last. Together.</text>
  <rect x="302" y="408" width="220" height="7" rx="3.5" fill="url(#accent)"/>
  <text x="1200" y="592" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="#7c8494">bebetter — by Websters</text>
</svg>`
}

// ------------------------------------------------------------------- render --
const sizes = [
  ['favicon-48.png', 48, tileSvg()],
  ['icon-192.png', 192, tileSvg()],
  ['icon-512.png', 512, tileSvg()],
  ['maskable.png', 512, tileSvg({ bleed: true })],
  ['maskable-512.png', 512, tileSvg({ bleed: true })],
  ['apple-touch-icon.png', 180, tileSvg({ bleed: true })],
]

const fs = require('fs')

;(async () => {
  fs.writeFileSync(join(PUBLIC, 'favicon.svg'), FAVICON_SVG)
  console.log('favicon.svg ok')

  for (const [name, size, svg] of sizes) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(PUBLIC, name))
    console.log(`${name} (${size}) ok`)
  }

  const og = ogSvg()
  for (const name of ['og-image.png', 'share.png']) {
    await sharp(Buffer.from(og)).png().toFile(join(PUBLIC, name))
    console.log(`${name} ok`)
  }

  console.log('All brand assets regenerated.')
})()