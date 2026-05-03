import { useState, useCallback, useRef } from 'react'
import { useMic } from './useMic.js'
import { useVision } from './useVision.js'
import { speak, stopSpeaking } from '../utils/tts.js'
import { checkDemoScript } from '../utils/prompts.js'
import { loadLocalFaces } from '../utils/faceMatch.js'

const VALID_MODES = ['scene', 'ocr', 'currency', 'face']
const VALID_LANGS = ['en-IN', 'hi-IN', 'kn-IN']
const SAFETY_TIMEOUT_MS = 15000
const STORAGE_KEYS = {
  mode: 'sahaay-mode',
  lang: 'sahaay-lang',
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''
const LANGUAGE_ANNOUNCEMENTS = {
  'en-IN': { text: 'Language switched to English.', lang: 'en-IN' },
  'hi-IN': { text: 'भाषा हिंदी में बदल दी गई।', lang: 'hi-IN' },
  'kn-IN': { text: 'ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.', lang: 'kn-IN' },
}

function getStoredChoice(key, fallback, validValues) {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  return validValues.includes(value) ? value : fallback
}

function setStoredChoice(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

function apiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

export function useAI() {
  const [status, setStatus] = useState('idle')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [mode, setMode] = useState(() => getStoredChoice(STORAGE_KEYS.mode, 'scene', VALID_MODES))
  const [lang, setLang] = useState(() => getStoredChoice(STORAGE_KEYS.lang, 'en-IN', VALID_LANGS))

  const mic = useMic()
  const vision = useVision()
  const timeoutRef = useRef(null)
  const isActiveRef = useRef(false)
  const abortRef = useRef(null)

  const clearSafetyTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    if (!isActiveRef.current) return
    // Abort any in-flight fetch
    abortRef.current?.abort()
    abortRef.current = null
    clearSafetyTimeout()
    mic.stopRecording()
    stopSpeaking()
    isActiveRef.current = false
    setStatus('idle')
  }, [clearSafetyTimeout, mic])

  const trigger = useCallback(async () => {
    if (isActiveRef.current) return

    isActiveRef.current = true
    abortRef.current = new AbortController()
    clearSafetyTimeout()
    setError(null)
    setResponse(null)

    timeoutRef.current = setTimeout(() => {
      setStatus('idle')
      isActiveRef.current = false
      speak('Sorry, that took too long. Please try again.', lang)
    }, SAFETY_TIMEOUT_MS)

    try {
      setStatus('listening')
      let rawTranscript = ''
      let micFailed = false

      try {
        rawTranscript = await mic.startRecording(lang)
      } catch (micError) {
        micFailed = true
        console.warn('Mic failed, continuing without voice:', micError.message)
      }

      // Expose transcript for UI chat log
      setTranscript(rawTranscript)

      // Guard: if STT returned empty with no mic exception, warn user explicitly
      if (!rawTranscript.trim() && !micFailed) {
        clearSafetyTimeout()
        const notHeard = 'Could not hear you. Please speak closer to the mic and try again.'
        setError(notHeard)
        setStatus('error')
        await speak(notHeard, lang)
        setTimeout(() => setStatus('idle'), 2500)
        isActiveRef.current = false
        return
      }

      const demoResponse = checkDemoScript(rawTranscript)
      if (demoResponse) {
        clearSafetyTimeout()
        setStatus('speaking')
        setResponse(demoResponse)
        await speak(demoResponse, lang)
        setStatus('idle')
        isActiveRef.current = false
        return
      }

      setStatus('thinking')
      const contacts = mode === 'face' ? await fetchRegisteredFaces() : []
      const result = await vision.analyzeFrame(mode, contacts, lang, rawTranscript)

      clearSafetyTimeout()
      setStatus('speaking')
      setResponse(result)
      await speak(result, lang)

      logQuery({ transcript: rawTranscript, response: result, mode }).catch(() => {})

      setStatus('idle')
    } catch (err) {
      clearSafetyTimeout()
      const message = err.message || 'Something went wrong. Please try again.'
      setError(message)
      setStatus('error')
      await speak(message, lang)
      setTimeout(() => setStatus('idle'), 2000)
    } finally {
      isActiveRef.current = false
    }
  }, [clearSafetyTimeout, lang, mic, mode, vision])

  const switchMode = useCallback(
    (newMode) => {
      if (!VALID_MODES.includes(newMode)) return
      setMode(newMode)
      setStoredChoice(STORAGE_KEYS.mode, newMode)
      speak(`Mode switched to ${newMode}`, lang)
    },
    [lang]
  )

  const switchLanguage = useCallback((newLang) => {
    if (!VALID_LANGS.includes(newLang)) return
    setLang(newLang)
    setStoredChoice(STORAGE_KEYS.lang, newLang)
    const announcement = LANGUAGE_ANNOUNCEMENTS[newLang]
    if (announcement) {
      speak(announcement.text, announcement.lang)
    }
  }, [])

  return {
    status,
    response,
    error,
    transcript,
    mode,
    lang,
    trigger,
    cancel,
    switchMode,
    switchLanguage,
    videoRef: vision.videoRef,
    startCamera: vision.startCamera,
    stopCamera: vision.stopCamera,
    cameraReady: vision.cameraReady,
    isRecording: mic.isRecording,
    isTranscribing: mic.isTranscribing,
    isAnalyzing: vision.isAnalyzing,
    micSupported: mic.supported,
    supported: mic.supported,
  }
}

async function logQuery({ transcript, response, mode }) {
  try {
    await fetch(apiUrl('/api/log-query'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 1,
        mode,
        query_text: transcript,
        response_text: response,
      }),
    })
  } catch {
    // Backend offline - silently ignore
  }
}

async function fetchRegisteredFaces() {
  try {
    const res = await fetch(apiUrl('/api/faces/1'))
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {
    // backend offline — fall through to localStorage
  }
  return loadLocalFaces()
}
