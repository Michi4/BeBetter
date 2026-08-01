<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[70] bg-black flex flex-col" @keydown.escape="close" tabindex="-1" ref="camEl">
      <div class="flex items-center justify-between p-4 safe-top">
        <h3 class="text-white font-medium">BeBetter Cam</h3>
        <button @click="close" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"><X :size="20" /></button>
      </div>

      <div class="flex-1 flex items-center justify-center relative overflow-hidden">
        <div v-if="cameraError" class="text-center p-8">
          <Camera :size="48" class="mx-auto text-white/30 mb-4" />
          <p class="text-white/60 text-sm mb-2">{{ cameraError }}</p>
          <button @click="retryCamera" class="btn text-sm mt-2">
            <RefreshCw :size="14" /> Retry
          </button>
        </div>

        <!-- Live camera view -->
        <div v-show="!photoUrl && !cameraError" class="absolute inset-0">
          <video ref="videoEl" autoplay playsinline muted class="w-full h-full object-cover"></video>
        </div>

        <!-- Captured photo preview -->
        <div v-if="photoUrl && showSwapPreview" class="absolute inset-0" @click="swapPreview">
          <img :src="photoUrl" class="w-full h-full object-cover" />
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs flex items-center gap-1.5">
            <ArrowLeftRight :size="12" /> Tap to switch
          </div>
        </div>

        <!-- Small thumbnail for swapping -->
        <div v-if="photoUrl && showSwapPreview" class="absolute top-4 right-4 z-10" @click.stop="swapPreview">
          <div class="w-16 h-20 rounded-lg overflow-hidden border-2 border-emerald-400 shadow-lg cursor-pointer">
            <video v-show="videoActive" ref="thumbVideoEl" autoplay playsinline muted class="w-full h-full object-cover"></video>
            <img v-show="!videoActive" :src="photoUrl" class="w-full h-full object-cover" />
          </div>
        </div>

        <!-- Full screen photo when not in swap mode -->
        <img v-if="photoUrl && !showSwapPreview" :src="photoUrl" class="absolute inset-0 w-full h-full object-cover" />

        <canvas ref="canvasEl" class="hidden"></canvas>
      </div>

      <!-- Controls -->
      <div class="p-6 flex items-center justify-center gap-4 safe-bottom">
        <template v-if="!photoUrl">
          <div v-if="countdown > 0" class="text-6xl font-bold text-white animate-pulse">{{ countdown }}</div>
          <template v-else>
            <!-- Flash toggle -->
            <button v-if="torchSupported" @click="toggleTorch"
              class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center transition-colors"
              :class="torchOn ? 'text-amber-400' : 'text-white/50'">
              <Zap :size="20" :fill="torchOn ? 'currentColor' : 'none'" />
            </button>
            <!-- Shutter -->
            <button @click="capture" :disabled="!!cameraError"
              class="w-16 h-16 rounded-full bg-white/20 border-4 border-white flex items-center justify-center transition-all duration-150 hover:bg-white/30 active:scale-95 disabled:opacity-30">
              <div class="w-12 h-12 rounded-full bg-white"></div>
            </button>
            <!-- Camera switch -->
            <button v-if="hasMultipleCameras" @click="switchCamera"
              class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
              <SwitchCamera :size="20" />
            </button>
            <div v-else class="w-12 h-12"></div>
          </template>
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
import { X, Camera, RefreshCw, Check, SwitchCamera, Zap, ArrowLeftRight } from 'lucide-vue-next'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'capture'])

const camEl = ref(null)
const videoEl = ref(null)
const thumbVideoEl = ref(null)
const canvasEl = ref(null)
const photoUrl = ref(null)
const countdown = ref(0)
const cameraError = ref('')
const facingMode = ref('environment')
const hasMultipleCameras = ref(false)
const torchSupported = ref(false)
const torchOn = ref(false)
const showSwapPreview = ref(false)
const videoActive = ref(true)

let stream = null
let countdownTimer = null

async function enumerateCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    hasMultipleCameras.value = videoDevices.length > 1
  } catch {}
}

async function startCamera() {
  cameraError.value = ''
  photoUrl.value = null
  showSwapPreview.value = false
  videoActive.value = true
  torchOn.value = false
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode.value, width: { ideal: 1920 }, height: { ideal: 1080 } }
    })
    if (videoEl.value) {
      videoEl.value.srcObject = stream
      await videoEl.value.play()
    }
    if (thumbVideoEl.value) {
      thumbVideoEl.value.srcObject = stream
      await thumbVideoEl.value.play()
    }
    const track = stream.getVideoTracks()[0]
    const capabilities = track.getCapabilities?.()
    torchSupported.value = !!(capabilities && capabilities.torch)
    await enumerateCameras()
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      cameraError.value = 'Camera permission denied. Please allow camera access in your browser/OS settings and try again.'
    } else if (err.name === 'NotFoundError' || err.name === 'NotReadableError') {
      cameraError.value = 'No camera found on this device.'
    } else if (err.name === 'OverconstrainedError') {
      facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
      return startCamera()
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
  torchOn.value = false
}

async function switchCamera() {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  stopCamera()
  await startCamera()
}

async function toggleTorch() {
  if (!stream) return
  const track = stream.getVideoTracks()[0]
  try {
    await track.applyConstraints({ advanced: [{ torch: !torchOn.value }] })
    torchOn.value = !torchOn.value
  } catch {}
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
        showSwapPreview.value = true
        videoActive.value = true
      }
    }
  }, 1000)
}

function swapPreview() {
  showSwapPreview.value = !showSwapPreview.value
}

function retake() {
  photoUrl.value = null
  showSwapPreview.value = false
  videoActive.value = true
}

function confirm() {
  emit('capture', photoUrl.value)
  photoUrl.value = null
  showSwapPreview.value = false
}

function close() {
  stopCamera()
  photoUrl.value = null
  showSwapPreview.value = false
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
