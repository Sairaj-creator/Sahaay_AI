// ─── Shared Base URL ─────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

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

// ─── Vision API (Proxy) ───────────────────────────────────────────────────────
export async function callVision(base64Image, prompt) {
  const res = await fetch(`${API_BASE_URL}/api/vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, prompt }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Vision API error: ${res.status} — ${body.error || ''}`)
  }

  const data = await res.json()
  return data.text || 'No response received.'
}

// ─── Text API (Proxy) ─────────────────────────────────────────────────────────
export async function callMinimaxText(prompt) {
  const res = await fetch(`${API_BASE_URL}/api/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Text API error: ${res.status} — ${body.error || ''}`)
  }

  const data = await res.json()
  return data.text || 'No response received.'
}

// ─── Speech-to-Text API (Proxy) ───────────────────────────────────────────────
export async function callWhisper(audioBlob, lang = 'en') {
  const res = await fetch(`${API_BASE_URL}/api/whisper?lang=${encodeURIComponent(lang)}`, {
    method: 'POST',
    headers: { 'Content-Type': audioBlob.type || 'audio/webm' },
    body: audioBlob,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Speech API error: ${res.status} — ${body.error || ''}`)
  }

  const data = await res.json()
  if (!data.text) {
    throw new Error('Speech transcription failed. Please try again.')
  }
  return data.text
}
