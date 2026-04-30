import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { announceScreen } from '../utils/tts.js'

function readStoredFlag(key, fallback = false) {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  return value === null ? fallback : value === 'true'
}

export default function SettingsScreen() {
  const { lang, mode, switchLanguage, switchMode } = useAI()
  const [offlineMode, setOfflineMode] = useState(() => readStoredFlag('sahaay-offline-mode'))

  useEffect(() => {
    announceScreen('Settings. Update language, default mode, and offline preferences.', lang)
  }, [lang])

  const updateOfflineMode = () => {
    const next = !offlineMode
    setOfflineMode(next)
    window.localStorage.setItem('sahaay-offline-mode', String(next))
  }

  const geminiReady = Boolean(import.meta.env.VITE_GEMINI_API_KEY)
  const groqReady = Boolean(import.meta.env.VITE_GROQ_API_KEY)
  const whisperReady = Boolean(import.meta.env.VITE_OPENAI_API_KEY)

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #08111d 0%, #04070c 100%)',
        color: '#f8fbff',
        padding: 24,
      }}
    >
      <section style={{ width: '100%', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 18, color: '#8cc8ff', marginBottom: 10 }}>Settings</p>
            <h1 style={{ fontSize: 36, margin: 0 }}>Make Sahaay fit the user</h1>
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

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 24 }}>Language</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {['en-IN', 'hi-IN', 'kn-IN'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => switchLanguage(value)}
                aria-label={`Switch language to ${value}`}
                style={{
                  minWidth: 140,
                  minHeight: 80,
                  borderRadius: 20,
                  border: `1px solid ${lang === value ? '#f4a933' : 'rgba(255,255,255,0.12)'}`,
                  background: lang === value ? 'rgba(244, 169, 51, 0.14)' : 'rgba(255,255,255,0.04)',
                  color: '#f8fbff',
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 24 }}>Default mode</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {['scene', 'ocr', 'currency', 'face'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                aria-label={`Switch default mode to ${value}`}
                style={{
                  minWidth: 140,
                  minHeight: 80,
                  borderRadius: 20,
                  border: `1px solid ${mode === value ? '#19b28a' : 'rgba(255,255,255,0.12)'}`,
                  background: mode === value ? 'rgba(25, 178, 138, 0.14)' : 'rgba(255,255,255,0.04)',
                  color: '#f8fbff',
                  fontSize: 18,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 24 }}>Offline preference</h2>
          <button
            type="button"
            onClick={updateOfflineMode}
            aria-label="Toggle offline preference"
            style={{
              minWidth: 220,
              minHeight: 80,
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.12)',
              background: offlineMode ? 'rgba(25, 178, 138, 0.14)' : 'rgba(255,255,255,0.04)',
              color: '#f8fbff',
              fontSize: 18,
              padding: '0 20px',
              cursor: 'pointer',
            }}
          >
            Offline preference: {offlineMode ? 'on' : 'off'}
          </button>
          <p style={{ fontSize: 18, color: '#b8c9db', lineHeight: 1.6 }}>
            When enabled, Sahaay will prefer local OCR and local currency checks before using cloud
            models. Scene and face descriptions still need internet access.
          </p>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 24 }}>API readiness</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ fontSize: 18, margin: 0 }}>Gemini: {geminiReady ? 'configured' : 'missing key'}</p>
            <p style={{ fontSize: 18, margin: 0 }}>Groq: {groqReady ? 'configured' : 'missing key'}</p>
            <p style={{ fontSize: 18, margin: 0 }}>Whisper fallback: {whisperReady ? 'configured' : 'optional and missing key'}</p>
          </div>
        </section>
      </section>
    </main>
  )
}
