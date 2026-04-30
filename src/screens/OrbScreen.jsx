import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { announceScreen } from '../utils/tts.js'

const STATUS_COPY = {
  idle: 'Tap the orb and ask Sahaay what is around you.',
  listening: 'Listening for your request.',
  thinking: 'Analysing the scene now.',
  speaking: 'Speaking the latest response.',
  error: 'There was a problem. Please try again.',
}

const STATUS_COLORS = {
  idle: '#203457',
  listening: '#dc4f6b',
  thinking: '#f4a933',
  speaking: '#19b28a',
  error: '#da4747',
}

const navButtonStyle = {
  minWidth: 140,
  minHeight: 80,
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f8fbff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  fontSize: 18,
  padding: '0 18px',
}

export default function OrbScreen() {
  const {
    status,
    response,
    error,
    mode,
    lang,
    trigger,
    switchMode,
    videoRef,
    startCamera,
    stopCamera,
    cameraReady,
    isRecording,
    isAnalyzing,
    micSupported,
  } = useAI()

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const [showHints, setShowHints] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    announceScreen(
      micSupported
        ? 'Sahaay is ready. Tap the orb and ask a question.'
        : 'Sahaay is ready. Speech recognition is limited here, but the camera assistant is still available.',
      lang
    )
  }, [lang, micSupported])

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top, #13345c 0%, #07111c 60%, #03070c 100%)',
        color: '#f8fbff',
        display: 'flex',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {isOffline && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: '#f4a933',
            color: '#1b1200',
            fontSize: 18,
            padding: '12px 24px',
          }}
        >
          No internet connection - scene and face modes need network access.
        </div>
      )}
      <style>{`
        @keyframes sahaayOrbListeningPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 18px rgba(220, 79, 107, 0.14), 0 18px 48px rgba(220, 79, 107, 0.42);
          }
          50% {
            transform: scale(1.12);
            box-shadow: 0 0 0 30px rgba(220, 79, 107, 0.08), 0 22px 60px rgba(220, 79, 107, 0.58);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 18px rgba(220, 79, 107, 0.14), 0 18px 48px rgba(220, 79, 107, 0.42);
          }
        }
      `}</style>
      <section style={{ width: '100%', maxWidth: 760, textAlign: 'center' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

        <p style={{ fontSize: 18, color: '#8cc8ff', marginBottom: 12 }}>
          Mode: {mode} | Language: {lang}
        </p>
        <h1 style={{ fontSize: 36, margin: '0 0 12px' }}>Sahaay Orb</h1>
        <p style={{ fontSize: 20, lineHeight: 1.6, color: '#d4e9ff', marginBottom: 32 }}>
          No menus, no clutter. Tap once, speak naturally, and let the camera answer back.
        </p>

        <button
          type="button"
          onClick={trigger}
          aria-label={`Activate Sahaay in ${mode} mode`}
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: 'none',
            background: STATUS_COLORS[status],
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 700,
            boxShadow: `0 0 0 18px ${STATUS_COLORS[status]}22, 0 18px 48px ${STATUS_COLORS[status]}55`,
            animation:
              status === 'listening' && !reducedMotion
                ? 'sahaayOrbListeningPulse 1.2s ease-in-out infinite'
                : 'none',
            transition: reducedMotion ? 'none' : 'box-shadow 180ms ease',
            cursor: 'pointer',
            marginBottom: 28,
          }}
        >
          {status}
        </button>

        <div
          aria-live="polite"
          style={{
            minHeight: 120,
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(5, 12, 20, 0.72)',
            padding: 24,
            textAlign: 'left',
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 18, color: '#9eb4ca', marginTop: 0 }}>
            {cameraReady ? 'Camera ready.' : 'Camera starting.'}{' '}
            {isAnalyzing ? 'Analysing now.' : STATUS_COPY[status]}
          </p>
          <p style={{ fontSize: 22, lineHeight: 1.7, margin: 0 }}>
            {response || error || 'Sahaay will speak the result aloud here after each request.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          {['scene', 'ocr', 'currency', 'face'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              aria-label={`Switch mode to ${value}`}
              style={{
                ...navButtonStyle,
                border: `1px solid ${mode === value ? '#19b28a' : 'rgba(255,255,255,0.12)'}`,
                background: mode === value ? 'rgba(25, 178, 138, 0.14)' : 'rgba(255,255,255,0.04)',
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {value}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
          <Link to="/actions" aria-label="Open quick actions" style={navButtonStyle}>
            Quick actions
          </Link>
          <Link to="/settings" aria-label="Open settings" style={navButtonStyle}>
            Settings
          </Link>
          <Link to="/caregiver" aria-label="Open caregiver dashboard" style={navButtonStyle}>
            Caregiver
          </Link>
          <Link to="/demo" aria-label="Open judge demo screen" style={navButtonStyle}>
            Demo
          </Link>
        </div>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowHints(!showHints)}
            aria-expanded={showHints}
            style={{
              minWidth: 180,
              minHeight: 56,
              fontSize: 18,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#f8fbff',
              cursor: 'pointer',
              borderRadius: 20,
            }}
          >
            {showHints ? 'Hide demo phrases' : 'Show demo phrases'}
          </button>
          
          {showHints && (
            <div
              role="region"
              aria-label="Demo phrase hints"
              style={{
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(5,12,20,0.80)',
                padding: '16px 20px',
                marginTop: 12,
                textAlign: 'left',
              }}
            >
              <h2 style={{ fontSize: 16, color: '#8cc8ff', marginTop: 0, marginBottom: 10 }}>Say one of these:</h2>
              <p style={{ fontSize: 17, color: '#d4e9ff', margin: '4px 0' }}>› "what do you see"</p>
              <p style={{ fontSize: 17, color: '#d4e9ff', margin: '4px 0' }}>› "what is in front"</p>
              <p style={{ fontSize: 17, color: '#d4e9ff', margin: '4px 0' }}>› "how much is this"</p>
              <p style={{ fontSize: 17, color: '#d4e9ff', margin: '4px 0' }}>› "which note"</p>
              <p style={{ fontSize: 17, color: '#d4e9ff', margin: '4px 0' }}>› "read this"</p>
              <p style={{ fontSize: 17, color: '#d4e9ff', margin: '4px 0' }}>› "what does it say"</p>
            </div>
          )}
        </div>

        <p style={{ fontSize: 18, color: '#9eb4ca', marginTop: 20 }}>
          Mic: {micSupported ? 'supported' : 'limited fallback mode'} | Camera:{' '}
          {cameraReady ? 'ready' : 'starting'}
        </p>
      </section>
    </main>
  )
}
