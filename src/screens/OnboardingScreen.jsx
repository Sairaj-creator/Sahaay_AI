import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { announceScreen } from '../utils/tts.js'

const cardStyle = {
  minHeight: 96,
  width: '100%',
  borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'linear-gradient(145deg, #12304f, #0a1624)',
  color: '#f8fbff',
  padding: 24,
  fontSize: 24,
  fontWeight: 700,
  textAlign: 'left',
  cursor: 'pointer',
}

export default function OnboardingScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    announceScreen(
      'Welcome to Sahaay. Choose visually impaired mode to start using the app, or caregiver mode to set up support features.'
    )
  }, [])

  const handleSelect = (userType, path) => {
    window.localStorage.setItem('sahaay-user-type', userType)
    navigate(path)
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top, #15355d 0%, #07111d 55%, #04070d 100%)',
        color: '#f8fbff',
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <section style={{ width: '100%', maxWidth: 720 }}>
        <p style={{ fontSize: 18, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8cc8ff' }}>
          Sahaay AI
        </p>
        <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: '12px 0 18px' }}>
          The most intelligent interface is sometimes no interface at all.
        </h1>
        <p style={{ fontSize: 20, lineHeight: 1.6, color: '#d4e9ff', marginBottom: 24 }}>
          Sahaay listens, looks through the camera, and speaks back in clear language for visually
          impaired users in India.
        </p>

        <div style={{ display: 'grid', gap: 18 }}>
          <button
            type="button"
            onClick={() => handleSelect('user', '/app')}
            aria-label="Start Sahaay as a visually impaired user"
            style={cardStyle}
          >
            I am visually impaired
          </button>
          <button
            type="button"
            onClick={() => handleSelect('caregiver', '/caregiver')}
            aria-label="Open caregiver setup and dashboard"
            style={{ ...cardStyle, background: 'linear-gradient(145deg, #1f3322, #0a1710)' }}
          >
            Set up for someone
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 24 }}>
          <Link
            to="/demo"
            aria-label="Open the live demo screen"
            style={{
              minWidth: 160,
              minHeight: 80,
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#f8fbff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              textDecoration: 'none',
              padding: '0 20px',
            }}
          >
            Demo screen
          </Link>
          <p style={{ fontSize: 18, color: '#9eb4ca', margin: 0, alignSelf: 'center' }}>
            Best experience: Chrome or Edge with mic and camera permissions enabled.
          </p>
        </div>
      </section>
    </main>
  )
}
