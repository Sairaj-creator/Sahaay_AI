import { useEffect } from 'react'
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

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

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
            transform: reducedMotion ? 'scale(1)' : isRecording ? 'scale(1.06)' : 'scale(1)',
            transition: reducedMotion ? 'none' : 'transform 180ms ease, box-shadow 180ms ease',
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

        <p style={{ fontSize: 18, color: '#9eb4ca', marginTop: 20 }}>
          Mic: {micSupported ? 'supported' : 'limited fallback mode'} | Camera:{' '}
          {cameraReady ? 'ready' : 'starting'}
        </p>
      </section>
    </main>
  )
}
