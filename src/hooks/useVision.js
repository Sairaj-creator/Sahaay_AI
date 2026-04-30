import { useState, useRef, useCallback } from 'react'
import { compressFrame, callVision } from '../utils/openai.js'
import { classifyCurrency } from '../utils/currency.js'
import { PROMPTS } from '../utils/prompts.js'

export function useVision() {
  const [cameraReady, setCameraReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permission.')
      console.error('Camera error:', err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    setCameraReady(false)
  }, [])

  const analyzeFrame = useCallback(
    async (mode = 'scene', contacts = []) => {
      if (!videoRef.current || !cameraReady) {
        throw new Error('Camera not ready.')
      }

      setIsAnalyzing(true)
      setError(null)

      try {
        if (mode === 'currency') {
          const localResult = await classifyCurrency(videoRef.current)
          if (localResult) {
            setIsAnalyzing(false)
            return localResult
          }
        }

        const base64 = compressFrame(videoRef.current)

        let prompt = PROMPTS[mode] || PROMPTS.scene
        if (mode === 'face' && contacts.length > 0) {
          const contactList = contacts.map((contact) => contact.contact_name).join(', ')
          prompt = prompt.replace('{CONTACTS_PLACEHOLDER}', contactList)
        }

        return await callVision(base64, prompt)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setIsAnalyzing(false)
      }
    },
    [cameraReady]
  )

  return {
    videoRef,
    cameraReady,
    isAnalyzing,
    error,
    startCamera,
    stopCamera,
    analyzeFrame,
  }
}
