import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { announceScreen } from '../utils/tts.js'

/* ── Status metadata ──────────────────────────────────────── */
const STATUS_META = {
  idle:      { label: 'Tap to Start',     emoji: '👁',  color: '#38bdf8', glow: 'rgba(56,189,248,0.35)'  },
  listening: { label: 'Listening…',       emoji: '🎙',  color: '#fb7185', glow: 'rgba(251,113,133,0.45)' },
  thinking:  { label: 'Analysing Scene…', emoji: '🧠',  color: '#fbbf24', glow: 'rgba(251,191,36,0.45)'  },
  speaking:  { label: 'Speaking…',        emoji: '🔊',  color: '#34d399', glow: 'rgba(52,211,153,0.45)'  },
  error:     { label: 'Try Again',        emoji: '⚠',   color: '#fb7185', glow: 'rgba(251,113,133,0.45)' },
}

const MODE_META = {
  scene:    { icon: '🌐', label: 'Scene',    desc: 'Describe surroundings'  },
  ocr:      { icon: '📄', label: 'Read',     desc: 'Read text aloud'        },
  currency: { icon: '💰', label: 'Currency', desc: 'Identify banknote'      },
  face:     { icon: '👤', label: 'Face',     desc: 'Recognise person'       },
}

/* ── Mic waveform bars ────────────────────────────────────── */
function MicWaveform({ active }) {
  const bars = [1, 1.8, 2.5, 1.6, 3, 1.4, 2.2, 1.9, 2.8, 1.3]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: active ? 'rgba(251,113,133,0.9)' : 'rgba(255,255,255,0.15)',
            height: active ? undefined : 6,
            transformOrigin: 'bottom',
            animation: active
              ? `waveAnim${i % 4} ${0.4 + i * 0.07}s ease-in-out infinite alternate`
              : 'none',
            minHeight: active ? 6 : 6,
            maxHeight: active ? 32 : 6,
            transition: 'background 0.3s ease',
          }}
        />
      ))}
      <style>{`
        @keyframes waveAnim0 { from{height:6px} to{height:26px} }
        @keyframes waveAnim1 { from{height:8px} to{height:32px} }
        @keyframes waveAnim2 { from{height:5px} to{height:20px} }
        @keyframes waveAnim3 { from{height:7px} to{height:28px} }
      `}</style>
    </div>
  )
}

/* ── 3-D Orb ──────────────────────────────────────────────── */
function Orb3D({ status, onClick, disabled, reducedMotion }) {
  const meta = STATUS_META[status] || STATUS_META.idle

  const animMap = {
    idle:      reducedMotion ? 'none' : 'orbIdleBreathe 3s ease-in-out infinite',
    listening: reducedMotion ? 'none' : 'orbListeningPulse 1.1s ease-in-out infinite',
    thinking:  reducedMotion ? 'none' : 'orbThinkingRotate 2.4s linear infinite',
    speaking:  reducedMotion ? 'none' : 'orbSpeakingBounce 0.55s ease-in-out infinite',
    error:     'none',
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* outer halo rings */}
      <div style={{
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: '50%',
        border: `1px solid ${meta.color}22`,
        animation: reducedMotion ? 'none' : 'glowPulse 2.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: '50%',
        border: `1px solid ${meta.color}33`,
        animation: reducedMotion ? 'none' : 'glowPulse 2.5s ease-in-out infinite 0.4s',
        pointerEvents: 'none',
      }} />

      {/* spinning gradient ring (thinking) */}
      {status === 'thinking' && (
        <div style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, transparent 0%, ${meta.color} 40%, transparent 60%)`,
          animation: 'spinRing 1.5s linear infinite',
          opacity: 0.6,
          pointerEvents: 'none',
        }} />
      )}

      {/* core button */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={`Sahaay — ${meta.label}`}
        style={{
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          animation: animMap[status] || 'none',
          boxShadow: `0 0 0 18px ${meta.glow.replace('0.45', '0.1')}, 0 20px 60px ${meta.glow}`,
          transition: 'box-shadow 300ms ease',
          /* simulated 3-D sphere via nested radial gradients */
          background: `
            radial-gradient(circle at 38% 32%, rgba(255,255,255,0.38) 0%, transparent 52%),
            radial-gradient(circle at 65% 68%, rgba(0,0,0,0.4) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, ${meta.color} 0%, color-mix(in srgb, ${meta.color} 60%, #000) 100%)
          `,
        }}
      >
        {/* inner gloss shimmer */}
        <div style={{
          position: 'absolute',
          top: '12%',
          left: '18%',
          width: '36%',
          height: '28%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* emoji icon */}
        <span style={{ fontSize: 54, lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
          {meta.emoji}
        </span>
      </button>
    </div>
  )
}

/* ── Caption bubble ───────────────────────────────────────── */
function ChatBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeSlideUp 0.3s ease-out',
      marginBottom: 12,
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: isUser ? 'rgba(251,113,133,0.7)' : 'rgba(52,211,153,0.7)',
        marginBottom: 4,
        paddingLeft: isUser ? 0 : 4,
        paddingRight: isUser ? 4 : 0,
      }}>
        {isUser ? 'You said' : 'Sahaay'}
      </span>
      <div style={{
        maxWidth: '85%',
        padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? 'rgba(251,113,133,0.1)'
          : 'rgba(52,211,153,0.08)',
        border: `1px solid ${isUser ? 'rgba(251,113,133,0.2)' : 'rgba(52,211,153,0.18)'}`,
        fontSize: 16,
        lineHeight: 1.65,
        color: '#f0f6ff',
        wordBreak: 'break-word',
      }}>
        {text}
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */
export default function OrbScreen() {
  const {
    status, response, error, mode, lang,
    trigger, cancel, switchMode,
    videoRef, startCamera, stopCamera, cameraReady,
    isRecording, isAnalyzing, micSupported,
    transcript: aiTranscript,
  } = useAI()

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  const [chatLog, setChatLog] = useState([])
  const [showHints, setShowHints] = useState(false)
  const [sttError, setSttError] = useState(null)

  // Push transcript to chat log when AI returns one
  const prevTranscriptRef = useRef('')
  useEffect(() => {
    if (aiTranscript && aiTranscript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = aiTranscript
      setChatLog(prev => [...prev, { role: 'user', text: aiTranscript }])
    }
  }, [aiTranscript])

  const captionEndRef = useRef(null)
  const prevStatusRef = useRef(status)
  const prevResponseRef = useRef(response)

  // Camera
  useEffect(() => { startCamera(); return () => stopCamera() }, [startCamera, stopCamera])

  // Network
  useEffect(() => {
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Announce
  useEffect(() => {
    announceScreen(
      micSupported
        ? 'Sahaay is ready. Tap the orb and ask a question.'
        : 'Sahaay is ready. Camera assistant is available.',
      lang
    )
  }, [lang, micSupported])

  // Build chat log from status transitions
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    // When a new response appears, push Sahaay bubble
    if (response && response !== prevResponseRef.current) {
      prevResponseRef.current = response
      setChatLog(prev => [...prev, { role: 'sahaay', text: response }])
    }
  }, [status, response])

  // Reset STT error on each new trigger
  const handleTrigger = useCallback(async () => {
    setSttError(null)
    await trigger()
  }, [trigger])

  // Auto-scroll caption pane
  useEffect(() => {
    captionEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog, sttError])

  // If error appears, push to chat log
  useEffect(() => {
    if (error) {
      setChatLog(prev => [...prev, { role: 'sahaay', text: `⚠ ${error}` }])
    }
  }, [error])

  const meta = STATUS_META[status] || STATUS_META.idle
  const isActive = status !== 'idle' && status !== 'error'

  // ── Background radial based on status ──
  const bgGradient = `
    radial-gradient(ellipse 80% 60% at 50% 0%, ${meta.glow.replace('0.45', '0.12')} 0%, transparent 60%),
    radial-gradient(ellipse 120% 90% at 50% 100%, rgba(5,11,20,0.9) 0%, transparent 80%),
    radial-gradient(circle at 15% 50%, rgba(129,140,248,0.06) 0%, transparent 40%),
    linear-gradient(180deg, #050B14 0%, #000000 100%)
  `

  return (
    <main style={{
      minHeight: '100vh',
      background: bgGradient,
      color: '#f0f6ff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'var(--font-body)',
      paddingBottom: 160, /* room for fixed nav */
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 600ms ease',
    }}>
      {/* hidden camera feed */}
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

      {/* ── Offline toast ── */}
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: 'rgba(251,191,36,0.95)', color: '#1c1200',
          fontSize: 15, fontWeight: 600,
          padding: '12px 20px', textAlign: 'center',
          backdropFilter: 'blur(8px)',
          animation: 'toastIn 0.35s ease-out',
        }}>
          📡 No internet — Scene and Face modes need network access.
        </div>
      )}

      {/* ── Header ── */}
      <header style={{
        width: '100%', maxWidth: 480,
        padding: '48px 24px 0',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px',
          borderRadius: 'var(--r-full)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 13, color: 'rgba(255,255,255,0.5)',
          marginBottom: 20, letterSpacing: '0.05em',
          fontWeight: 500,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: cameraReady ? '#34d399' : '#fbbf24', display: 'inline-block' }} />
          {cameraReady ? 'Camera ready' : 'Camera starting…'} · {mode.toUpperCase()} mode
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 38, fontWeight: 800,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #f0f6ff 0%, rgba(56,189,248,0.85) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 8,
        }}>
          Sahaay AI
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(240,246,255,0.45)', lineHeight: 1.5 }}>
          Voice-first companion for the visually impaired
        </p>
      </header>

      {/* ── Orb section ── */}
      <section style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20,
        padding: '40px 24px 0',
        width: '100%', maxWidth: 480,
      }}>
        <Orb3D
          status={status}
          onClick={handleTrigger}
          disabled={isActive}
          reducedMotion={reducedMotion}
        />

        {/* Status label */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18, fontWeight: 600,
          color: meta.color,
          letterSpacing: '0.02em',
          transition: 'color 400ms ease',
          minHeight: 28,
        }}>
          {meta.label}
        </div>

        {/* Mic waveform */}
        {status === 'listening' && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>
            <MicWaveform active={isRecording} />
            <p style={{ fontSize: 13, color: 'rgba(251,113,133,0.7)', textAlign: 'center', marginTop: 6 }}>
              {isRecording ? 'Mic active — speak now' : 'Processing audio…'}
            </p>
          </div>
        )}

        {/* STT empty-string explicit error */}
        {sttError && (
          <div style={{
            padding: '10px 18px',
            borderRadius: 'var(--r-md)',
            background: 'rgba(251,113,133,0.08)',
            border: '1px solid rgba(251,113,133,0.25)',
            fontSize: 14, color: '#fb7185',
            animation: 'fadeSlideUp 0.3s ease-out',
            textAlign: 'center',
          }}>
            🎙 {sttError}
          </div>
        )}

        {/* Cancel button */}
        {isActive && (
          <button
            type="button"
            onClick={cancel}
            aria-label="Stop current action"
            style={{
              padding: '10px 28px',
              borderRadius: 'var(--r-full)',
              border: '1.5px solid rgba(251,113,133,0.4)',
              background: 'rgba(251,113,133,0.08)',
              color: '#fb7185',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              animation: 'fadeSlideUp 0.25s ease-out',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,113,133,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,113,133,0.08)'}
          >
            ■ Stop
          </button>
        )}
      </section>

      {/* ── Caption / Chat panel ── */}
      <section style={{
        width: '100%', maxWidth: 480,
        margin: '28px 24px 0',
        padding: '0 24px',
      }}>
        <div
          aria-live="polite"
          aria-label="Sahaay conversation transcript"
          style={{
            minHeight: 160,
            maxHeight: 280,
            overflowY: 'auto',
            borderRadius: 'var(--r-xl)',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(5,11,20,0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '18px 18px 12px',
            scrollBehavior: 'smooth',
          }}
        >
          {chatLog.length === 0 ? (
            <p style={{ fontSize: 15, color: 'rgba(240,246,255,0.3)', textAlign: 'center', paddingTop: 40 }}>
              Tap the orb and ask Sahaay anything about your surroundings.
            </p>
          ) : (
            chatLog.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} text={msg.text} />
            ))
          )}
          <div ref={captionEndRef} />
        </div>
      </section>

      {/* ── Demo hints ── */}
      <section style={{ width: '100%', maxWidth: 480, padding: '16px 24px 0' }}>
        <button
          type="button"
          onClick={() => setShowHints(h => !h)}
          aria-expanded={showHints}
          style={{
            width: '100%',
            padding: '12px 18px',
            borderRadius: 'var(--r-lg)',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(240,246,255,0.5)',
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span>💬 Demo voice phrases</span>
          <span style={{ transition: 'transform 0.2s', transform: showHints ? 'rotate(180deg)' : 'none' }}>⌄</span>
        </button>

        {showHints && (
          <div role="region" aria-label="Demo phrase hints" style={{
            marginTop: 8,
            borderRadius: 'var(--r-lg)',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(5,11,20,0.7)',
            backdropFilter: 'blur(16px)',
            padding: '14px 18px',
            animation: 'fadeSlideUp 0.2s ease-out',
          }}>
            {[
              '"What do you see?"',
              '"What is in front of me?"',
              '"How much is this note?"',
              '"Which currency note?"',
              '"Read this for me."',
              '"Who is in front of me?"',
            ].map((phrase, i) => (
              <p key={i} style={{ fontSize: 14, color: 'rgba(240,246,255,0.6)', margin: '5px 0', fontFamily: 'var(--font-body)' }}>
                › {phrase}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* ── Mode selector + Nav — fixed bottom ── */}
      <nav
        aria-label="Mode and navigation"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 100,
          background: 'rgba(5,11,20,0.85)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '14px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Mode pills */}
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480, justifyContent: 'center' }}>
          {Object.entries(MODE_META).map(([key, m]) => {
            const active = mode === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                aria-label={`Switch to ${m.label} mode — ${m.desc}`}
                aria-pressed={active}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  borderRadius: 'var(--r-md)',
                  border: active ? `1.5px solid ${meta.color}55` : '1px solid rgba(255,255,255,0.07)',
                  background: active ? `${meta.color}15` : 'rgba(255,255,255,0.03)',
                  color: active ? meta.color : 'rgba(240,246,255,0.45)',
                  fontSize: 11, fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 200ms ease',
                  lineHeight: 1.3,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 2 }}>{m.icon}</div>
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480, justifyContent: 'center' }}>
          {[
            { to: '/actions',   label: '⚡ Actions'  },
            { to: '/settings',  label: '⚙ Settings'  },
            { to: '/caregiver', label: '🧡 Caregiver' },
            { to: '/demo',      label: '🎬 Demo'      },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                flex: 1,
                padding: '9px 4px',
                borderRadius: 'var(--r-md)',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.025)',
                color: 'rgba(240,246,255,0.4)',
                textDecoration: 'none',
                fontSize: 11, fontWeight: 500,
                textAlign: 'center',
                letterSpacing: '0.01em',
                transition: 'background 150ms ease, color 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(240,246,255,0.8)' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.025)'; e.currentTarget.style.color='rgba(240,246,255,0.4)' }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Status strip */}
        <p style={{
          fontSize: 12, color: 'rgba(240,246,255,0.22)',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.04em',
        }}>
          Mic: {micSupported ? '✓ supported' : '⚠ limited'} · Camera: {cameraReady ? '✓ ready' : '… starting'} · Lang: {lang}
        </p>
      </nav>
    </main>
  )
}
