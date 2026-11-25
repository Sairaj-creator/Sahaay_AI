// On-device speech-to-text. Talks to the Whisper Web Worker.

const SAMPLE_RATE = 16000 // Whisper expects 16 kHz mono

const WHISPER_LANGUAGE = { 'en-IN': 'en', 'hi-IN': 'hi', 'kn-IN': 'kn' }

let worker = null
let nextId = 1
const pending = new Map()
const progressListeners = new Set()

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../workers/whisper.worker.js', import.meta.url), { type: 'module' })

  worker.onmessage = ({ data }) => {
    if (data.type === 'progress' || data.type === 'ready') {
      progressListeners.forEach((fn) => fn(data))
      return
    }
    const entry = pending.get(data.id)
    if (!entry) return
    pending.delete(data.id)
    if (data.type === 'error') entry.reject(new Error(data.message))
    else entry.resolve(data)
  }

  worker.onerror = (event) => {
    const error = new Error(event.message || 'On-device speech recognition crashed.')
    pending.forEach(({ reject }) => reject(error))
    pending.clear()
    worker = null
  }

  return worker
}

function request(message) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ ...message, id }, message.audio ? [message.audio.buffer] : [])
  })
}

/** Subscribe to model download progress. Returns an unsubscribe function. */
export function onLocalSttProgress(listener) {
  progressListeners.add(listener)
  return () => progressListeners.delete(listener)
}

/** Download and initialise the model ahead of time, so the first question is not slow. */
let preloadPromise = null
export function preloadLocalStt() {
  if (!preloadPromise) {
    preloadPromise = request({ type: 'load' }).catch((err) => {
      preloadPromise = null
      throw err
    })
  }
  return preloadPromise
}

export function whisperLanguage(lang) {
  return WHISPER_LANGUAGE[lang] || 'en'
}

/** Mix down to mono. Exported for tests. */
export function toMono(channels) {
  if (channels.length === 1) return channels[0]
  const out = new Float32Array(channels[0].length)
  for (const channel of channels) {
    for (let i = 0; i < out.length; i++) out[i] += channel[i] / channels.length
  }
  return out
}

async function decodeTo16kMono(blob) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  // Creating the context at 16 kHz makes decodeAudioData resample for us.
  const ctx = new AudioCtx({ sampleRate: SAMPLE_RATE })
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i))
    // Copy: the worker takes ownership of the buffer we transfer.
    return new Float32Array(toMono(channels))
  } finally {
    ctx.close?.()
  }
}

/** Transcribe a recorded audio Blob entirely on this device. */
export async function transcribeLocally(blob, lang = 'en-IN') {
  const audio = await decodeTo16kMono(blob)
  const { text } = await request({ type: 'transcribe', audio, language: whisperLanguage(lang) })
  return text
}
