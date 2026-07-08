import { useEffect, useRef, useCallback, useState } from 'react'

// ── Command tables ─────────────────────────────────────────────
const WAKE_WORDS = [
  'sahaay', 'sahay', 'sahai', 'saha', 'sahaa', 'sahaj',
  'hey sahaay', 'hey sahay', 'hey saha',
  'start', 'activate', 'help me',
]

const MODE_COMMANDS = {
  scene:    ['switch to scene', 'switch scene', 'scene mode', 'scene', 'describe', 'surroundings'],
  ocr:      ['switch to read', 'switch read', 'read mode', 'read text', 'read', 'text mode'],
  currency: ['switch to currency', 'switch currency', 'currency mode', 'currency', 'money', 'rupee', 'note'],
  face:     ['switch to face', 'switch face', 'face mode', 'who is this', 'identify', 'face'],
}

const NAV_COMMANDS = {
  '/actions':   ['quick actions', 'go to actions', 'actions'],
  '/settings':  ['go to settings', 'open settings', 'settings'],
  '/caregiver': ['go to caregiver', 'care giver', 'caregiver'],
  '/demo':      ['go to demo', 'demo mode', 'demo'],
}

const ALL_MODE_ENTRIES = Object.entries(MODE_COMMANDS)
  .flatMap(([mode, phrases]) => phrases.map(p => ({ mode, phrase: p })))
  .sort((a, b) => b.phrase.length - a.phrase.length)

const ALL_NAV_ENTRIES = Object.entries(NAV_COMMANDS)
  .flatMap(([route, phrases]) => phrases.map(p => ({ route, phrase: p })))
  .sort((a, b) => b.phrase.length - a.phrase.length)

function classify(text) {
  for (const { mode, phrase } of ALL_MODE_ENTRIES) {
    if (text.includes(phrase)) return { type: 'mode', mode }
  }
  for (const { route, phrase } of ALL_NAV_ENTRIES) {
    if (text.includes(phrase)) return { type: 'nav', route }
  }
  for (const w of WAKE_WORDS) {
    if (text.includes(w)) return { type: 'wake' }
  }
  return null
}

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useWakeWord({ onWake, onMode, onNavigate, lang = 'en-IN', enabled = true }) {
  const [active, setActive]       = useState(false)
  const [lastHeard, setLastHeard] = useState('')

  const recRef     = useRef(null)
  const timerRef   = useRef(null)
  const cbRef      = useRef({ onWake, onMode, onNavigate })
  const enabledRef = useRef(enabled)
  const firedRef   = useRef(false)   // true while waiting for mic to release after a command

  useEffect(() => { cbRef.current = { onWake, onMode, onNavigate } }, [onWake, onMode, onNavigate])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const stop = useCallback(() => {
    clearTimeout(timerRef.current)
    enabledRef.current = false
    firedRef.current   = false
    if (recRef.current) {
      try { recRef.current.abort() } catch (_) {}
      recRef.current = null
    }
    setActive(false)
  }, [])

  const start = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionCtor()
    // Don't start if disabled, already running, or waiting for mic to release
    if (!SpeechRecognition || !enabledRef.current || recRef.current || firedRef.current) return

    const rec = new SpeechRecognition()
    rec.lang            = lang
    rec.continuous      = true
    rec.interimResults  = true
    rec.maxAlternatives = 3

    recRef.current = rec
    rec.onstart = () => setActive(true)

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const texts = Array.from(
          { length: e.results[i].length },
          (_, k) => e.results[i][k].transcript.toLowerCase().trim()
        ).filter(Boolean)

        if (!texts.length) continue
        setLastHeard(texts[0])

        const match = texts.reduce((found, t) => found || classify(t), null)
        if (!match) continue

        // Block any restart before we hand the mic to the caller
        firedRef.current = true
        enabledRef.current = false
        setActive(false)

        // Tear down this session
        recRef.current = null
        try { rec.abort() } catch (_) {}

        // Capture callbacks now (cbRef is always current)
        const { onWake: wake, onMode: mode, onNavigate: nav } = cbRef.current

        // Small delay so Chrome fully releases mic hardware before caller acquires it
        setTimeout(() => {
          firedRef.current   = false
          enabledRef.current = true   // restore so start() guard passes

          if (match.type === 'wake') wake?.()
          if (match.type === 'mode') mode?.(match.mode)
          if (match.type === 'nav')  nav?.(match.route)

          // Restart recognition after dispatch.
          // For wake/nav commands the component may navigate away; stop() will have
          // already set enabledRef.current = false by then, making start() a no-op.
          timerRef.current = setTimeout(start, 150)
        }, 200)
        return
      }
    }

    rec.onend = () => {
      // Only restart if nobody fired a command
      if (recRef.current === rec) recRef.current = null
      setActive(false)
      if (enabledRef.current && !firedRef.current) {
        timerRef.current = setTimeout(start, 400)
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') return
      if (recRef.current === rec) recRef.current = null
      setActive(false)
      if (enabledRef.current && !firedRef.current && e.error !== 'aborted') {
        timerRef.current = setTimeout(start, 1000)
      }
    }

    try {
      rec.start()
    } catch (_) {
      recRef.current = null
    }
  }, [lang])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      start()
    } else {
      stop()
    }
    return stop
  }, [enabled, start, stop])

  return { active, lastHeard }
}
