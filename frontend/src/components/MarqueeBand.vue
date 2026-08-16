<template>
  <div class="marquee-band" role="presentation" aria-hidden="true">
    <div class="marquee-track">
      <template v-for="group in groupCount" :key="group">
        <div class="marquee-group" aria-hidden="true">
          <template v-for="(item, i) in items" :key="i">
            <span class="item">{{ item }}</span>
            <span class="sep">✦</span>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
})

// Four identical groups + translateX(-50%) = seamless loop that stays wide
// enough on large screens even with a short item list.
const groupCount = 4
</script>

<style scoped>
.marquee-band {
  overflow: hidden;
  white-space: nowrap;
  border-block: 1px solid var(--bb-line);
  background: var(--bb-bg-soft);
  padding-block: 0.75rem;
}
.marquee-track {
  display: inline-flex;
  width: max-content;
  animation: marquee 36s linear infinite;
}
.marquee-group {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}
.item {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--bb-muted);
  margin-inline: 1.75rem;
}
.sep {
  color: var(--bb-accent);
  font-size: 0.65rem;
}
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
}
@media (min-width: 1024px) {
  .item { margin-inline: 2.25rem; }
}
</style>
