import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { db } from './db.js'

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
