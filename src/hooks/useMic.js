import { useState, useRef, useCallback } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export function useMic() {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const resolveRef = useRef(null)

  const supported = !!SpeechRecognition

  const startRecording = useCallback((lang = 'en-IN') => {
    return new Promise((resolve, reject) => {
      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported. Use Chrome or Edge.'))
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
        resolve(text)
      }

      recognition.onerror = (event) => {
        setIsRecording(false)
        setIsTranscribing(false)

        if (event.error === 'aborted') {
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
