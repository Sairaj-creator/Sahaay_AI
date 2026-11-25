import { useState, useRef, useCallback } from 'react'
import { compressFrame, callVision } from '../utils/openai.js'
import { classifyCurrency } from '../utils/currency.js'
import { loadFaceModels, descriptorFromVideo, findBestMatch } from '../utils/faceMatch.js'
import { buildPrompt } from '../utils/prompts.js'
import { isOnDeviceOnly } from '../utils/privacy.js'

let ocrWorkerPromise = null

function getSnapshotCanvas(videoElement) {
  const width = videoElement.videoWidth || 1280
  const height = videoElement.videoHeight || 720
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoElement, 0, 0, width, height)
  return canvas
}

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker(['eng', 'hin', 'kan'])
    )
  }

  return ocrWorkerPromise
}

function formatOcrText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.join('. ')
}

function looksLikeMedicineLabel(text) {
  return /(tablet|capsule|dosage|take|mg|ml)/i.test(text)
}

function summarizeMedicineText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''

  const drugName = lines[0]
  const dosage = lines.find((line) => /\b\d+\s?(mg|ml)\b/i.test(line)) || ''
  const instructions =
    lines.find((line) => /(take|use|daily|hours|times)/i.test(line)) || lines.slice(1, 3).join('. ')

  return [drugName, dosage, instructions].filter(Boolean).join('. ')
}

function containsIndicScript(text) {
  return /[\u0900-\u097F\u0C80-\u0CFF]/.test(text)
}

async function readTextLocally(videoElement, lang) {
  const worker = await getOcrWorker()
  const canvas = getSnapshotCanvas(videoElement)
  const result = await worker.recognize(canvas)
  const confidence = result?.data?.confidence || 0
  const text = (result?.data?.text || '').trim()

  if (!text || confidence < 70) {
    return null
  }

  if (lang === 'en-IN' && containsIndicScript(text)) {
    return null
  }

  if (looksLikeMedicineLabel(text)) {
    return summarizeMedicineText(text)
  }

  return formatOcrText(text)
}

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
        videoRef.current.onloadedmetadata = async () => {
          // Guard: only play if this stream is still the active one
          if (videoRef.current && videoRef.current.srcObject === stream) {
            try {
              await videoRef.current.play()
              setCameraReady(true)
            } catch (playErr) {
              // Ignore AbortError from rapid mount/unmount cycles
              if (playErr.name !== 'AbortError') {
                console.error('Camera play error:', playErr)
              }
            }
          }
        }
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
    async (mode = 'scene', contacts = [], lang = 'en-IN', question = '') => {
      if (!videoRef.current || !cameraReady) {
        throw new Error('Camera not ready.')
      }

      setIsAnalyzing(true)
      setError(null)

      try {
        if (mode === 'ocr') {
          const localText = await readTextLocally(videoRef.current, lang)
          if (localText) {
            return localText
          }

          if (isOnDeviceOnly()) {
            throw new Error(
              'On-device mode is on, but local text reading could not read this clearly. Try better light, or turn off on-device mode in Settings.'
            )
          }
        }

        if (mode === 'currency') {
          const localResult = await classifyCurrency(videoRef.current)
          if (localResult) {
            return localResult
          }

          if (isOnDeviceOnly()) {
            throw new Error(
              'On-device mode is on, but the local currency model could not identify this note. Try holding it flatter under good light.'
            )
          }
        }

        // Face recognition runs entirely on-device. A cloud model has never seen the
        // registered contacts, so asking it would only produce a guessed name.
        if (mode === 'face') {
          if (contacts.length === 0) {
            return 'No contacts are registered yet. Ask your caregiver to add faces in the caregiver screen.'
          }

          const faceModelsReady = await loadFaceModels()
          if (!faceModelsReady) {
            throw new Error('Face recognition could not start. Please try again.')
          }

          const liveDescriptor = await descriptorFromVideo(videoRef.current)
          if (!liveDescriptor) {
            return 'No face detected. Please point the camera directly at the person.'
          }

          const match = findBestMatch(liveDescriptor, contacts)
          return match ? `This appears to be ${match.name}.` : 'I do not recognise this person.'
        }

        if (isOnDeviceOnly() && mode === 'scene') {
          throw new Error('Scene description is not available in on-device mode yet. Turn off on-device mode in Settings to use it.')
        }

        const base64 = compressFrame(videoRef.current)
        const prompt = buildPrompt(mode, { question, lang })

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
