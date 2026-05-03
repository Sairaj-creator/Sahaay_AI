import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { announceScreen } from '../utils/tts.js'

const STATUS_META = {
  idle:      { label: 'Idle',       color: '#38bdf8' },
  listening: { label: 'Listening…', color: '#fb7185' },
  thinking:  { label: 'Analysing…', color: '#fbbf24' },
  speaking:  { label: 'Speaking…',  color: '#34d399' },
  error:     { label: 'Error',      color: '#fb7185' },
}

const MODE_LABELS = { scene: '🌐 Scene', ocr: '📄 Read', currency: '💰 Currency', face: '👤 Face' }
const LANG_LABELS = { 'en-IN': '🇮🇳 EN', 'hi-IN': '🇮🇳 HI', 'kn-IN': '🇮🇳 KN' }

export default function DemoScreen() {
  const {
    status, response, error,
    mode, lang,
    trigger, switchMode, switchLanguage,
    videoRef, startCamera, stopCamera,
    cameraReady,
  } = useAI()

  const [isTriggering, setIsTriggering] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  useEffect(() => {
    announceScreen('Demo screen ready. Designed for judges and stage presentations.', lang)
  }, [lang])

  const handleTrigger = async () => {
    setIsTriggering(true)
    try { await trigger() }
    finally { setIsTriggering(false) }
  }

  const meta = STATUS_META[status] || STATUS_META.idle

  return (
    <main style={{
      minHeight: '100vh',
      background: '#000',
      color: '#f0f6ff',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes demoFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes demoPulse {
          0%, 100% { box-shadow: 0 0 0 0 ${meta.color}40; }
          50%       { box-shadow: 0 0 0 10px ${meta.color}00; }
        }
      `}</style>

      {/* Subtle top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(56,189,248,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Live status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 14px', borderRadius: 20,
            border: `1px solid ${meta.color}33`,
            background: `${meta.color}10`,
            animation: 'demoFadeIn 0.3s ease-out',
            transition: 'all 300ms ease',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: meta.color,
              animation: status !== 'idle' ? 'demoPulse 1.2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>
              {meta.label}
            </span>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(240,246,255,0.35)', marginBottom: 2 }}>
              Judge Demo View
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#f0f6ff' }}>
              Sahaay AI · Live Demo
            </h1>
          </div>
        </div>
        <Link
          to="/app"
          aria-label="Return to the main orb screen"
          style={{
            padding: '9px 16px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(240,246,255,0.55)',
            textDecoration: 'none', fontSize: 13, fontWeight: 500,
          }}
        >
          ← Back
        </Link>
      </div>

      {/* Main split layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1.4fr) minmax(260px, 1fr)',
        gap: 16,
        padding: '16px 24px',
        maxWidth: 1200, width: '100%', margin: '0 auto',
      }}>
        {/* Camera feed */}
        <div style={{
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#08111b',
          position: 'relative',
          minHeight: 280,
        }}>
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }}
          />
          {/* Camera status overlay */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: cameraReady ? '#34d399' : '#fbbf24',
              boxShadow: cameraReady ? '0 0 6px rgba(52,211,153,0.7)' : 'none',
            }} />
            <span style={{ fontSize: 12, color: 'rgba(240,246,255,0.7)', fontWeight: 500 }}>
              {cameraReady ? 'Camera live' : 'Starting…'}
            </span>
          </div>
          {/* Mode badge */}
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            padding: '5px 12px', borderRadius: 10,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            fontSize: 13, color: 'rgba(240,246,255,0.75)', fontWeight: 600,
          }}>
            {MODE_LABELS[mode]}
          </div>
        </div>

        {/* Response panel */}
        <div style={{
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(5,11,20,0.75)',
          backdropFilter: 'blur(20px)',
          padding: '20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {/* Response text area */}
          <div
            aria-live="polite"
            style={{
              flex: 1,
              minHeight: 160,
              maxHeight: 320,
              overflowY: 'auto',
              padding: '14px 14px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            {response ? (
              <div style={{ animation: 'demoFadeIn 0.35s ease-out' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.6)', marginBottom: 10 }}>
                  Sahaay says
                </p>
                <p style={{ fontSize: 18, lineHeight: 1.7, color: '#f0f6ff' }}>{response}</p>
              </div>
            ) : error ? (
              <p style={{ fontSize: 16, color: '#fb7185', lineHeight: 1.6 }}>⚠ {error}</p>
            ) : (
              <p style={{ fontSize: 15, color: 'rgba(240,246,255,0.25)', lineHeight: 1.6, paddingTop: 20, textAlign: 'center' }}>
                Trigger Sahaay to see live captions here.
              </p>
            )}
          </div>

          {/* Trigger button */}
          <button
            type="button"
            onClick={handleTrigger}
            disabled={isTriggering || (status !== 'idle' && status !== 'error')}
            aria-label={`Trigger demo request in ${mode} mode`}
            style={{
              padding: '16px 20px',
              borderRadius: 14, border: 'none',
              background: isTriggering || (status !== 'idle' && status !== 'error')
                ? 'rgba(52,211,153,0.3)'
                : 'rgba(52,211,153,0.9)',
              color: '#001a12',
              fontSize: 17, fontWeight: 800,
              cursor: isTriggering ? 'not-allowed' : 'pointer',
              transition: 'background 200ms ease',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            {status === 'listening' ? '🎙 Listening…'
              : status === 'thinking' ? '🧠 Analysing…'
              : status === 'speaking' ? '🔊 Speaking…'
              : '▶ Trigger Demo'}
          </button>
        </div>
      </div>

      {/* Mode and language controls */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Modes */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchMode(key)}
              aria-label={`Switch demo mode to ${key}`}
              aria-pressed={mode === key}
              style={{
                padding: '9px 16px', borderRadius: 10,
                border: mode === key ? '1.5px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.08)',
                background: mode === key ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
                color: mode === key ? '#34d399' : 'rgba(240,246,255,0.45)',
                fontSize: 14, fontWeight: mode === key ? 700 : 500,
                cursor: 'pointer', transition: 'all 180ms ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Languages */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(LANG_LABELS).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => switchLanguage(code)}
              aria-label={`Switch demo language to ${code}`}
              aria-pressed={lang === code}
              style={{
                padding: '9px 16px', borderRadius: 10,
                border: lang === code ? '1.5px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.08)',
                background: lang === code ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
                color: lang === code ? '#fbbf24' : 'rgba(240,246,255,0.4)',
                fontSize: 14, fontWeight: lang === code ? 700 : 500,
                cursor: 'pointer', transition: 'all 180ms ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
