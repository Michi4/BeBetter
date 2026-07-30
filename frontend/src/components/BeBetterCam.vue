<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[70] bg-black flex flex-col" @keydown.escape="close" tabindex="-1" ref="camEl">
      <div class="flex items-center justify-between p-4 safe-top">
        <h3 class="text-white font-medium">BeBetter Cam</h3>
        <button @click="close" class="text-white/70 hover:text-white"><X :size="24" /></button>
      </div>
      <div class="flex-1 flex items-center justify-center relative">
        <div v-if="cameraError" class="text-center p-8">
          <Camera :size="48" class="mx-auto text-white/30 mb-4" />
          <p class="text-white/60 text-sm mb-2">{{ cameraError }}</p>
          <button @click="retryCamera" class="btn text-sm mt-2">
            <RefreshCw :size="14" /> Retry
          </button>
        </div>
        <video v-show="!photoUrl && !cameraError" ref="videoEl" autoplay playsinline muted
          class="absolute inset-0 w-full h-full object-cover"></video>
        <img v-if="photoUrl" :src="photoUrl" class="absolute inset-0 w-full h-full object-cover" />
        <canvas ref="canvasEl" class="hidden"></canvas>
      </div>
      <div class="p-6 flex items-center justify-center gap-4 safe-bottom">
        <template v-if="!photoUrl">
          <div v-if="countdown > 0" class="text-6xl font-bold text-white">{{ countdown }}</div>
          <button v-else @click="capture" :disabled="!!cameraError"
            class="w-16 h-16 rounded-full bg-white/20 border-4 border-white flex items-center justify-center transition-colors duration-150 hover:bg-white/30 active:scale-95 disabled:opacity-30">
            <div class="w-12 h-12 rounded-full bg-white"></div>
          </button>
        </template>
        <template v-else>
          <button @click="retake" class="btn-secondary text-white border-white/20">
            <RefreshCw :size="14" /> Retake
          </button>
          <button @click="confirm" class="btn">
            <Check :size="14" /> Confirm
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { X, Camera, RefreshCw, Check } from 'lucide-vue-next'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'capture'])

const camEl = ref(null)

const videoEl = ref(null)
const canvasEl = ref(null)
const photoUrl = ref(null)
const countdown = ref(0)
const cameraError = ref('')
let stream = null
let countdownTimer = null

async function startCamera() {
  cameraError.value = ''
  photoUrl.value = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    })
    if (videoEl.value) {
      videoEl.value.srcObject = stream
      await videoEl.value.play()
    }
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      cameraError.value = 'Camera permission denied. Please allow camera access in your browser/OS settings and try again.'
    } else if (err.name === 'NotFoundError') {
      cameraError.value = 'No camera found on this device.'
    } else {
      cameraError.value = 'Camera unavailable: ' + err.message
    }
  }
}

function retryCamera() {
  stopCamera()
  startCamera()
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdown.value = 0
}

function capture() {
  countdown.value = 3
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
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

function close() {
  stopCamera()
  photoUrl.value = null
  emit('close')
}

watch(() => props.show, (val) => {
  if (val) {
    nextTick(() => camEl.value?.focus())
    startCamera()
  } else {
    stopCamera()
  }
})

onUnmounted(() => { stopCamera() })
</script>
