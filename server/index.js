import express from 'express'
import cors from 'cors'
import { db } from './db.js'

const app = express()

app.use(cors())
app.use(express.json())

app.post('/api/log-query', (req, res) => {
  const { user_id, mode, query_text, response_text } = req.body
  const result = db
    .prepare('INSERT INTO query_log (user_id, mode, query_text, response_text) VALUES (?, ?, ?, ?)')
    .run(user_id || 1, mode, query_text, response_text)

  res.json({ id: result.lastInsertRowid, timestamp: new Date().toISOString() })
})

app.get('/api/dashboard/:userId', (req, res) => {
  const { userId } = req.params
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

  res.json({
    queries_today: queriesToday?.count || 0,
    top_mode: topMode?.mode || 'scene',
    last_active: last?.timestamp || null,
    contacts: [],
  })
})

app.post('/api/register-face', (req, res) => {
  const { user_id, contact_name, embedding, photo_url } = req.body
  const result = db
    .prepare('INSERT INTO registered_faces (user_id, contact_name, embedding, photo_url) VALUES (?, ?, ?, ?)')
    .run(user_id, contact_name, JSON.stringify(embedding), photo_url)

  res.json({ id: result.lastInsertRowid, contact_name })
})

app.get('/api/faces/:userId', (req, res) => {
  const faces = db.prepare('SELECT * FROM registered_faces WHERE user_id = ?').all(req.params.userId)
  res.json(faces.map((face) => ({ ...face, embedding: JSON.parse(face.embedding || '[]') })))
})

app.post('/api/emergency', (req, res) => {
  const { user_id, name, phone } = req.body
  const result = db
    .prepare('INSERT INTO emergency_contacts (user_id, name, phone) VALUES (?, ?, ?)')
    .run(user_id, name, phone)

  res.json({ id: result.lastInsertRowid, name, phone })
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => console.log(`Sahaay API running on port ${PORT}`))
