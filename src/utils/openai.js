const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions'
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

async function fetchWithRetry(fn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) {
        throw err
      }

      if (err.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      } else {
        throw err
      }
    }
  }
}

export function compressFrame(videoElement, size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const sourceWidth = videoElement.videoWidth || size
  const sourceHeight = videoElement.videoHeight || size
  const scale = Math.min(size / sourceWidth, size / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const offsetX = (size - drawWidth) / 2
  const offsetY = (size - drawHeight) / 2

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight)

  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
}

export async function callGeminiVision(base64Image, prompt) {
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
  })
}

export async function callGroqVision(base64Image, prompt) {
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
    throw new Error(`Groq error: ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response received.'
}

export async function callVision(base64Image, prompt) {
  try {
    return await callGeminiVision(base64Image, prompt)
  } catch (err) {
    console.warn('Gemini failed, trying Groq:', err.message)

    try {
      return await callGroqVision(base64Image, prompt)
    } catch (fallbackError) {
      console.warn('Groq also failed:', fallbackError.message)
      throw new Error('All vision APIs unavailable. Please try again.')
    }
  }
}

export async function callWhisper(audioBlob, lang = 'en') {
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
    throw new Error(`Whisper error: ${res.status}`)
  }

  const data = await res.json()
  return data.text || ''
}
