<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1" aria-label="Go back"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold">Assistant</h1>
      <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">beta</span>
    </div>

    <div v-if="auth.isDemo" class="card text-center py-8 space-y-3">
      <Sparkles :size="28" class="mx-auto text-emerald-400" />
      <p class="text-sm text-gray-300 font-medium">Meet your BeBetter assistant</p>
      <p class="text-xs text-gray-500 max-w-xs mx-auto">It creates tasks, logs habits and answers from your data — by text or voice. Make a free account to try it.</p>
      <router-link to="/register" class="btn inline-flex">Create free account</router-link>
    </div>

    <div v-else-if="needsEnable" class="card text-center py-8 space-y-3">
      <Sparkles :size="28" class="mx-auto text-emerald-400" />
      <p class="text-sm text-gray-300 font-medium">Let the assistant manage tasks &amp; habits for you</p>
      <p class="text-xs text-gray-500 max-w-xs mx-auto">Turn it on to chat. You control exactly what it may touch in Profile → AI Assistant.</p>
      <button @click="enableAssistant" class="btn" :disabled="enabling">
        <Loader2 v-if="enabling" :size="16" class="animate-spin" />
        <span v-else>Enable assistant</span>
      </button>
    </div>

    <template v-else>
      <div ref="scrollEl" class="space-y-2 min-h-[40vh]">
        <div v-if="!messages.length" class="card text-center py-8">
          <Sparkles :size="24" class="mx-auto text-gray-500 mb-2" />
          <p class="text-sm text-gray-400">Try "remind me to water the plants tomorrow"</p>
          <p class="text-xs text-gray-500 mt-1">or "what's left today?" — type below or tap the mic.</p>
        </div>
        <div v-for="(m, i) in messages" :key="i">
          <div v-if="m.role === 'user'" class="flex justify-end">
            <div class="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-emerald-600 text-white text-sm break-words">{{ m.content }}</div>
          </div>
          <div v-else class="flex justify-start">
            <div class="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-gray-800 text-sm text-gray-100 break-words space-y-2">
              <p class="whitespace-pre-wrap">{{ m.content }}</p>
              <div v-if="m.pending?.length" class="space-y-1.5 pt-1">
                <div v-for="a in m.pending" :key="a.id" class="flex items-center gap-2 p-2 rounded-lg bg-gray-900/60 border border-gray-700">
                  <span class="flex-1 text-xs text-gray-300">{{ a.summary }}</span>
                  <button @click="acceptOne(m, a)" class="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white min-h-[32px]" :disabled="sending">OK</button>
                </div>
                <button v-if="m.pending.length > 1" @click="acceptAll(m)" class="text-[11px] text-emerald-400 hover:text-emerald-300" :disabled="sending">Accept all</button>
              </div>
              <router-link v-if="m.needsAccess" to="/profile" class="block text-[11px] text-emerald-400 hover:text-emerald-300 mt-1">Open Profile → AI Assistant</router-link>
            </div>
          </div>
        </div>
        <div v-if="sending" class="flex justify-start">
          <div class="px-3 py-2 rounded-2xl bg-gray-800 text-gray-400 text-sm flex items-center gap-2">
            <Loader2 :size="14" class="animate-spin" /> Thinking…
          </div>
        </div>
      </div>

      <div class="sticky bottom-20 md:bottom-4 pt-2">
        <div class="flex gap-2">
          <button v-if="micSupported" @click="toggleMic" :aria-label="listening ? 'Stop listening' : 'Voice input'"
            class="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors touch-target"
            :class="listening ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'">
            <Mic :size="18" />
          </button>
          <input v-model="draft" @keydown.enter="send" type="text" placeholder="Ask or tell me what to do…"
            aria-label="Message" class="input flex-1" :disabled="sending" />
          <button @click="send" class="btn px-4 shrink-0" :disabled="sending || !draft.trim()" aria-label="Send">
            <Send :size="16" />
          </button>
        </div>
        <p v-if="listening" class="text-[11px] text-red-400 mt-1 text-center">Listening… tap the mic to stop</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../stores/auth'
import { ArrowLeft, Loader2, Mic, Send, Sparkles } from 'lucide-vue-next'

const auth = useAuthStore()
const toast = useToast()
const messages = ref([])
const history = ref([])
const draft = ref('')
const sending = ref(false)
const needsEnable = ref(false)
const enabling = ref(false)
const scrollEl = ref(null)
const listening = ref(false)
const micSupported = ref(false)
let recog = null

function scrollDown() {
  nextTick(() => {
    const el = scrollEl.value
    if (el) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  })
}

async function enableAssistant() {
  enabling.value = true
  try {
    await api.put('/assistant/settings', { enabled: true })
    needsEnable.value = false
    toast.success('Assistant enabled')
  } catch {
    toast.error('Failed to enable')
  } finally {
    enabling.value = false
  }
}

function pushAssistant(data) {
  const pending = (data.needsConfirmation || []).map(a => ({ ...a }))
  const needsAccess = (data.actions || []).some(a => a.status === 'denied')
  messages.value.push({ role: 'assistant', content: data.reply || 'Done.', pending, needsAccess })
  scrollDown()
}

async function send(confirmed) {
  const text = draft.value.trim()
  if ((!text && !confirmed?.length) || sending.value) return
  sending.value = true
  if (text && !confirmed) {
    messages.value.push({ role: 'user', content: text })
    history.value.push({ role: 'user', content: text })
    draft.value = ''
  }
  scrollDown()
  try {
    // Never POST an empty conversation — the API 400s and the user sees "failed"
    const usable = history.value.filter(m => m.role && String(m.content || '').trim()).slice(-20)
    if (!usable.length && !confirmed?.length) {
      sending.value = false
      return
    }
    const body = { messages: usable.length ? usable : [{ role: 'user', content: text || 'Hello' }] }
    if (confirmed?.length) body.confirmedActions = confirmed
    const res = await api.post('/assistant/chat', body)
    if (res.data.reply) history.value.push({ role: 'assistant', content: res.data.reply })
    pushAssistant(res.data)
  } catch (e) {
    const status = e.response?.status
    if (status === 403) needsEnable.value = true
    else if (status === 429) toast.error('Slow down a little — then try again')
    else toast.error(e.response?.data?.error || 'Assistant failed')
  } finally {
    sending.value = false
    scrollDown()
  }
}

function collectConfirmed(msg, only) {
  const list = only ? [only] : msg.pending
  return list.map(a => ({ tool: a.tool, arguments: a.arguments }))
}

async function acceptOne(msg, action) {
  const keep = msg.pending
  msg.pending = msg.pending.filter(a => a.id !== action.id)
  const before = messages.value.length
  await send(collectConfirmed(msg, action))
  if (messages.value.length === before) msg.pending = keep
}

async function acceptAll(msg) {
  const keep = msg.pending
  const all = collectConfirmed(msg)
  msg.pending = []
  const before = messages.value.length
  await send(all)
  if (messages.value.length === before) msg.pending = keep
}

function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) {
    micSupported.value = false
    toast.error('Voice input is not supported in this browser — try Chrome or Edge')
    return
  }
  if (listening.value) {
    try { recog?.stop() } catch {}
    return
  }
  let r
  try {
    r = new SR()
  } catch {
    micSupported.value = false
    toast.error('Voice input is not available on this device')
    return
  }
  recog = r
  recog.lang = navigator.language || 'en-US'
  recog.interimResults = false
  recog.maxAlternatives = 1
  recog.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript || ''
    if (text) draft.value = (draft.value ? draft.value + ' ' : '') + text
  }
  recog.onerror = (e) => {
    listening.value = false
    const err = e?.error || ''
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      // Mic blocked or speech service unreachable — stop offering it this session
      micSupported.value = false
      toast.error('Microphone is blocked — allow access in the browser, or just type instead')
    } else if (err === 'aborted' || err === 'no-speech') {
      toast.error('Did not catch that — try again, a little louder and closer')
    } else {
      toast.error('Voice input hiccup — you can always type instead')
    }
  }
  recog.onend = () => { listening.value = false }
  try {
    recog.start()
    listening.value = true
  } catch {
    listening.value = false
    toast.error('Voice input could not start — just type instead')
  }
}

onMounted(() => {
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { micSupported.value = false; return }
    new SR()
    micSupported.value = true
  } catch {
    micSupported.value = false
  }
})

onBeforeUnmount(() => {
  try { recog?.abort() } catch {}
})
</script>
