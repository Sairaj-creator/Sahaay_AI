import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { announceScreen, speak } from '../utils/tts.js'

const tileStyle = {
  minHeight: 120,
  borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)',
  color: '#f8fbff',
  padding: 20,
  fontSize: 24,
  fontWeight: 700,
  textAlign: 'left',
  cursor: 'pointer',
}

export default function QuickActionsScreen() {
  const navigate = useNavigate()
  const { switchMode, lang } = useAI()

  useEffect(() => {
    announceScreen('Quick actions. Choose scene, read, currency, face mode, or emergency.', lang)
  }, [lang])

  const chooseMode = (mode) => {
    switchMode(mode)
    navigate('/app')
  }

  const callEmergency = async () => {
    await speak('Calling emergency helpline one one two.', lang)
    window.location.href = 'tel:112'
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
      <section style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 18, color: '#8cc8ff', marginBottom: 10 }}>Quick actions</p>
            <h1 style={{ fontSize: 36, margin: 0 }}>Choose what Sahaay should do next</h1>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginTop: 28 }}>
          <button type="button" onClick={() => chooseMode('scene')} aria-label="Activate scene description mode" style={tileStyle}>
            Scene
            <div style={{ fontSize: 18, fontWeight: 400, color: '#c7d7e8', marginTop: 10 }}>
              Describe people, objects, and hazards around you.
            </div>
          </button>
          <button type="button" onClick={() => chooseMode('ocr')} aria-label="Activate read text mode" style={tileStyle}>
            Read
            <div style={{ fontSize: 18, fontWeight: 400, color: '#c7d7e8', marginTop: 10 }}>
              Read signs, labels, and medicine text aloud.
            </div>
          </button>
          <button
            type="button"
            onClick={() => chooseMode('currency')}
            aria-label="Activate currency recognition mode"
            style={tileStyle}
          >
            Currency
            <div style={{ fontSize: 18, fontWeight: 400, color: '#c7d7e8', marginTop: 10 }}>
              Identify Indian rupee notes using the camera.
            </div>
          </button>
          <button
            type="button"
            onClick={callEmergency}
            aria-label="Call emergency helpline"
            style={{ ...tileStyle, background: 'linear-gradient(145deg, #6c1014, #2c0608)' }}
          >
            Emergency
            <div style={{ fontSize: 18, fontWeight: 400, color: '#ffd9d9', marginTop: 10 }}>
              Call the emergency helpline immediately.
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => chooseMode('face')}
          aria-label="Activate face recognition mode"
          style={{
            ...tileStyle,
            width: '100%',
            marginTop: 18,
            background: 'linear-gradient(145deg, #19443b, #0c1b1b)',
          }}
        >
          Face mode
          <div style={{ fontSize: 18, fontWeight: 400, color: '#c7f4e8', marginTop: 10 }}>
            Recognise a registered contact using caregiver-saved profiles.
          </div>
        </button>
      </section>
    </main>
  )
}
