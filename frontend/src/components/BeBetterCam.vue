<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 bg-black flex flex-col">
      <div class="flex items-center justify-between p-4">
        <h3 class="text-white font-medium">BeBetter Cam</h3>
        <button @click="$emit('close')" class="text-white/70 hover:text-white"><X :size="24" /></button>
      </div>
      <div class="flex-1 flex items-center justify-center relative">
        <video v-show="!photoUrl" ref="videoEl" autoplay playsinline class="absolute inset-0 w-full h-full object-cover"></video>
        <img v-if="photoUrl" :src="photoUrl" class="absolute inset-0 w-full h-full object-cover" />
        <canvas ref="canvasEl" class="hidden"></canvas>
      </div>
      <div class="p-6 flex items-center justify-center gap-4">
        <template v-if="!photoUrl">
          <div v-if="countdown > 0" class="text-6xl font-bold text-white">{{ countdown }}</div>
          <button v-else @click="capture" class="w-16 h-16 rounded-full bg-white/20 border-4 border-white flex items-center justify-center transition-colors duration-150 hover:bg-white/30">
            <div class="w-12 h-12 rounded-full bg-white"></div>
          </button>
        </template>
        <template v-else>
          <button @click="retake" class="btn-secondary text-white border-white/20">Retake</button>
          <button @click="confirm" class="btn">Confirm</button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'capture'])

const videoEl = ref(null)
const canvasEl = ref(null)
const photoUrl = ref(null)
const countdown = ref(0)
let stream = null
let countdownTimer = null

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (videoEl.value) videoEl.value.srcObject = stream
  } catch {
    // Camera not available
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}

function capture() {
  countdown.value = 3
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      if (canvasEl.value && videoEl.value) {
        const canvas = canvasEl.value
        const video = videoEl.value
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        photoUrl.value = canvas.toDataURL('image/jpeg', 0.8)
      }
    }
  }, 1000)
}

function retake() { photoUrl.value = null }

function confirm() {
  emit('capture', photoUrl.value)
  photoUrl.value = null
}

onMounted(() => { if (props.show) startCamera() })
onUnmounted(() => { stopCamera(); if (countdownTimer) clearInterval(countdownTimer) })
</script>
