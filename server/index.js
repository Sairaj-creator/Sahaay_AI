import express from 'express'
import cors from 'cors'
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

app.post('/api/log-query', (req, res) => {
  const userId = parseUserId(req.body.user_id, 1)
  const { mode, query_text = '', response_text = '' } = req.body

  if (!userId) return badRequest(res, 'A valid user_id is required.')
  if (!mode || typeof mode !== 'string') return badRequest(res, 'A valid mode is required.')

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

app.post('/api/register-face', (req, res) => {
  const userId = parseUserId(req.body.user_id)
  const { contact_name, embedding = [], photo_url = '' } = req.body

  if (!userId) return badRequest(res, 'A valid user_id is required.')
  if (!contact_name || typeof contact_name !== 'string') return badRequest(res, 'A contact_name is required.')
  if (!Array.isArray(embedding)) return badRequest(res, 'Embedding must be an array.')
  if (!photo_url || typeof photo_url !== 'string') return badRequest(res, 'A photo_url is required.')

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

app.post('/api/emergency', (req, res) => {
  const userId = parseUserId(req.body.user_id)
  const { name, phone } = req.body

  if (!userId) return badRequest(res, 'A valid user_id is required.')
  if (!name || typeof name !== 'string') return badRequest(res, 'A contact name is required.')
  if (!phone || typeof phone !== 'string') return badRequest(res, 'A phone number is required.')

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

app.listen(PORT, () => console.log(`Sahaay API running on port ${PORT}`))
