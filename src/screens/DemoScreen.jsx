import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { announceScreen } from '../utils/tts.js'

export default function DemoScreen() {
  const {
    status,
    response,
    error,
    mode,
    lang,
    trigger,
    switchMode,
    switchLanguage,
    videoRef,
    startCamera,
    stopCamera,
    cameraReady,
  } = useAI()

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  useEffect(() => {
    announceScreen('Demo screen ready. This view is designed for judges and stage presentations.', lang)
  }, [lang])

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#05080d',
        color: '#f8fbff',
        padding: 24,
      }}
    >
      <section style={{ width: '100%', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 18, color: '#8cc8ff', marginBottom: 10 }}>Judge demo view</p>
            <h1 style={{ fontSize: 36, margin: 0 }}>Live camera plus spoken AI captions</h1>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 1fr)', gap: 20 }}>
          <div
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#09111b',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: 'block', aspectRatio: '16 / 9', objectFit: 'cover' }}
            />
          </div>

          <div
            style={{
              borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(9, 17, 27, 0.92)',
              padding: 24,
            }}
          >
            <p style={{ fontSize: 18, color: '#9eb4ca', marginTop: 0 }}>
              Status: {status} | Camera: {cameraReady ? 'ready' : 'starting'}
            </p>
            <div aria-live="polite" style={{ minHeight: 180 }}>
              <p style={{ fontSize: 18, color: '#8cc8ff' }}>Latest response</p>
              <p style={{ fontSize: 22, lineHeight: 1.7 }}>{response || error || 'Trigger Sahaay to see captions here.'}</p>
            </div>

            <button
              type="button"
              onClick={trigger}
              aria-label={`Trigger demo request in ${mode} mode`}
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
              }}
            >
              Trigger demo
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 20 }}>
          {['scene', 'ocr', 'currency', 'face'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              aria-label={`Switch demo mode to ${value}`}
              style={{
                minWidth: 140,
                minHeight: 80,
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.12)',
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
          {['en-IN', 'hi-IN', 'kn-IN'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchLanguage(value)}
              aria-label={`Switch demo language to ${value}`}
              style={{
                minWidth: 140,
                minHeight: 80,
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.12)',
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
    </main>
  )
}
