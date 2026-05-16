import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWakeWord } from '../hooks/useWakeWord'

export default function LandingScreen() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [wakeEnabled, setWakeEnabled] = useState(() => {
    try { return localStorage.getItem('sahaay-wake-word') !== 'off' } catch { return true }
  })

  const { active: wakeListening, lastHeard } = useWakeWord({
    onWake: () => navigate('/app'),
    lang: 'en-IN',
    enabled: wakeEnabled,
  })

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050B14',
      color: '#f0f6ff',
      fontFamily: 'var(--font-body), system-ui, sans-serif',
      overflowX: 'hidden',
    }}>
      {/* Dynamic Background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: `
          radial-gradient(circle at 15% 50%, rgba(56,189,248,0.08) 0%, transparent 40%),
          radial-gradient(circle at 85% 30%, rgba(129,140,248,0.1) 0%, transparent 40%),
          radial-gradient(ellipse 100% 50% at 50% 100%, rgba(15,23,42,0.8) 0%, transparent 60%)
        `,
        zIndex: 0, pointerEvents: 'none',
      }} />

      {/* Navigation Bar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        padding: '20px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: scrolled ? 'rgba(5, 11, 20, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
        transition: 'all 0.3s ease',
        zIndex: 50,
      }}>
        <div style={{
          fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #f0f6ff 0%, #38bdf8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Sahaay AI
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/caregiver" style={{
            color: 'rgba(240,246,255,0.6)', textDecoration: 'none', fontSize: 15, fontWeight: 500,
            transition: 'color 0.2s'
          }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(240,246,255,0.6)'}>
            Caregiver Portal
          </Link>
          <button onClick={() => navigate('/app')} style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: 'linear-gradient(135deg, #38bdf8 0%, #1d4ed8 100%)',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(56,189,248,0.25)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(56,189,248,0.4)' }}
             onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(56,189,248,0.25)' }}>
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{
        position: 'relative', zIndex: 10,
        padding: '160px 20px 80px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        maxWidth: 1000, margin: '0 auto',
      }}>
        <style>{`
          @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spinSlow { 100% { transform: rotate(360deg); } }
          @keyframes glowPulse { 0%,100% { opacity: 1; box-shadow: 0 0 6px 2px rgba(56,189,248,0.6); } 50% { opacity: 0.6; box-shadow: 0 0 2px 1px rgba(56,189,248,0.2); } }
        `}</style>
        
        {/* Floating AI Orb */}
        <div style={{
          width: 140, height: 140, borderRadius: '50%', marginBottom: 40,
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), transparent 60%), radial-gradient(circle at 70% 70%, rgba(56,189,248,0.5), transparent 60%), #1d4ed8',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.1) inset, 0 20px 60px rgba(56,189,248,0.4), 0 0 100px rgba(129,140,248,0.3)',
          animation: 'slideUp 0.8s ease-out, floatOrb 5s ease-in-out infinite',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
            borderRadius: '50%', border: '1px solid rgba(56,189,248,0.2)',
            animation: 'spinSlow 10s linear infinite', borderTopColor: 'rgba(56,189,248,0.8)',
          }} />
        </div>

        <div style={{ animation: 'slideUp 0.8s ease-out 0.1s both' }}>
          <div style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: 100,
            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
            color: '#38bdf8', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 24,
          }}>
            Vision meets Voice
          </div>
        </div>

        <h1 style={{
          fontSize: 'clamp(44px, 8vw, 76px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em',
          background: 'linear-gradient(to right bottom, #ffffff 0%, #a5b4fc 50%, #38bdf8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 24, animation: 'slideUp 0.8s ease-out 0.2s both',
          maxWidth: 800,
        }}>
          See the world through sound.
        </h1>

        <p style={{
          fontSize: 'clamp(18px, 3vw, 22px)', color: 'rgba(240,246,255,0.6)', lineHeight: 1.6,
          maxWidth: 680, marginBottom: 48, animation: 'slideUp 0.8s ease-out 0.3s both',
        }}>
          Sahaay is an intelligent, voice-first companion designed to help the visually impaired navigate their surroundings, read text, and recognize faces—all without touching the screen.
        </p>

        <div style={{
          display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center',
          animation: 'slideUp 0.8s ease-out 0.4s both',
        }}>
          <button onClick={() => navigate('/app')} style={{
            padding: '18px 40px', borderRadius: 100, border: 'none',
            background: '#fff', color: '#050B14',
            fontSize: 18, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(255,255,255,0.2)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12,
          }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.3)' }}
             onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,255,255,0.2)' }}>
            Start Using Sahaay <span style={{ fontSize: 24 }}>→</span>
          </button>

          {/* ── Voice trigger status ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                aria-live="polite"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 100,
                  background: wakeListening ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${wakeListening ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  fontSize: 14,
                  color: wakeListening ? 'rgba(56,189,248,0.9)' : 'rgba(240,246,255,0.4)',
                  transition: 'all 400ms ease',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: wakeListening ? '#38bdf8' : 'rgba(255,255,255,0.2)',
                  animation: wakeListening ? 'glowPulse 1.8s ease-in-out infinite' : 'none',
                }} />
                {wakeListening ? 'Say "Sahaay" to launch' : wakeEnabled ? 'Starting mic…' : 'Voice trigger off'}
              </div>

              <button
                type="button"
                onClick={() => setWakeEnabled(v => {
                  const next = !v
                  try { localStorage.setItem('sahaay-wake-word', next ? 'on' : 'off') } catch {}
                  return next
                })}
                aria-label={wakeEnabled ? 'Turn voice trigger off' : 'Turn voice trigger on'}
                aria-pressed={wakeEnabled}
                style={{
                  padding: '8px 14px', borderRadius: 100, cursor: 'pointer',
                  border: `1px solid ${wakeEnabled ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  background: wakeEnabled ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)',
                  color: wakeEnabled ? '#38bdf8' : 'rgba(240,246,255,0.45)',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
                  transition: 'all 250ms ease',
                }}
              >
                {wakeEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {wakeListening && lastHeard && (
              <p style={{ fontSize: 11, fontStyle: 'italic', color: 'rgba(240,246,255,0.25)', margin: 0 }}>
                heard: "{lastHeard}"
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section style={{
        position: 'relative', zIndex: 10,
        padding: '80px 20px 120px',
        maxWidth: 1200, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24,
      }}>
        {[
          { title: 'Scene Description', icon: '🌐', color: '#38bdf8', desc: 'Instantly understand what is in front of you. Sahaay analyzes your camera feed and describes the scene aloud.' },
          { title: 'Text Reader (OCR)', icon: '📄', color: '#a5b4fc', desc: 'Point your camera at any document, sign, or label, and Sahaay will read the text out to you in your preferred language.' },
          { title: 'Currency Detection', icon: '💰', color: '#34d399', desc: 'Hold up an Indian Rupee note, and our custom AI model will instantly tell you its denomination.' },
          { title: 'Face Recognition', icon: '👤', color: '#fb7185', desc: 'Register friends and family members. Sahaay will alert you when it recognizes someone you know.' }
        ].map((feature, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 24, padding: 32,
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            transition: 'transform 0.3s, background 0.3s',
            cursor: 'default',
          }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
             onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: `${feature.color}15`,
              color: feature.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 24, border: `1px solid ${feature.color}30`
            }}>
              {feature.icon}
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#fff' }}>{feature.title}</h3>
            <p style={{ fontSize: 15, color: 'rgba(240,246,255,0.5)', lineHeight: 1.6 }}>{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 20px', borderTop: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center', color: 'rgba(240,246,255,0.4)', fontSize: 14,
      }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', gap: 24 }}>
          <Link to="/app" style={{ color: 'inherit', textDecoration: 'none' }}>App</Link>
          <Link to="/caregiver" style={{ color: 'inherit', textDecoration: 'none' }}>Caregiver</Link>
          <Link to="/settings" style={{ color: 'inherit', textDecoration: 'none' }}>Settings</Link>
          <Link to="/demo" style={{ color: 'inherit', textDecoration: 'none' }}>Demo</Link>
        </div>
        © {new Date().getFullYear()} Sahaay AI. Built for accessibility.
      </footer>
    </div>
  )
}
