<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1" aria-label="Go back"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold">Assistant</h1>
      <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">beta</span>
      <router-link to="/profile#ai-assistant" class="btn-ghost p-1 ml-auto" aria-label="AI settings" title="AI settings">
        <Settings :size="18" />
      </router-link>
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
      <div ref="scrollEl" class="space-y-2 min-h-[40vh]" aria-live="polite" aria-label="Conversation">
        <div v-if="!messages.length" class="card text-center py-8">
          <Sparkles :size="24" class="mx-auto text-gray-500 mb-2" />
          <p class="text-sm text-gray-400">Try "remind me to water the plants tomorrow"</p>
          <p class="text-xs text-gray-500 mt-1">or "what's left today?" — type below or tap the mic.</p>
        </div>
        <div v-for="(m, i) in messages" :key="i">
          <div v-if="m.role === 'user'" class="flex justify-end">
            <div class="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-emerald-600 text-white text-sm break-words">
              <p class="whitespace-pre-wrap">{{ m.content }}</p>
              <span class="block text-[10px] text-white/60 text-right mt-1">{{ fmtTime(m.ts) }}</span>
            </div>
          </div>
          <div v-else class="flex justify-start">
            <div class="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md text-sm break-words space-y-2"
              :class="m.isError ? 'bg-red-950/60 border border-red-900 text-red-200' : 'bg-gray-800 text-gray-100'">
              <div v-if="m.isError" class="whitespace-pre-wrap">{{ m.content }}</div>
              <div v-else class="md-body" v-html="renderMarkdown(m.content)"></div>
              <button v-if="m.isError && m.canRetry && lastFailed" @click="retry" :disabled="sending"
                class="text-[11px] px-2 py-1 rounded bg-red-900/70 hover:bg-red-800 text-red-100 min-h-[32px] self-start">Retry</button>
              <div v-if="m.pending?.length" class="space-y-1.5 pt-1">
                <div v-for="a in m.pending" :key="a.id" class="flex items-center gap-2 p-2 rounded-lg bg-gray-900/60 border border-gray-700">
                  <span class="flex-1 text-xs text-gray-300">{{ a.summary }}</span>
                  <button @click="acceptOne(m, a)" class="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white min-h-[32px]" :disabled="sending">OK</button>
                </div>
                <button v-if="m.pending.length > 1" @click="acceptAll(m)" class="text-[11px] text-emerald-400 hover:text-emerald-300" :disabled="sending">Accept all</button>
              </div>
              <router-link v-if="m.needsAccess" to="/profile" class="block text-[11px] text-emerald-400 hover:text-emerald-300 mt-1">Open Profile → AI Assistant</router-link>
              <span class="block text-[10px] text-gray-500 mt-0.5">{{ fmtTime(m.ts) }}</span>
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
        <div v-if="!online" class="card !py-2 !px-3 mb-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-900 flex items-center gap-2">
          <WifiOff :size="14" /> You might be offline — messages will still try to send.
        </div>
        <div class="flex gap-2">
          <button @click="toggleMic" :aria-label="listening ? 'Stop listening' : 'Voice input'"
            class="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors touch-target"
            :class="listening ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'"
            :disabled="sending">
            <Mic :size="18" />
          </button>
          <input v-model="draft" @keydown.enter="send()" @keydown.esc="cancelListening" type="text" placeholder="Ask or tell me what to do…"
            aria-label="Message" class="input flex-1" maxlength="2000" />
          <button @click="send()" class="btn px-4 shrink-0" :disabled="sending || !draft.trim()" aria-label="Send">
            <Send :size="16" />
          </button>
        </div>
        <p v-if="listening" class="text-[11px] text-red-400 mt-1 text-center">
          {{ interim ? `“${interim}”…` : 'Listening… tap the mic or press Esc to stop' }}
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../stores/auth'
import { useOnline } from '../composables/useOnline'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ArrowLeft, Loader2, Mic, Send, Settings, Sparkles, WifiOff } from 'lucide-vue-next'

// Assistant replies come back as markdown — render them safely.
marked.setOptions({ gfm: true, breaks: true })
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

function renderMarkdown(text) {
  try {
    return DOMPurify.sanitize(marked.parse(String(text || '')))
  } catch {
    return ''
  }
}

function fmtTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const auth = useAuthStore()
const toast = useToast()
const { online } = useOnline()
const messages = ref([])
const history = ref([])
const draft = ref('')
const sending = ref(false)
const needsEnable = ref(false)
const enabling = ref(false)
const scrollEl = ref(null)
const listening = ref(false)
const interim = ref('')
const lastFailed = ref('')
let recog = null
let chatAbort = null

const CHAT_TIMEOUT_MS = 100000

function scrollDown(force = false) {
  nextTick(() => {
    // Don't yank the view if the user scrolled up to re-read something.
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 200
    if (force || nearBottom) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
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
  messages.value.push({ role: 'assistant', content: data.reply || 'Done.', pending, needsAccess, ts: Date.now() })
  scrollDown()
}

function pushError(text, canRetry) {
  messages.value.push({ role: 'assistant', content: text, isError: true, canRetry, ts: Date.now() })
  scrollDown()
}

function friendlyError(e) {
  const status = e.response?.status
  if (status === 429) return 'Slow down a little — try again in a minute.'
  if (status === 502 || status === 503) return e.response?.data?.error || 'The AI is briefly unavailable — try again in a moment.'
  if (status >= 500) return 'Something went wrong on our side — try again.'
  if (!e.response) return 'Connection problem — check your internet and try again.'
  return e.response?.data?.error || 'That didn\'t work — try again.'
}

async function performRequest({ confirmed = null, failedText = '' }) {
  sending.value = true
  lastFailed.value = ''
  chatAbort = new AbortController()
  const timer = setTimeout(() => chatAbort?.abort(), CHAT_TIMEOUT_MS)
  try {
    // Never POST an empty conversation — the API 400s and the user sees "failed"
    const usable = history.value.filter(m => m.role && String(m.content || '').trim()).slice(-20)
    if (!usable.length && !confirmed) return
    const body = { messages: usable.length ? usable : [{ role: 'user', content: failedText || 'Hello' }] }
    if (confirmed) body.confirmedActions = confirmed
    const res = await api.post('/assistant/chat', body, { signal: chatAbort.signal })
    if (res.data.reply) history.value.push({ role: 'assistant', content: res.data.reply })
    pushAssistant(res.data)
  } catch (e) {
    if (e.code === 'ERR_CANCELED') {
      pushError('That took too long — the request was cancelled. Try a shorter ask or retry.', true)
      lastFailed.value = failedText
    } else {
      const status = e.response?.status
      if (status === 403) {
        needsEnable.value = true
      } else {
        pushError(friendlyError(e), !!failedText)
        lastFailed.value = failedText
      }
    }
  } finally {
    clearTimeout(timer)
    chatAbort = null
    sending.value = false
    scrollDown()
  }
}

async function send(confirmed) {
  // @click="send" would hand the MouseEvent in as `confirmed` — an object —
  // so the user's text never entered history and the empty-guard swallowed
  // every send. UI always calls send(); only acceptOne/acceptAll pass arrays.
  if (sending.value) return
  const hasConfirmed = Array.isArray(confirmed) && confirmed.length > 0
  const text = draft.value.trim()
  if (!text && !hasConfirmed) return
  if (text && !hasConfirmed) {
    messages.value.push({ role: 'user', content: text, ts: Date.now() })
    history.value.push({ role: 'user', content: text })
    draft.value = ''
  }
  scrollDown(true)
  await performRequest({ confirmed: hasConfirmed ? confirmed : null, failedText: text })
}

function retry() {
  if (sending.value || !lastFailed.value) return
  // The failed text is still in history — just re-run the request.
  performRequest({ failedText: lastFailed.value })
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
    toast.error('Voice input is not supported in this browser — Chrome, Edge or Safari work best')
    return
  }
  if (listening.value) {
    try { recog?.stop() } catch {}
    return
  }
  if (sending.value) return
  let r
  try {
    r = new SR()
  } catch {
    toast.error('Voice input is not available on this device')
    return
  }
  recog = r
  recog.lang = navigator.language || 'en-US'
  recog.interimResults = true
  recog.continuous = false
  recog.maxAlternatives = 1
  recog.onresult = (e) => {
    let final = ''
    let live = ''
    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) final += res[0].transcript
      else live += res[0].transcript
    }
    interim.value = live
    if (final.trim()) {
      draft.value = (draft.value ? draft.value + ' ' : '') + final.trim()
      interim.value = ''
    }
  }
  recog.onerror = (e) => {
    listening.value = false
    interim.value = ''
    const err = e?.error || ''
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      toast.error('Microphone is blocked — allow access in the browser, or just type instead')
    } else if (err === 'aborted') {
      // User cancelled (Esc / toggle) — not an error
    } else if (err === 'no-speech') {
      toast.error('Did not catch that — try again, a little louder and closer')
    } else if (err === 'audio-capture') {
      toast.error('No microphone found on this device')
    } else if (err === 'network') {
      toast.error('Speech service unreachable — check your connection')
    } else {
      toast.error('Voice input hiccup — you can always type instead')
    }
  }
  recog.onend = () => {
    listening.value = false
    interim.value = ''
  }
  try {
    recog.start()
    listening.value = true
  } catch {
    listening.value = false
    toast.error('Voice input could not start — just type instead')
  }
}

function cancelListening() {
  if (!listening.value) return
  try { recog?.abort() } catch {}
  listening.value = false
  interim.value = ''
}

onBeforeUnmount(() => {
  cancelListening()
  chatAbort?.abort()
})
</script>

<style scoped>
.md-body { font-size: 0.875rem; line-height: 1.45; }
.md-body > :first-child { margin-top: 0; }
.md-body > :last-child { margin-bottom: 0; }
.md-body p { margin: 0.35rem 0; }
.md-body ul, .md-body ol { margin: 0.35rem 0; padding-left: 1.25rem; }
.md-body ul { list-style: disc; }
.md-body ol { list-style: decimal; }
.md-body li { margin: 0.15rem 0; }
.md-body strong { font-weight: 600; color: inherit; }
.md-body em { font-style: italic; }
.md-body a { color: #6ee7b7; text-decoration: underline; text-underline-offset: 2px; }
.md-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8em;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.25rem;
  padding: 0.05rem 0.3rem;
}
.md-body pre {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  overflow-x: auto;
  margin: 0.4rem 0;
}
.md-body pre code { background: transparent; border: 0; padding: 0; }
.md-body h1, .md-body h2, .md-body h3, .md-body h4 {
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
  font-size: 0.925rem;
}
.md-body blockquote {
  border-left: 3px solid rgba(110, 231, 183, 0.4);
  padding-left: 0.6rem;
  margin: 0.4rem 0;
  color: #d1d5db;
}
.md-body hr { border-color: rgba(255, 255, 255, 0.12); margin: 0.5rem 0; }
.md-body table { border-collapse: collapse; margin: 0.4rem 0; font-size: 0.8rem; }
.md-body th, .md-body td { border: 1px solid rgba(255, 255, 255, 0.12); padding: 0.25rem 0.5rem; text-align: left; }
.md-body th { background: rgba(0, 0, 0, 0.25); }
</style>
