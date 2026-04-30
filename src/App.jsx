import { useEffect } from 'react'
import { useAI } from './hooks/useAI'

const STATUS_COLORS = {
  idle: '#1a1a2e',
  listening: '#e94560',
  thinking: '#f5a623',
  speaking: '#00d4aa',
  error: '#ff4444',
}

export default function App() {
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
    cameraReady,
    isRecording,
    micSupported,
  } = useAI()

  useEffect(() => {
    startCamera()
  }, [startCamera])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 20,
      }}
    >
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

      <div
        onClick={trigger}
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: STATUS_COLORS[status] || STATUS_COLORS.idle,
          cursor: 'pointer',
          transition: 'background 0.3s, transform 0.15s',
          transform: isRecording ? 'scale(1.15)' : 'scale(1)',
          boxShadow: `0 0 40px ${STATUS_COLORS[status]}66`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          userSelect: 'none',
        }}
      >
        {status}
      </div>

      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>
          Mode: {mode} | Lang: {lang} | Camera: {cameraReady ? '✓' : '…'} | Mic:{' '}
          {micSupported ? '✓' : '✗ (use Chrome)'}
        </p>
        {response && (
          <p
            style={{
              background: '#1a2a1a',
              border: '1px solid #2a4a2a',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {response}
          </p>
        )}
        {error && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</p>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {['scene', 'ocr', 'currency', 'face'].map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${mode === m ? '#00d4aa' : '#333'}`,
              background: mode === m ? '#00d4aa22' : 'transparent',
              color: mode === m ? '#00d4aa' : '#666',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {['en-IN', 'hi-IN', 'kn-IN'].map((l) => (
          <button
            key={l}
            onClick={() => switchLanguage(l)}
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${lang === l ? '#f5a623' : '#333'}`,
              background: lang === l ? '#f5a62322' : 'transparent',
              color: lang === l ? '#f5a623' : '#666',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#444' }}>Tap the orb to activate · Requires Chrome or Edge</p>
    </div>
  )
}
