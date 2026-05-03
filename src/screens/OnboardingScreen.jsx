import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { announceScreen } from '../utils/tts.js'

const FEATURES = [
  { icon: '🌐', label: 'Scene AI',    desc: 'Describes your surroundings in natural language' },
  { icon: '📄', label: 'Text Reader', desc: 'Reads signs, labels, and documents aloud'         },
  { icon: '💰', label: 'Currency',    desc: 'Identifies Indian rupee notes instantly'           },
  { icon: '👤', label: 'Face Recog.', desc: 'Recognises registered friends and family'         },
]

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)

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
    <main style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse 120% 70% at 50% -10%, rgba(56,189,248,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 80% 50% at 80% 80%, rgba(129,140,248,0.08) 0%, transparent 50%),
        linear-gradient(180deg, #050B14 0%, #000000 100%)
      `,
      color: '#f0f6ff',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 20px 60px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes floatOrb {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-18px) scale(1.03); }
        }
        @keyframes onboardFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Decorative background blobs */}
      <div style={{
        position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Hero orb */}
      <div style={{
        marginTop: 72,
        width: 120, height: 120,
        borderRadius: '50%',
        background: `
          radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35) 0%, transparent 50%),
          radial-gradient(circle at 65% 70%, rgba(0,0,0,0.35) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, #38bdf8 0%, #1d4ed8 100%)
        `,
        boxShadow: '0 0 0 20px rgba(56,189,248,0.08), 0 24px 64px rgba(56,189,248,0.3)',
        animation: 'floatOrb 4s ease-in-out infinite',
        marginBottom: 36,
        flexShrink: 0,
      }} />

      {/* Brand + headline */}
      <div style={{ textAlign: 'center', maxWidth: 520, animation: 'onboardFadeUp 0.6s ease-out 0.1s both' }}>
        <p style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'rgba(56,189,248,0.65)',
          marginBottom: 14,
        }}>
          Sahaay AI · Voice-First Companion
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(30px, 6vw, 46px)',
          fontWeight: 800, lineHeight: 1.1,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #f0f6ff 0%, rgba(56,189,248,0.8) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 16,
        }}>
          The most intelligent interface is no interface at all.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(240,246,255,0.5)', marginBottom: 40 }}>
          Tap once, speak naturally, and let the camera answer back — in English, Hindi, or Kannada.
        </p>
      </div>

      {/* Feature chips */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12, width: '100%', maxWidth: 480,
        marginBottom: 40,
        animation: 'onboardFadeUp 0.6s ease-out 0.2s both',
      }}>
        {FEATURES.map((f) => (
          <div key={f.label} style={{
            padding: '14px 16px',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(240,246,255,0.4)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Primary CTAs */}
      <div style={{
        display: 'grid', gap: 14, width: '100%', maxWidth: 480,
        animation: 'onboardFadeUp 0.6s ease-out 0.3s both',
      }}>
        <button
          type="button"
          onClick={() => handleSelect('user', '/app')}
          aria-label="Start Sahaay as a visually impaired user"
          onMouseEnter={() => setHovered('user')}
          onMouseLeave={() => setHovered(null)}
          style={{
            padding: '22px 28px',
            borderRadius: 20,
            border: hovered === 'user' ? '1.5px solid rgba(56,189,248,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
            background: hovered === 'user'
              ? 'linear-gradient(135deg, rgba(56,189,248,0.18) 0%, rgba(29,78,216,0.14) 100%)'
              : 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
            color: '#f0f6ff',
            fontSize: 20, fontWeight: 700, textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span>
            <span style={{ fontSize: 28, marginRight: 14 }}>👁</span>
            I am visually impaired
          </span>
          <span style={{ fontSize: 22, color: 'rgba(56,189,248,0.6)' }}>→</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('caregiver', '/caregiver')}
          aria-label="Open caregiver setup and dashboard"
          onMouseEnter={() => setHovered('care')}
          onMouseLeave={() => setHovered(null)}
          style={{
            padding: '22px 28px',
            borderRadius: 20,
            border: hovered === 'care' ? '1.5px solid rgba(52,211,153,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
            background: hovered === 'care'
              ? 'rgba(52,211,153,0.1)'
              : 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(16px)',
            color: '#f0f6ff',
            fontSize: 20, fontWeight: 700, textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span>
            <span style={{ fontSize: 28, marginRight: 14 }}>🧡</span>
            Set up for someone
          </span>
          <span style={{ fontSize: 22, color: 'rgba(52,211,153,0.5)' }}>→</span>
        </button>
      </div>

      {/* Footer note */}
      <p style={{
        marginTop: 28, fontSize: 13,
        color: 'rgba(240,246,255,0.25)',
        textAlign: 'center', maxWidth: 380, lineHeight: 1.6,
        animation: 'onboardFadeUp 0.6s ease-out 0.4s both',
      }}>
        Best experience on Chrome or Edge with mic and camera permissions enabled.
      </p>
    </main>
  )
}
