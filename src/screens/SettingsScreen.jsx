import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { announceScreen } from '../utils/tts.js'

const LANG_LABELS = { 'en-IN': '🇮🇳 English', 'hi-IN': '🇮🇳 हिंदी', 'kn-IN': '🇮🇳 ಕನ್ನಡ' }
const MODE_LABELS  = { scene: '🌐 Scene', ocr: '📄 Read', currency: '💰 Currency', face: '👤 Face' }

function SectionCard({ title, icon, children }) {
  return (
    <section style={{
      marginBottom: 28,
      borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(16px)',
      padding: '22px 20px',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 15, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'rgba(240,246,255,0.35)',
        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{icon}</span>{title}
      </h2>
      {children}
    </section>
  )
}

function ToggleChip({ label, active, onClick, activeColor = '#38bdf8', activeGlow }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '12px 20px',
        borderRadius: 12,
        border: `1.5px solid ${active ? `${activeColor}55` : 'rgba(255,255,255,0.08)'}`,
        background: active ? `${activeColor}18` : hov ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
        color: active ? activeColor : 'rgba(240,246,255,0.55)',
        fontSize: 15, fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 180ms ease',
        boxShadow: active && activeGlow ? `0 0 16px ${activeGlow}` : 'none',
      }}
    >
      {label}
    </button>
  )
}

function StatusDot({ ready, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px',
      borderRadius: 12,
      border: `1px solid ${ready ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.15)'}`,
      background: ready ? 'rgba(52,211,153,0.05)' : 'rgba(251,113,133,0.05)',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: ready ? '#34d399' : '#fb7185',
        boxShadow: ready ? '0 0 8px rgba(52,211,153,0.6)' : '0 0 8px rgba(251,113,133,0.4)',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 14, color: ready ? 'rgba(52,211,153,0.9)' : 'rgba(251,113,133,0.7)' }}>
        {label}: {ready ? 'Configured ✓' : 'Key missing'}
      </span>
    </div>
  )
}

function readStoredFlag(key, fallback = false) {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  return value === null ? fallback : value === 'true'
}

export default function SettingsScreen() {
  const { lang, mode, switchLanguage, switchMode } = useAI()
  const [offlineMode, setOfflineMode] = useState(() => readStoredFlag('sahaay-offline-mode'))
  const [haptic, setHaptic] = useState(() => readStoredFlag('sahaay-haptic', true))

  useEffect(() => {
    announceScreen('Settings. Update language, default mode, and offline preferences.', lang)
  }, [lang])

  const geminiReady  = Boolean(import.meta.env.VITE_GEMINI_API_KEY)
  const groqReady    = Boolean(import.meta.env.VITE_GROQ_API_KEY)
  const whisperReady = Boolean(import.meta.env.VITE_OPENAI_API_KEY)

  const toggleFlag = (key, setter) => {
    setter(prev => {
      const next = !prev
      window.localStorage.setItem(key, String(next))
      return next
    })
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse 80% 40% at 50% 0%, rgba(129,140,248,0.09) 0%, transparent 55%),
        linear-gradient(180deg, #050B14 0%, #000000 100%)
      `,
      color: '#f0f6ff',
      fontFamily: 'var(--font-body)',
      padding: '0 0 60px',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 24px 0',
        maxWidth: 640, margin: '0 auto',
      }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(129,140,248,0.6)', marginBottom: 6 }}>
            Settings
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Make Sahaay fit you
          </h1>
        </div>
        <Link
          to="/app"
          aria-label="Return to the main orb screen"
          style={{
            padding: '10px 18px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(240,246,255,0.6)',
            textDecoration: 'none', fontSize: 14, fontWeight: 500,
          }}
        >
          ← Back
        </Link>
      </div>

      <div style={{ maxWidth: 640, margin: '28px auto 0', padding: '0 24px' }}>

        {/* Language */}
        <SectionCard title="Language" icon="🌐">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(LANG_LABELS).map(([code, label]) => (
              <ToggleChip
                key={code}
                label={label}
                active={lang === code}
                onClick={() => switchLanguage(code)}
                activeColor="#fbbf24"
                activeGlow="rgba(251,191,36,0.3)"
              />
            ))}
          </div>
        </SectionCard>

        {/* Default mode */}
        <SectionCard title="Default Mode" icon="🎯">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(MODE_LABELS).map(([key, label]) => (
              <ToggleChip
                key={key}
                label={label}
                active={mode === key}
                onClick={() => switchMode(key)}
                activeColor="#34d399"
                activeGlow="rgba(52,211,153,0.25)"
              />
            ))}
          </div>
        </SectionCard>

        {/* Preferences */}
        <SectionCard title="Preferences" icon="⚙">
          <div style={{ display: 'grid', gap: 12 }}>
            {/* Offline toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.025)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>Offline-first</div>
                <div style={{ fontSize: 13, color: 'rgba(240,246,255,0.4)', maxWidth: 280 }}>
                  Prefer local OCR and currency before cloud models
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag('sahaay-offline-mode', setOfflineMode)}
                aria-label={`Offline preference is ${offlineMode ? 'on' : 'off'}`}
                aria-pressed={offlineMode}
                style={{
                  width: 50, height: 28, borderRadius: 14, border: 'none',
                  background: offlineMode ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.12)',
                  cursor: 'pointer', transition: 'background 200ms ease',
                  position: 'relative', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 4,
                  left: offlineMode ? 26 : 4,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 200ms ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                }} />
              </button>
            </div>

            {/* Haptic toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.025)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>Haptic feedback</div>
                <div style={{ fontSize: 13, color: 'rgba(240,246,255,0.4)' }}>
                  Vibrate on orb tap and on response received
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag('sahaay-haptic', setHaptic)}
                aria-label={`Haptic feedback is ${haptic ? 'on' : 'off'}`}
                aria-pressed={haptic}
                style={{
                  width: 50, height: 28, borderRadius: 14, border: 'none',
                  background: haptic ? 'rgba(56,189,248,0.85)' : 'rgba(255,255,255,0.12)',
                  cursor: 'pointer', transition: 'background 200ms ease',
                  position: 'relative', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 4,
                  left: haptic ? 26 : 4,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 200ms ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                }} />
              </button>
            </div>
          </div>
        </SectionCard>

        {/* API readiness */}
        <SectionCard title="API Readiness" icon="🔑">
          <div style={{ display: 'grid', gap: 10 }}>
            <StatusDot ready={geminiReady}  label="Gemini Vision" />
            <StatusDot ready={groqReady}    label="Groq (Llama)" />
            <StatusDot ready={whisperReady} label="Whisper STT"  />
          </div>
          <p style={{ fontSize: 12, color: 'rgba(240,246,255,0.25)', marginTop: 14, lineHeight: 1.6 }}>
            4-provider cascade: Groq → Gemini → NVIDIA → Pollinations. If all keys are missing, Pollinations (free) is used as the final fallback.
          </p>
        </SectionCard>

      </div>
    </main>
  )
}
