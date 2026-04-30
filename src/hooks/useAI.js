import { useState, useCallback, useRef } from 'react'
import { useMic } from './useMic.js'
import { useVision } from './useVision.js'
import { speak } from '../utils/tts.js'
import { checkDemoScript } from '../utils/prompts.js'

const VALID_MODES = ['scene', 'ocr', 'currency', 'face']
const VALID_LANGS = ['en-IN', 'hi-IN', 'kn-IN']
const SAFETY_TIMEOUT_MS = 10000

export function useAI() {
  const [status, setStatus] = useState('idle')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('scene')
  const [lang, setLang] = useState('en-IN')

  const mic = useMic()
  const vision = useVision()
  const timeoutRef = useRef(null)
  const isActiveRef = useRef(false)

  const clearSafetyTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const trigger = useCallback(async () => {
    if (isActiveRef.current) return

    isActiveRef.current = true
    clearSafetyTimeout()
    setError(null)

    timeoutRef.current = setTimeout(() => {
      setStatus('idle')
      isActiveRef.current = false
      speak('Sorry, that took too long. Please try again.', lang)
    }, SAFETY_TIMEOUT_MS)

    try {
      setStatus('listening')
      let transcript = ''

      try {
        transcript = await mic.startRecording(lang)
      } catch (micError) {
        console.warn('Mic failed, continuing without voice:', micError.message)
      }

      const demoResponse = checkDemoScript(transcript)
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
      const result = await vision.analyzeFrame(mode)

      clearSafetyTimeout()
      setStatus('speaking')
      setResponse(result)
      await speak(result, lang)

      logQuery({ transcript, response: result, mode }).catch(() => {})

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
      speak(`Mode switched to ${newMode}`, lang)
    },
    [lang]
  )

  const switchLanguage = useCallback((newLang) => {
    if (!VALID_LANGS.includes(newLang)) return
    setLang(newLang)
  }, [])

  return {
    status,
    response,
    error,
    mode,
    lang,
    trigger,
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
    await fetch('/api/log-query', {
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
    // Backend offline — silently ignore
  }
}
