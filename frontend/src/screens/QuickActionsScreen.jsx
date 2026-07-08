import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { announceScreen, speak } from '../utils/tts.js'

const ACTIONS = [
  {
    key: 'scene',
    icon: '🌐',
    label: 'Describe Scene',
    desc: 'Describe people, objects, and hazards around you.',
    color: '#38bdf8',
    glow: 'rgba(56,189,248,0.25)',
    gradient: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(29,78,216,0.08) 100%)',
  },
  {
    key: 'ocr',
    icon: '📄',
    label: 'Read Text',
    desc: 'Read signs, labels, and medicine instructions aloud.',
    color: '#818cf8',
    glow: 'rgba(129,140,248,0.25)',
    gradient: 'linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(79,70,229,0.08) 100%)',
  },
  {
    key: 'currency',
    icon: '💰',
    label: 'Identify Note',
    desc: 'Identify Indian rupee notes using the camera.',
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.25)',
    gradient: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(180,120,0,0.07) 100%)',
  },
  {
    key: 'face',
    icon: '👤',
    label: 'Face Mode',
    desc: 'Recognise a registered contact saved by your caregiver.',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.25)',
    gradient: 'linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(6,95,70,0.07) 100%)',
  },
]

export default function QuickActionsScreen() {
  const navigate  = useNavigate()
  const { switchMode, lang } = useAI()
  const [hovered, setHovered] = useState(null)
  const [sos, setSos] = useState(false)

  useEffect(() => {
    announceScreen('Quick actions. Choose scene, read, currency, face mode, or emergency.', lang)
  }, [lang])

  const chooseMode = (mode) => {
    switchMode(mode)
    navigate('/app')
  }

  const callEmergency = async () => {
    setSos(true)
    await speak('Calling emergency helpline one one two.', lang)
    window.location.href = 'tel:112'
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse 90% 50% at 50% 0%, rgba(56,189,248,0.07) 0%, transparent 55%),
        linear-gradient(180deg, #050B14 0%, #000000 100%)
      `,
      color: '#f0f6ff',
      fontFamily: 'var(--font-body)',
      padding: '0 0 48px',
    }}>
      <style>{`
        @keyframes qaFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .qa-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '28px 24px 0', maxWidth: 560, margin: '0 auto',
      }}>
        <div>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(56,189,248,0.55)', marginBottom: 8,
          }}>
            Quick Actions
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            What should Sahaay do?
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
            textDecoration: 'none', fontSize: 14, fontWeight: 500,
            flexShrink: 0,
          }}
        >
          ← Back
        </Link>
      </div>

      {/* Action grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 14,
        maxWidth: 560, margin: '28px auto 0',
        padding: '0 24px',
      }}>
        {ACTIONS.map((a, i) => (
          <button
            key={a.key}
            type="button"
            className="qa-card"
            onClick={() => chooseMode(a.key)}
            aria-label={`Activate ${a.label} mode`}
            onMouseEnter={() => setHovered(a.key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '22px 18px',
              borderRadius: 20,
              border: `1.5px solid ${hovered === a.key ? `${a.color}40` : 'rgba(255,255,255,0.07)'}`,
              background: hovered === a.key ? a.gradient : 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(16px)',
              textAlign: 'left', cursor: 'pointer',
              boxShadow: hovered === a.key ? `0 8px 28px ${a.glow}` : 'none',
              transition: 'all 200ms ease',
              animation: `qaFadeUp 0.4s ease-out ${i * 0.07}s both`,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>{a.icon}</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17, fontWeight: 700, color: hovered === a.key ? a.color : '#f0f6ff',
              marginBottom: 6, transition: 'color 200ms ease',
            }}>
              {a.label}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(240,246,255,0.4)', lineHeight: 1.55 }}>
              {a.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Emergency SOS — full width, prominent */}
      <div style={{ maxWidth: 560, margin: '14px auto 0', padding: '0 24px' }}>
        <button
          type="button"
          onClick={callEmergency}
          disabled={sos}
          aria-label="Call emergency helpline 112"
          style={{
            width: '100%', padding: '20px 24px',
            borderRadius: 20,
            border: '1.5px solid rgba(251,113,133,0.35)',
            background: sos
              ? 'rgba(251,113,133,0.2)'
              : 'linear-gradient(135deg, rgba(251,113,133,0.12) 0%, rgba(190,18,60,0.08) 100%)',
            backdropFilter: 'blur(16px)',
            color: '#fb7185',
            fontSize: 18, fontWeight: 700,
            textAlign: 'left', cursor: sos ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 16,
            transition: 'background 200ms ease',
            animation: 'qaFadeUp 0.4s ease-out 0.28s both',
          }}
        >
          <span style={{ fontSize: 36 }}>🆘</span>
          <span>
            <div>{sos ? 'Calling 112…' : 'Emergency — Call 112'}</div>
            <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(251,113,133,0.6)', marginTop: 4 }}>
              Speaks aloud then dials the helpline immediately.
            </div>
          </span>
        </button>
      </div>
    </main>
  )
}
