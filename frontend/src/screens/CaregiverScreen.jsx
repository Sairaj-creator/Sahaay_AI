import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadFaceModels, descriptorFromBase64, saveLocalFace, loadLocalFaces, deleteLocalFace } from '../utils/faceMatch.js'
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

/* ── Shared input style ── */
const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.35)',
  color: '#f0f6ff',
  fontSize: 15,
  outline: 'none',
  fontFamily: 'var(--font-body)',
  transition: 'border-color 180ms ease',
}

/* ── KPI card ── */
function KpiCard({ label, value, icon, color = '#38bdf8' }) {
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      border: `1px solid ${color}22`,
      background: `${color}08`,
      backdropFilter: 'blur(16px)',
    }}>
      <p style={{ fontSize: 22, marginBottom: 4 }}>{icon}</p>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: `${color}99`, marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color, margin: 0 }}>{value}</p>
    </div>
  )
}

/* ── Glass form card ── */
function FormCard({ title, icon, onSubmit, children, submitLabel, submitColor = '#34d399', submitTextColor = '#001a12' }) {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        padding: '22px 20px',
      }}
    >
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 16, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'rgba(240,246,255,0.35)', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{icon}</span>{title}
      </h2>
      {children}
      <button
        type="submit"
        style={{
          marginTop: 16, width: '100%', padding: '14px 20px',
          borderRadius: 12, border: 'none',
          background: submitColor, color: submitTextColor,
          fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'var(--font-display)',
          transition: 'opacity 150ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {submitLabel}
      </button>
    </form>
  )
}

export default function CaregiverScreen() {
  const [dashboard, setDashboard] = useState({ queries_today: 0, top_mode: '—', last_active: null, contacts: [] })
  const [faces, setFaces] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [statusKind, setStatusKind] = useState('info') // 'info' | 'error' | 'ok'
  const [loading, setLoading] = useState(true)
  const [faceForm, setFaceForm] = useState({ contact_name: '', photo_url: '', file_name: '' })
  const [emergencyForm, setEmergencyForm] = useState({ name: '', phone: '' })

  const notify = (msg, kind = 'info') => { setStatusMessage(msg); setStatusKind(kind) }

  const loadDashboard = async () => {
    const [dashRes, facesRes, activityRes] = await Promise.all([
      fetch(apiUrl('/api/dashboard/1')),
      fetch(apiUrl('/api/faces/1')),
      fetch(apiUrl('/api/query-log/1')),
    ])
    if (dashRes.ok)     setDashboard(await dashRes.json())
    if (facesRes.ok)    setFaces(await facesRes.json())
    if (activityRes.ok) {
      const entries = await activityRes.json()
      setRecentActivity(Array.isArray(entries) ? entries.slice(0, 10) : [])
    }
  }

  useEffect(() => {
    // Load local faces immediately so the gallery works offline
    setFaces(loadLocalFaces())
    announceScreen('Caregiver dashboard. Manage contacts, emergency details, and usage insights.')
    ;(async () => {
      try {
        await loadDashboard()
      } catch {
        notify('Backend unavailable — showing locally registered faces.', 'error')
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
      setFaceForm(c => ({ ...c, photo_url: photoUrl, file_name: file.name }))
      notify('Photo ready to register.', 'ok')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const submitFace = async (event) => {
    event.preventDefault()
    if (!faceForm.contact_name.trim() || !faceForm.photo_url) {
      notify('Add a contact name and photo before registering.', 'error'); return
    }
    try {
      const modelsReady = await loadFaceModels()
      if (!modelsReady) {
        notify('Face models could not load. Check your connection and try again.', 'error'); return
      }
      const mimeType = faceForm.photo_url.split(';')[0].split(':')[1] || 'image/jpeg'
      const descriptor = await descriptorFromBase64(faceForm.photo_url.split(',')[1], mimeType)
      if (!descriptor) {
        notify('No face detected. Use a clear front-facing photo.', 'error'); return
      }

      // Save to localStorage immediately — works fully offline
      saveLocalFace(faceForm.contact_name.trim(), descriptor, faceForm.photo_url)
      setFaces(loadLocalFaces())
      setFaceForm({ contact_name: '', photo_url: '', file_name: '' })
      notify('Face registered successfully. ✓', 'ok')

      // Fire-and-forget to backend if available
      fetch(apiUrl('/api/register-face'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, contact_name: faceForm.contact_name.trim(), embedding: descriptor, photo_url: faceForm.photo_url }),
      }).catch(() => {})
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const submitEmergency = async (event) => {
    event.preventDefault()
    if (!emergencyForm.name.trim() || !emergencyForm.phone.trim()) {
      notify('Enter an emergency contact name and phone number.', 'error'); return
    }
    try {
      const res = await fetch(apiUrl('/api/emergency'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, name: emergencyForm.name.trim(), phone: emergencyForm.phone.trim() }),
      })
      if (!res.ok) {
        const p = await res.json().catch(() => ({}))
        throw new Error(p.error || 'Could not save emergency contact.')
      }
      setEmergencyForm({ name: '', phone: '' })
      notify('Emergency contact saved. ✓', 'ok')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const deleteFace = (faceId) => {
    deleteLocalFace(faceId)
    setFaces(loadLocalFaces())
    notify('Face deleted.', 'ok')
    // Fire-and-forget to backend if available
    fetch(apiUrl(`/api/faces/${faceId}`), { method: 'DELETE' }).catch(() => {})
  }

  const truncateQuery = (text) => {
    if (!text) return 'No spoken query saved'
    return text.length > 60 ? `${text.slice(0, 57)}…` : text
  }

  const statusColor = { info: 'rgba(56,189,248,0.7)', error: '#fb7185', ok: '#34d399' }[statusKind]

  return (
    <main style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse 80% 40% at 50% 0%, rgba(52,211,153,0.07) 0%, transparent 55%),
        linear-gradient(180deg, #050B14 0%, #000000 100%)
      `,
      color: '#f0f6ff',
      fontFamily: 'var(--font-body)',
      padding: '0 0 60px',
    }}>
      <style>{`
        input:focus { border-color: rgba(56,189,248,0.4) !important; box-shadow: 0 0 0 3px rgba(56,189,248,0.08); }
        .face-card:hover { transform: translateY(-2px); }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '28px 24px 0', maxWidth: 960, margin: '0 auto',
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.6)', marginBottom: 8 }}>
            Caregiver Dashboard
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Set up trusted people &amp; monitor usage
          </h1>
        </div>
        <Link
          to="/app"
          aria-label="Return to the main orb screen"
          style={{
            padding: '10px 18px', borderRadius: 12, marginTop: 4,
            border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(240,246,255,0.55)',
            textDecoration: 'none', fontSize: 14, fontWeight: 500, flexShrink: 0,
          }}
        >
          ← Back
        </Link>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>

        {/* Status banner */}
        {(loading || statusMessage) && (
          <div style={{
            marginTop: 20, padding: '12px 18px',
            borderRadius: 12,
            border: `1px solid ${statusColor}33`,
            background: `${statusColor}0D`,
            fontSize: 14, color: statusColor,
            animation: 'fadeSlideUp 0.25s ease-out',
          }}>
            {loading ? '⏳ Loading caregiver data…' : statusMessage}
          </div>
        )}

        {/* KPI row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14, marginTop: 24,
        }}>
          <KpiCard icon="📊" label="Queries today"  value={dashboard.queries_today} color="#38bdf8" />
          <KpiCard icon="🎯" label="Most used mode" value={String(dashboard.top_mode).toUpperCase()} color="#818cf8" />
          <KpiCard icon="🕐" label="Last active"    value={dashboard.last_active ? new Date(dashboard.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} color="#34d399" />
        </div>

        {/* Face + Emergency forms */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
          {/* Register face */}
          <FormCard title="Register a Face" icon="👤" onSubmit={submitFace} submitLabel="Save Face →" submitColor="#34d399" submitTextColor="#001a12">
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,246,255,0.5)', display: 'block' }}>
                Contact name
                <input
                  type="text"
                  value={faceForm.contact_name}
                  onChange={e => setFaceForm(c => ({ ...c, contact_name: e.target.value }))}
                  placeholder="e.g. Ravi Kumar"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,246,255,0.5)', display: 'block' }}>
                Upload photo
                <div style={{
                  marginTop: 8, padding: '14px',
                  borderRadius: 12, border: '1.5px dashed rgba(255,255,255,0.12)',
                  background: 'rgba(0,0,0,0.2)', textAlign: 'center', cursor: 'pointer',
                }}>
                  <input
                    type="file" accept="image/*"
                    onChange={handleFaceUpload}
                    style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                    id="face-upload"
                  />
                  <label htmlFor="face-upload" style={{ cursor: 'pointer', fontSize: 13, color: 'rgba(240,246,255,0.4)' }}>
                    {faceForm.file_name
                      ? <span style={{ color: '#34d399' }}>✓ {faceForm.file_name}</span>
                      : '📷 Choose photo'
                    }
                  </label>
                </div>
              </label>
            </div>
          </FormCard>

          {/* Emergency contact */}
          <FormCard title="Emergency Contact" icon="🆘" onSubmit={submitEmergency} submitLabel="Save Contact →" submitColor="#fbbf24" submitTextColor="#1c1200">
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,246,255,0.5)', display: 'block' }}>
                Contact name
                <input
                  type="text"
                  value={emergencyForm.name}
                  onChange={e => setEmergencyForm(c => ({ ...c, name: e.target.value }))}
                  placeholder="e.g. Priya (daughter)"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,246,255,0.5)', display: 'block' }}>
                Phone number
                <input
                  type="tel"
                  value={emergencyForm.phone}
                  onChange={e => setEmergencyForm(c => ({ ...c, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>
            </div>
          </FormCard>
        </div>

        {/* Registered faces */}
        <section style={{
          marginTop: 24,
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          padding: '22px 20px',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(240,246,255,0.35)', marginBottom: 18,
          }}>
            👤 Registered Faces
          </h2>
          {faces.length === 0 ? (
            <p style={{ fontSize: 15, color: 'rgba(240,246,255,0.3)', textAlign: 'center', padding: '20px 0' }}>
              No contacts registered yet. Upload a photo above to get started.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {faces.map((face) => (
                <div
                  key={face.id}
                  className="face-card"
                  style={{
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.3)',
                    padding: 14, textAlign: 'center',
                    transition: 'transform 200ms ease',
                  }}
                >
                  {face.photo_url ? (
                    <img
                      src={face.photo_url}
                      alt={face.contact_name}
                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 12, marginBottom: 10 }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 32 }}>
                      👤
                    </div>
                  )}
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#f0f6ff' }}>{face.contact_name}</p>
                  <button
                    type="button"
                    onClick={() => deleteFace(face.id)}
                    aria-label={`Delete ${face.contact_name}`}
                    style={{
                      width: '100%', padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(251,113,133,0.25)',
                      background: 'rgba(251,113,133,0.08)',
                      color: '#fb7185', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'background 150ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,113,133,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,113,133,0.08)'}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity table */}
        <section style={{
          marginTop: 20,
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          padding: '22px 20px',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(240,246,255,0.35)', marginBottom: 18,
          }}>
            📋 Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p style={{ fontSize: 15, color: 'rgba(240,246,255,0.3)', textAlign: 'center', padding: '20px 0' }}>
              No recent activity recorded yet.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    {['Timestamp', 'Mode', 'Query'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '0 0 14px',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'rgba(240,246,255,0.3)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((entry) => (
                    <tr key={entry.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '13px 0', color: 'rgba(240,246,255,0.5)', whiteSpace: 'nowrap', paddingRight: 20 }}>
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '13px 20px 13px 0', textTransform: 'capitalize' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 6,
                          background: 'rgba(56,189,248,0.1)',
                          border: '1px solid rgba(56,189,248,0.2)',
                          fontSize: 12, fontWeight: 600, color: '#38bdf8',
                        }}>
                          {entry.mode}
                        </span>
                      </td>
                      <td style={{ padding: '13px 0', color: 'rgba(240,246,255,0.6)', lineHeight: 1.5 }}>
                        {truncateQuery(entry.query_text)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
