// ─── API Keys ────────────────────────────────────────────────────────────────
const GEMINI_KEY    = import.meta.env.VITE_GEMINI_API_KEY
const GROQ_KEY      = import.meta.env.VITE_GROQ_API_KEY
const OPENAI_KEY    = import.meta.env.VITE_OPENAI_API_KEY
const NVIDIA_KEY    = import.meta.env.VITE_NVIDIA_API_KEY
const POLLINATIONS_KEY = import.meta.env.VITE_POLLINATIONS_KEY

// ─── Endpoints ───────────────────────────────────────────────────────────────
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// OpenAI-compatible base URL for NVIDIA NIM
const NVIDIA_BASE_URL   = import.meta.env.VITE_NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const NVIDIA_CHAT_URL   = `${NVIDIA_BASE_URL}/chat/completions`

// Vision-capable NVIDIA NIM model (Llama 3.2 11B Vision — free, base64-compatible)
const NVIDIA_VISION_MODEL = import.meta.env.VITE_NVIDIA_VISION_MODEL || 'meta/llama-3.2-11b-vision-instruct'
// Text-only MiniMax model (does not support image inputs on NIM)
const NVIDIA_TEXT_MODEL   = import.meta.env.VITE_NVIDIA_TEXT_MODEL   || 'minimaxai/minimax-m1'

const GROQ_URL          = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

const POLLINATIONS_URL          = 'https://text.pollinations.ai/openai/chat/completions'
const POLLINATIONS_VISION_MODEL = 'openai-large'

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions'

// ─── Circuit breaker ─────────────────────────────────────────────────────────
// After CIRCUIT_THRESHOLD consecutive 429s from a provider, skip it for
// CIRCUIT_COOLDOWN_MS. This prevents wasting ~4.5s per call retrying a
// rate-limited API when fallbacks are available instantly.
const CIRCUIT_THRESHOLD   = 2      // consecutive 429s before tripping
const CIRCUIT_COOLDOWN_MS = 300_000 // skip provider for 5 minutes

const circuits = {
  gemini: { failures: 0, openUntil: 0 },
  groq:   { failures: 0, openUntil: 0 },
}

function isCircuitOpen(name) {
  const c = circuits[name]
  if (!c) return false
  if (c.openUntil > Date.now()) return true
  // Cooldown expired — reset
  if (c.openUntil > 0) {
    c.failures = 0
    c.openUntil = 0
  }
  return false
}

function recordSuccess(name) {
  const c = circuits[name]
  if (c) { c.failures = 0; c.openUntil = 0 }
}

function record429(name) {
  const c = circuits[name]
  if (!c) return
  c.failures += 1
  if (c.failures >= CIRCUIT_THRESHOLD) {
    c.openUntil = Date.now() + CIRCUIT_COOLDOWN_MS
    console.warn(`[Circuit] ${name} tripped — skipping for ${CIRCUIT_COOLDOWN_MS / 1000}s`)
  }
}

// ─── Shared retry helper ─────────────────────────────────────────────────────
// Retries only on HTTP 429 (rate-limit). Uses 1.5s / 3s backoff (stays under
// the 15 s safety timeout in useAI.js even with 2 retries).
async function fetchWithRetry(fn, maxRetries = 2, circuitName = null) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await fn()
      if (circuitName) recordSuccess(circuitName)
      return result
    } catch (err) {
      if (err.status === 429 && circuitName) record429(circuitName)
      if (attempt === maxRetries) throw err
      if (err.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
      } else {
        throw err
      }
    }
  }
}

// ─── Frame helpers ────────────────────────────────────────────────────────────
export function compressFrame(videoElement, size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const sourceWidth  = videoElement.videoWidth  || size
  const sourceHeight = videoElement.videoHeight || size
  const scale        = Math.min(size / sourceWidth, size / sourceHeight)
  const drawWidth    = sourceWidth  * scale
  const drawHeight   = sourceHeight * scale
  const offsetX      = (size - drawWidth)  / 2
  const offsetY      = (size - drawHeight) / 2

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight)

  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
}

// ─── Provider 1 — Gemini 2.0 Flash ──────────────────────────────────────────
export async function callGeminiVision(base64Image, prompt) {
  if (isCircuitOpen('gemini')) {
    throw new Error('Gemini circuit open — skipping (rate-limited)')
  }

  return fetchWithRetry(async () => {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 200, temperature: 0.4 },
      }),
    })

    if (!res.ok) {
      const err = new Error(`Gemini error: ${res.status}`)
      err.status = res.status
      throw err
    }

    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.'
  }, 2, 'gemini')
}

// ─── Provider 2 — Groq (Llama 4 Scout Vision) ───────────────────────────────
export async function callGroqVision(base64Image, prompt) {
  // Single retry on 429 since this is already a fallback
  return fetchWithRetry(async () => {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_completion_tokens: 200,
      }),
    })

    if (!res.ok) {
      const err = new Error(`Groq error: ${res.status}`)
      err.status = res.status
      throw err
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'No response received.'
  }, 1)
}

// ─── Provider 3 — NVIDIA NIM (Llama 3.2 11B Vision) ─────────────────────────
// Uses the OpenAI-compatible /v1/chat/completions endpoint.
// meta/llama-3.2-11b-vision-instruct accepts base64 data URIs on NIM.
export async function callNvidiaVision(base64Image, prompt) {
  if (!NVIDIA_KEY || NVIDIA_KEY === 'your_key_here') {
    throw new Error('NVIDIA API key not configured.')
  }

  const res = await fetch(NVIDIA_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_KEY}`,
    },
    body: JSON.stringify({
      model: NVIDIA_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.4,
      stream: false,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`NVIDIA NIM error: ${res.status}${body ? ` — ${body.slice(0, 120)}` : ''}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response received.'
}

// ─── MiniMax via NVIDIA NIM — TEXT ONLY ──────────────────────────────────────
// minimaxai/minimax-m2.7 / minimax-m1 are reasoning/text models on NIM.
// They do NOT reliably support image inputs. Use only for text-based prompts.
export async function callMinimaxText(prompt) {
  if (!NVIDIA_KEY || NVIDIA_KEY === 'your_key_here') {
    throw new Error('NVIDIA API key not configured.')
  }

  const res = await fetch(NVIDIA_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_KEY}`,
    },
    body: JSON.stringify({
      model: NVIDIA_TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 1,
      top_p: 0.95,
      stream: false,
    }),
  })

  if (!res.ok) {
    throw new Error(`MiniMax NIM error: ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response received.'
}

// ─── Provider 4 — Pollinations (last resort) ─────────────────────────────────
export async function callPollinationsVision(base64Image, prompt) {
  const headers = { 'Content-Type': 'application/json' }
  if (POLLINATIONS_KEY) {
    headers.Authorization = `Bearer ${POLLINATIONS_KEY}`
  }

  const res = await fetch(POLLINATIONS_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: POLLINATIONS_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 200,
    }),
  })

  if (!res.ok) {
    throw new Error(`Pollinations error: ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response received.'
}

// ─── Main cascade — callVision ────────────────────────────────────────────────
//  1. Groq Llama-4 Scout      (ultra-fast, free vision — primary)
//  2. Gemini 2.0 Flash        (high quality, but free-tier is rate-limited)
//  3. NVIDIA NIM Llama 3.2    (reliable free fallback, base64-compatible)
//  4. Pollinations             (no-key last resort)
export async function callVision(base64Image, prompt) {
  // ── 1. Groq (primary — fast & reliable) ──
  try {
    return await callGroqVision(base64Image, prompt)
  } catch (err) {
    console.warn('[Pipeline] Groq failed → trying Gemini:', err.message)
  }

  // ── 2. Gemini ──
  try {
    return await callGeminiVision(base64Image, prompt)
  } catch (err) {
    console.warn('[Pipeline] Gemini failed → trying NVIDIA NIM:', err.message)
  }

  // ── 3. NVIDIA NIM (Llama 3.2 Vision) ──
  try {
    return await callNvidiaVision(base64Image, prompt)
  } catch (err) {
    console.warn('[Pipeline] NVIDIA NIM failed → trying Pollinations:', err.message)
  }

  // ── 4. Pollinations ──
  try {
    return await callPollinationsVision(base64Image, prompt)
  } catch (err) {
    console.warn('[Pipeline] Pollinations also failed:', err.message)
    throw new Error('All vision APIs are currently unavailable. Please try again in a moment.')
  }
}

// ─── Speech-to-Text (STT) Pipeline ───────────────────────────────────────────
// 1. HuggingFace Whisper (free inference API — no key required for small/base)
// 2. OpenAI Whisper (paid fallback — requires VITE_OPENAI_API_KEY)

const HF_API_KEY = import.meta.env.VITE_HF_API_KEY || ''
const HF_WHISPER_MODEL = 'openai/whisper-large-v3-turbo'
const HF_WHISPER_URL = `https://api-inference.huggingface.co/models/${HF_WHISPER_MODEL}`

async function callHFWhisper(audioBlob) {
  const headers = {}
  if (HF_API_KEY) {
    headers.Authorization = `Bearer ${HF_API_KEY}`
  }
  // HF inference API accepts raw binary audio
  headers['Content-Type'] = audioBlob.type || 'audio/webm'

  const res = await fetch(HF_WHISPER_URL, {
    method: 'POST',
    headers,
    body: audioBlob,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HF Whisper error: ${res.status}${body ? ` — ${body.slice(0, 120)}` : ''}`)
  }

  const data = await res.json()
  return data.text || ''
}

async function callOpenAIWhisper(audioBlob, lang = 'en') {
  if (!OPENAI_KEY) {
    throw new Error('OpenAI API key not configured.')
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', lang.split('-')[0])

  const res = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`OpenAI Whisper error: ${res.status}`)
  }

  const data = await res.json()
  return data.text || ''
}

// Cascade: HuggingFace (free) → OpenAI (paid fallback)
export async function callWhisper(audioBlob, lang = 'en') {
  // ── 1. HuggingFace Whisper (free) ──
  try {
    const text = await callHFWhisper(audioBlob)
    if (text) return text
  } catch (err) {
    console.warn('[STT] HuggingFace Whisper failed → trying OpenAI:', err.message)
  }

  // ── 2. OpenAI Whisper (paid fallback) ──
  try {
    return await callOpenAIWhisper(audioBlob, lang)
  } catch (err) {
    console.warn('[STT] OpenAI Whisper also failed:', err.message)
    throw new Error('Speech transcription failed. Please try again or use Chrome for native speech recognition.')
  }
}
