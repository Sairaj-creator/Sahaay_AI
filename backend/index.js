import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { db } from './db.js'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const app = express()

app.use(cors())
app.use(express.json({ limit: '4mb' }))

function badRequest(res, message) {
  return res.status(400).json({ error: message })
}

function parseUserId(value, fallback = 1) {
  const parsed = Number(value ?? fallback)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
})

app.post('/api/log-query', writeLimiter, (req, res) => {
  const userId = parseUserId(req.body.user_id, 1)
  const { mode, query_text = '', response_text = '' } = req.body

  if (!userId) return badRequest(res, 'A valid user_id is required.')
  if (!mode || typeof mode !== 'string') return badRequest(res, 'A valid mode is required.')
  if (mode.length > 32) return badRequest(res, 'Mode must be 32 characters or fewer.')
  if (typeof query_text !== 'string') return badRequest(res, 'query_text must be a string.')
  if (query_text.length > 2000) return badRequest(res, 'query_text must be 2000 characters or fewer.')
  if (typeof response_text !== 'string') return badRequest(res, 'response_text must be a string.')
  if (response_text.length > 4000) return badRequest(res, 'response_text must be 4000 characters or fewer.')

  const result = db
    .prepare('INSERT INTO query_log (user_id, mode, query_text, response_text) VALUES (?, ?, ?, ?)')
    .run(userId, mode, query_text, response_text)

  return res.json({ id: result.lastInsertRowid, timestamp: new Date().toISOString() })
})

app.get('/api/dashboard/:userId', (req, res) => {
  const userId = parseUserId(req.params.userId)
  if (!userId) return badRequest(res, 'A valid userId is required.')

  const today = new Date().toISOString().split('T')[0]
  const queriesToday = db
    .prepare("SELECT COUNT(*) as count FROM query_log WHERE user_id = ? AND timestamp LIKE ?")
    .get(userId, `${today}%`)

  const topMode = db
    .prepare('SELECT mode, COUNT(*) as c FROM query_log WHERE user_id = ? GROUP BY mode ORDER BY c DESC LIMIT 1')
    .get(userId)

  const last = db
    .prepare('SELECT timestamp FROM query_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1')
    .get(userId)

  const contacts = db
    .prepare('SELECT id, contact_name FROM registered_faces WHERE user_id = ? ORDER BY id DESC')
    .all(userId)

  return res.json({
    queries_today: queriesToday?.count || 0,
    top_mode: topMode?.mode || 'scene',
    last_active: last?.timestamp || null,
    contacts,
  })
})

app.get('/api/emergency/:userId', (req, res) => {
  const userId = parseUserId(req.params.userId)
  if (!userId) return badRequest(res, 'A valid userId is required.')

  const contacts = db
    .prepare('SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY id DESC')
    .all(userId)

  return res.json(contacts)
})

app.post('/api/register-face', writeLimiter, (req, res) => {
  const userId = parseUserId(req.body.user_id)
  const { contact_name, embedding = [], photo_url = '' } = req.body

  if (!userId) return badRequest(res, 'A valid user_id is required.')
  if (!contact_name || typeof contact_name !== 'string') return badRequest(res, 'A contact_name is required.')
  if (!Array.isArray(embedding)) return badRequest(res, 'Embedding must be an array.')
  if (embedding.length > 0 && embedding.length !== 128)
    return badRequest(res, 'Embedding must be empty or exactly 128 floats.')
  if (!photo_url || typeof photo_url !== 'string') return badRequest(res, 'A photo_url is required.')
  if (contact_name.trim().length > 80)
    return badRequest(res, 'contact_name must be 80 characters or fewer.')
  if (photo_url.length > 2000000)
    return badRequest(res, 'photo_url must be 2000000 characters or fewer.')

  const result = db
    .prepare('INSERT INTO registered_faces (user_id, contact_name, embedding, photo_url) VALUES (?, ?, ?, ?)')
    .run(userId, contact_name.trim(), JSON.stringify(embedding), photo_url)

  return res.json({ id: result.lastInsertRowid, contact_name: contact_name.trim() })
})

app.get('/api/faces/:userId', (req, res) => {
  const userId = parseUserId(req.params.userId)
  if (!userId) return badRequest(res, 'A valid userId is required.')

  const faces = db.prepare('SELECT * FROM registered_faces WHERE user_id = ?').all(userId)
  return res.json(faces.map((face) => ({ ...face, embedding: JSON.parse(face.embedding || '[]') })))
})

app.delete('/api/faces/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return badRequest(res, 'A valid face id is required.')

  db.prepare('DELETE FROM registered_faces WHERE id = ?').run(id)

  return res.json({ deleted: true, id })
})

app.get('/api/query-log/:userId', (req, res) => {
  const userId = parseUserId(req.params.userId)
  if (!userId) return badRequest(res, 'A valid userId is required.')

  const entries = db
    .prepare(
      'SELECT id, mode, query_text, response_text, timestamp FROM query_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50'
    )
    .all(userId)

  return res.json(entries)
})

app.post('/api/emergency', writeLimiter, (req, res) => {
  const userId = parseUserId(req.body.user_id)
  const { name, phone } = req.body

  if (!userId) return badRequest(res, 'A valid user_id is required.')
  if (!name || typeof name !== 'string') return badRequest(res, 'A contact name is required.')
  if (!phone || typeof phone !== 'string') return badRequest(res, 'A phone number is required.')
  if (name.trim().length > 80) return badRequest(res, 'name must be 80 characters or fewer.')
  if (phone.trim().length > 20) return badRequest(res, 'phone must be 20 characters or fewer.')

  const result = db
    .prepare('INSERT INTO emergency_contacts (user_id, name, phone) VALUES (?, ?, ?)')
    .run(userId, name.trim(), phone.trim())

  return res.json({ id: result.lastInsertRowid, name: name.trim(), phone: phone.trim() })
})

// ─── API Proxies to secure keys ───────────────────────────────────────────

app.get('/api/config', (req, res) => {
  res.json({
    geminiReady: Boolean(process.env.GEMINI_API_KEY),
    groqReady: Boolean(process.env.GROQ_API_KEY),
    whisperReady: Boolean(process.env.OPENAI_API_KEY)
  })
})

app.post('/api/vision', writeLimiter, async (req, res) => {
  const { base64Image, prompt } = req.body
  if (!base64Image || !prompt) return badRequest(res, 'base64Image and prompt are required.')

  const GEMINI_KEY = process.env.GEMINI_API_KEY
  const GROQ_KEY = process.env.GROQ_API_KEY
  const NVIDIA_KEY = process.env.NVIDIA_API_KEY
  const NVIDIA_MODEL = process.env.NVIDIA_VISION_MODEL || 'meta/llama-3.2-11b-vision-instruct'
  const POLLINATIONS_KEY = process.env.POLLINATIONS_KEY

  // 1. Groq
  if (GROQ_KEY) {
    try {
      const g = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }, { type: 'text', text: prompt }] }],
          max_completion_tokens: 200,
        }),
      })
      if (g.ok) {
        const data = await g.json()
        return res.json({ text: data.choices?.[0]?.message?.content || '' })
      }
    } catch (err) { console.warn('Groq failed', err.message) }
  }

  // 2. Gemini
  if (GEMINI_KEY) {
    try {
      const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: base64Image } }, { text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.4 },
        }),
      })
      if (g.ok) {
        const data = await g.json()
        return res.json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' })
      }
    } catch (err) { console.warn('Gemini failed', err.message) }
  }

  // 3. NVIDIA
  if (NVIDIA_KEY) {
    try {
      const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_KEY}` },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }, { type: 'text', text: prompt }] }],
          max_tokens: 200, temperature: 0.4, stream: false,
        }),
      })
      if (upstream.ok) {
        const data = await upstream.json()
        return res.json({ text: data.choices?.[0]?.message?.content || '' })
      }
    } catch (err) { console.warn('NVIDIA failed', err.message) }
  }

  // 4. Pollinations
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (POLLINATIONS_KEY) headers.Authorization = `Bearer ${POLLINATIONS_KEY}`
    const p = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'openai-large',
        messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }, { type: 'text', text: prompt }] }],
        max_tokens: 200,
      }),
    })
    if (p.ok) {
      const data = await p.json()
      return res.json({ text: data.choices?.[0]?.message?.content || '' })
    }
  } catch (err) { console.warn('Pollinations failed', err.message) }

  return res.status(502).json({ error: 'All vision APIs failed.' })
})

app.post('/api/text', writeLimiter, async (req, res) => {
  const { prompt } = req.body
  if (!prompt) return badRequest(res, 'prompt is required.')

  const NVIDIA_KEY = process.env.NVIDIA_API_KEY
  if (!NVIDIA_KEY) return res.status(503).json({ error: 'NVIDIA API key not configured.' })

  const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
  const NVIDIA_TEXT_MODEL = process.env.NVIDIA_TEXT_MODEL || 'minimaxai/minimax-m1'

  try {
    const upstream = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_KEY}` },
      body: JSON.stringify({
        model: NVIDIA_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200, temperature: 1, top_p: 0.95, stream: false,
      }),
    })
    const data = await upstream.json()
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.detail || 'NVIDIA NIM error' })
    return res.json({ text: data.choices?.[0]?.message?.content || '' })
  } catch (err) {
    return res.status(502).json({ error: `Text API failed: ${err.message}` })
  }
})

app.post('/api/whisper', writeLimiter, express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  const audioBlob = req.body
  if (!audioBlob || !Buffer.isBuffer(audioBlob) || audioBlob.length === 0) return badRequest(res, 'Audio binary body required.')

  const HF_KEY = process.env.HF_API_KEY
  const OPENAI_KEY = process.env.OPENAI_API_KEY
  const lang = req.query.lang || 'en'
  const contentType = req.headers['content-type'] || 'audio/webm'

  // 1. HF Whisper
  try {
    const headers = { 'Content-Type': contentType }
    if (HF_KEY) headers.Authorization = `Bearer ${HF_KEY}`
    
    const hf = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo', {
      method: 'POST',
      headers,
      body: audioBlob,
    })
    
    if (hf.ok) {
      const data = await hf.json()
      if (data.text) return res.json({ text: data.text })
    }
  } catch (err) { console.warn('HF Whisper failed', err.message) }

  // 2. OpenAI Whisper
  if (OPENAI_KEY) {
    try {
      const formData = new FormData()
      formData.append('file', new Blob([audioBlob], { type: contentType }), 'recording.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', lang.split('-')[0])

      const oai = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: formData,
      })
      if (oai.ok) {
        const data = await oai.json()
        return res.json({ text: data.text || '' })
      }
    } catch (err) { console.warn('OpenAI Whisper failed', err.message) }
  }

  return res.status(502).json({ error: 'All STT APIs failed.' })
})

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')))
}

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body.' })
  }

  console.error('API error:', err)
  return res.status(500).json({ error: 'Internal server error.' })
})

const PORT = process.env.PORT || 3001

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Sahaay API running on port ${PORT}`))
}

export { app }
