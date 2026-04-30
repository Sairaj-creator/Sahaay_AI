import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'

process.env.NODE_ENV = 'test'

vi.mock('../db.js', async () => {
  const { db } = await import('./testDb.js')
  return { db }
})

import { app } from '../index.js'

describe('Backend API Routes', () => {
  describe('POST /api/log-query', () => {
    it('returns 200 with id and timestamp for valid input', async () => {
      const res = await request(app).post('/api/log-query').send({ user_id: 1, mode: 'scene', query_text: 'test', response_text: 'result' })
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('timestamp')
    })
    
    it('returns 400 when mode is missing', async () => {
      const res = await request(app).post('/api/log-query').send({ user_id: 1, query_text: 'test', response_text: 'result' })
      expect(res.status).toBe(400)
    })
    
    it('returns 400 when user_id is 0', async () => {
      const res = await request(app).post('/api/log-query').send({ user_id: 0, mode: 'scene' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when mode exceeds 32 characters', async () => {
      const res = await request(app).post('/api/log-query').send({ user_id: 1, mode: 'a'.repeat(33) })
      expect(res.status).toBe(400)
    })

    it('returns 400 when query_text exceeds 2000 characters', async () => {
      const res = await request(app).post('/api/log-query').send({ user_id: 1, mode: 'scene', query_text: 'a'.repeat(2001) })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/dashboard/:userId', () => {
    it('returns 200 with queries_today, top_mode, last_active, contacts for userId 1', async () => {
      const res = await request(app).get('/api/dashboard/1')
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('queries_today')
      expect(res.body).toHaveProperty('top_mode')
      expect(res.body).toHaveProperty('last_active')
      expect(res.body).toHaveProperty('contacts')
    })

    it('returns 400 for userId 0', async () => {
      const res = await request(app).get('/api/dashboard/0')
      expect(res.status).toBe(400)
    })

    it('returns 400 for userId abc', async () => {
      const res = await request(app).get('/api/dashboard/abc')
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/register-face', () => {
    it('returns 200 with id and contact_name for valid input with empty embedding', async () => {
      const res = await request(app).post('/api/register-face').send({ user_id: 1, contact_name: 'John', embedding: [], photo_url: 'data:image/png;base64,123' })
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('id')
      expect(res.body.contact_name).toBe('John')
    })

    it('returns 200 for valid input with exactly 128-float embedding array', async () => {
      const res = await request(app).post('/api/register-face').send({ user_id: 1, contact_name: 'Jane', embedding: Array(128).fill(0.5), photo_url: 'data:image/png;base64,123' })
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('id')
      expect(res.body.contact_name).toBe('Jane')
    })

    it('returns 400 when embedding has length 64 (not 0 or 128)', async () => {
      const res = await request(app).post('/api/register-face').send({ user_id: 1, contact_name: 'Jane', embedding: Array(64).fill(0.5), photo_url: 'data:image/png;base64,123' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when contact_name is missing', async () => {
      const res = await request(app).post('/api/register-face').send({ user_id: 1, embedding: [], photo_url: 'data:image/png;base64,123' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when contact_name exceeds 80 characters', async () => {
      const res = await request(app).post('/api/register-face').send({ user_id: 1, contact_name: 'a'.repeat(81), photo_url: 'data:image/png;base64,123' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when photo_url is missing', async () => {
      const res = await request(app).post('/api/register-face').send({ user_id: 1, contact_name: 'John' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/faces/:userId', () => {
    it('returns 200 with an array for userId 1', async () => {
      const res = await request(app).get('/api/faces/1')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('returns 400 for invalid userId', async () => {
      const res = await request(app).get('/api/faces/abc')
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/faces/:id', () => {
    it('deletes a registered face by id', async () => {
      const createRes = await request(app).post('/api/register-face').send({ user_id: 1, contact_name: 'ToDelete', embedding: [], photo_url: 'data:image/png;base64,123' })
      const faceId = createRes.body.id
      
      const res = await request(app).delete(`/api/faces/${faceId}`)
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ deleted: true, id: faceId })
    })

    it('returns 400 for id 0', async () => {
      const res = await request(app).delete('/api/faces/0')
      expect(res.status).toBe(400)
    })

    it('returns 400 for id abc', async () => {
      const res = await request(app).delete('/api/faces/abc')
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/emergency', () => {
    it('returns 200 with id, name, phone for valid input', async () => {
      const res = await request(app).post('/api/emergency').send({ user_id: 1, name: 'Doctor', phone: '911' })
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('id')
      expect(res.body.name).toBe('Doctor')
      expect(res.body.phone).toBe('911')
    })

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/api/emergency').send({ user_id: 1, phone: '911' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when phone exceeds 20 characters', async () => {
      const res = await request(app).post('/api/emergency').send({ user_id: 1, name: 'Doctor', phone: 'a'.repeat(21) })
      expect(res.status).toBe(400)
    })

    it('returns 400 when name exceeds 80 characters', async () => {
      const res = await request(app).post('/api/emergency').send({ user_id: 1, name: 'a'.repeat(81), phone: '911' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/emergency/:userId', () => {
    it('returns 200 with an array for userId 1', async () => {
      const res = await request(app).get('/api/emergency/1')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('returns 400 for invalid userId', async () => {
      const res = await request(app).get('/api/emergency/abc')
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/query-log/:userId', () => {
    it('returns 200 with an array (max 50 items) for userId 1', async () => {
      const res = await request(app).get('/api/query-log/1')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('id')
        expect(res.body[0]).toHaveProperty('mode')
        expect(res.body[0]).toHaveProperty('query_text')
        expect(res.body[0]).toHaveProperty('response_text')
        expect(res.body[0]).toHaveProperty('timestamp')
      }
    })

    it('returns 400 for invalid userId', async () => {
      const res = await request(app).get('/api/query-log/abc')
      expect(res.status).toBe(400)
    })
  })
})
