import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { announceScreen } from '../utils/tts.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

function apiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsDataURL(file)
  })
}

export default function CaregiverScreen() {
  const [dashboard, setDashboard] = useState({ queries_today: 0, top_mode: 'scene', last_active: null, contacts: [] })
  const [faces, setFaces] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [faceForm, setFaceForm] = useState({ contact_name: '', photo_url: '', file_name: '' })
  const [emergencyForm, setEmergencyForm] = useState({ name: '', phone: '' })

  const loadDashboard = async () => {
    const [dashboardRes, facesRes] = await Promise.all([fetch(apiUrl('/api/dashboard/1')), fetch(apiUrl('/api/faces/1'))])

    if (dashboardRes.ok) {
      setDashboard(await dashboardRes.json())
    }

    if (facesRes.ok) {
      setFaces(await facesRes.json())
    }
  }

  useEffect(() => {
    announceScreen('Caregiver dashboard. Manage contacts, emergency details, and usage insights.')

    ;(async () => {
      try {
        await loadDashboard()
      } catch {
        setStatusMessage('Backend is currently unavailable. Start the server on port 3001 to use caregiver tools.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleFaceUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const photoUrl = await readFileAsDataUrl(file)
      setFaceForm((current) => ({
        ...current,
        photo_url: photoUrl,
        file_name: file.name,
      }))
      setStatusMessage('Photo ready to register.')
    } catch (err) {
      setStatusMessage(err.message)
    }
  }

  const submitFace = async (event) => {
    event.preventDefault()

    if (!faceForm.contact_name.trim() || !faceForm.photo_url) {
      setStatusMessage('Add a contact name and photo before registering a face.')
      return
    }

    try {
      const res = await fetch(apiUrl('/api/register-face'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          contact_name: faceForm.contact_name.trim(),
          embedding: [],
          photo_url: faceForm.photo_url,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Could not register face.')
      }

      setFaceForm({ contact_name: '', photo_url: '', file_name: '' })
      setStatusMessage('Face registered successfully.')
      await loadDashboard()
    } catch (err) {
      setStatusMessage(err.message)
    }
  }

  const submitEmergency = async (event) => {
    event.preventDefault()

    if (!emergencyForm.name.trim() || !emergencyForm.phone.trim()) {
      setStatusMessage('Enter an emergency contact name and phone number.')
      return
    }

    try {
      const res = await fetch(apiUrl('/api/emergency'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          name: emergencyForm.name.trim(),
          phone: emergencyForm.phone.trim(),
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Could not save emergency contact.')
      }

      setEmergencyForm({ name: '', phone: '' })
      setStatusMessage('Emergency contact saved.')
    } catch (err) {
      setStatusMessage(err.message)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #08111d 0%, #04070c 100%)',
        color: '#f8fbff',
        padding: 24,
      }}
    >
      <section style={{ width: '100%', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 18, color: '#8cc8ff', marginBottom: 10 }}>Caregiver dashboard</p>
            <h1 style={{ fontSize: 36, margin: 0 }}>Set up trusted people and monitor usage</h1>
          </div>
          <Link
            to="/app"
            aria-label="Return to the main orb screen"
            style={{
              minWidth: 140,
              minHeight: 80,
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f8fbff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              fontSize: 18,
              padding: '0 18px',
            }}
          >
            Back to orb
          </Link>
        </div>

        <div aria-live="polite" style={{ fontSize: 18, color: '#cfe7ff', minHeight: 28, marginBottom: 18 }}>
          {loading ? 'Loading caregiver data...' : statusMessage}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 24 }}>
          <div style={{ borderRadius: 24, padding: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p style={{ fontSize: 18, color: '#8cc8ff', marginTop: 0 }}>Queries today</p>
            <p style={{ fontSize: 34, margin: 0 }}>{dashboard.queries_today}</p>
          </div>
          <div style={{ borderRadius: 24, padding: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p style={{ fontSize: 18, color: '#8cc8ff', marginTop: 0 }}>Most used mode</p>
            <p style={{ fontSize: 34, margin: 0, textTransform: 'capitalize' }}>{dashboard.top_mode}</p>
          </div>
          <div style={{ borderRadius: 24, padding: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p style={{ fontSize: 18, color: '#8cc8ff', marginTop: 0 }}>Last active</p>
            <p style={{ fontSize: 24, margin: 0 }}>{dashboard.last_active || 'No activity yet'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 20 }}>
          <form
            onSubmit={submitFace}
            style={{
              borderRadius: 24,
              padding: 24,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 style={{ fontSize: 26, marginTop: 0 }}>Register a face</h2>
            <label style={{ display: 'block', fontSize: 18, marginBottom: 10 }}>
              Contact name
              <input
                type="text"
                value={faceForm.contact_name}
                onChange={(event) => setFaceForm((current) => ({ ...current, contact_name: event.target.value }))}
                style={{
                  width: '100%',
                  minHeight: 56,
                  marginTop: 8,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: '#08111d',
                  color: '#f8fbff',
                  padding: '0 16px',
                  fontSize: 18,
                }}
              />
            </label>

            <label style={{ display: 'block', fontSize: 18, marginBottom: 10 }}>
              Upload contact photo
              <input
                type="file"
                accept="image/*"
                onChange={handleFaceUpload}
                style={{ display: 'block', marginTop: 12, fontSize: 18 }}
              />
            </label>

            {faceForm.file_name && <p style={{ fontSize: 18, color: '#c7d7e8' }}>Selected: {faceForm.file_name}</p>}

            <button
              type="submit"
              aria-label="Save the uploaded face for recognition"
              style={{
                minWidth: 180,
                minHeight: 80,
                borderRadius: 20,
                border: 'none',
                background: '#19b28a',
                color: '#ffffff',
                fontSize: 20,
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 12,
              }}
            >
              Save face
            </button>
          </form>

          <form
            onSubmit={submitEmergency}
            style={{
              borderRadius: 24,
              padding: 24,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 style={{ fontSize: 26, marginTop: 0 }}>Emergency contact</h2>
            <label style={{ display: 'block', fontSize: 18, marginBottom: 10 }}>
              Name
              <input
                type="text"
                value={emergencyForm.name}
                onChange={(event) => setEmergencyForm((current) => ({ ...current, name: event.target.value }))}
                style={{
                  width: '100%',
                  minHeight: 56,
                  marginTop: 8,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: '#08111d',
                  color: '#f8fbff',
                  padding: '0 16px',
                  fontSize: 18,
                }}
              />
            </label>
            <label style={{ display: 'block', fontSize: 18, marginBottom: 10 }}>
              Phone number
              <input
                type="tel"
                value={emergencyForm.phone}
                onChange={(event) => setEmergencyForm((current) => ({ ...current, phone: event.target.value }))}
                style={{
                  width: '100%',
                  minHeight: 56,
                  marginTop: 8,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: '#08111d',
                  color: '#f8fbff',
                  padding: '0 16px',
                  fontSize: 18,
                }}
              />
            </label>
            <button
              type="submit"
              aria-label="Save the emergency contact"
              style={{
                minWidth: 200,
                minHeight: 80,
                borderRadius: 20,
                border: 'none',
                background: '#f4a933',
                color: '#1b1200',
                fontSize: 20,
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 12,
              }}
            >
              Save contact
            </button>
          </form>
        </div>

        <section
          style={{
            borderRadius: 24,
            padding: 24,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            marginTop: 20,
          }}
        >
          <h2 style={{ fontSize: 26, marginTop: 0 }}>Registered faces</h2>
          {faces.length === 0 ? (
            <p style={{ fontSize: 18, color: '#c7d7e8' }}>No contacts registered yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              {faces.map((face) => (
                <div key={face.id} style={{ borderRadius: 18, background: '#08111d', padding: 16 }}>
                  {face.photo_url ? (
                    <img
                      src={face.photo_url}
                      alt={face.contact_name}
                      style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 14, marginBottom: 12 }}
                    />
                  ) : null}
                  <p style={{ fontSize: 18, margin: 0 }}>{face.contact_name}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
