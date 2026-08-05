import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'

const dist = process.argv[2] ?? 'dist'
const index = join(dist, 'index.html')
let html = readFileSync(index, 'utf8')

const cssDir = join(dist, 'assets', 'css')
let files = []
try {
  files = readdirSync(cssDir).filter((f) => f.endsWith('.css'))
} catch {
  files = []
}

for (const f of files) {
  const path = join(cssDir, f)
  const href = `/assets/css/${f}`
  if (html.includes(`href="${href}"`)) {
    const css = readFileSync(path, 'utf8')
    html = html.replace(`<link rel="stylesheet" crossorigin href="${href}">`, `<style>${css}</style>`)
    unlinkSync(path)
    console.log(`Inlined ${href} (${(css.length / 1024).toFixed(1)} kB) into index.html`)
  }
}

writeFileSync(index, html)
console.log('index.html updated')