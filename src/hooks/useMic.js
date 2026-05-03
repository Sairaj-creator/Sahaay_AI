import { useState, useRef, useCallback } from 'react'
import { callWhisper } from '../utils/openai.js'

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

async function captureAudioBlob(durationMs = 3500) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Speech recognition is not supported. Use Chrome or Edge.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  return new Promise((resolve, reject) => {
    const chunks = []
    const recorder = new MediaRecorder(stream)
    const cleanup = () => stream.getTracks().forEach((track) => track.stop())
    const timeoutId = setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    }, durationMs)

    recorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunks.push(event.data)
      }
    }

    recorder.onerror = () => {
      clearTimeout(timeoutId)
      cleanup()
      reject(new Error('Could not record audio.'))
    }

    recorder.onstop = () => {
      clearTimeout(timeoutId)
      cleanup()
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
    }

    recorder.start()
  })
}

export function useMic() {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const resolveRef = useRef(null)

  const supported = !!getSpeechRecognitionCtor()

  const startRecording = useCallback((lang = 'en-IN') => {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = getSpeechRecognitionCtor()

      if (!SpeechRecognition) {
        if (!OPENAI_KEY) {
          reject(new Error('Speech recognition is not supported. Use Chrome or Edge.'))
          return
        }

        ;(async () => {
          try {
            setError(null)
            setIsRecording(true)
            setIsTranscribing(false)

            const audioBlob = await captureAudioBlob()

            setIsRecording(false)
            setIsTranscribing(true)

            const text = (await callWhisper(audioBlob, lang)).trim()
            setTranscript(text)
            setIsTranscribing(false)
            resolve(text)
          } catch (err) {
            setIsRecording(false)
            setIsTranscribing(false)
            const message = err.message || 'Speech recognition is not supported. Use Chrome or Edge.'
            setError(message)
            reject(new Error(message))
          }
        })()
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = lang
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognitionRef.current = recognition
      resolveRef.current = resolve

      recognition.onstart = () => {
        setIsRecording(true)
        setIsTranscribing(false)
        setError(null)
      }

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript
        setTranscript(text)
        setIsRecording(false)
        setIsTranscribing(false)
        resolveRef.current = null
        resolve(text)
      }

      recognition.onerror = (event) => {
        setIsRecording(false)
        setIsTranscribing(false)

        if (event.error === 'aborted') {
          resolveRef.current = null
          resolve('')
          return
        }

        const messages = {
          'not-allowed': 'Microphone permission denied. Please allow mic access.',
          'no-speech': 'No speech detected. Please try again.',
          network: 'Network error. Check your connection.',
          'audio-capture': 'Microphone not found.',
        }

        const message = messages[event.error] || `Speech error: ${event.error}`
        setError(message)
        reject(new Error(message))
      }

      recognition.onend = () => {
        setIsRecording(false)
        setIsTranscribing(false)

        if (resolveRef.current === resolve) {
          resolveRef.current = null
          resolve('')
        }
      }

      try {
        recognition.start()
      } catch (err) {
        reject(err)
      }
    })
  }, [])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }, [])

  return {
    isRecording,
    isTranscribing,
    transcript,
    error,
    startRecording,
    stopRecording,
    supported,
    micSupported: supported,
  }
}
