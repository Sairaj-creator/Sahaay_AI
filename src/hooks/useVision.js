import { useState, useRef, useCallback } from 'react'
import { compressFrame, callVision } from '../utils/openai.js'
import { classifyCurrency } from '../utils/currency.js'
import { loadFaceModels, descriptorFromBase64, descriptorFromVideo, matchFace } from '../utils/faceMatch.js'
import { PROMPTS } from '../utils/prompts.js'

let ocrWorkerPromise = null

function offlineModeEnabled() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem('sahaay-offline-mode') === 'true'
}

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
    async (mode = 'scene', contacts = [], lang = 'en-IN') => {
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

          if (offlineModeEnabled()) {
            throw new Error(
              'Offline mode is on, but local OCR could not read this text clearly. Try better light or reconnect to the internet.'
            )
          }
        }

        if (mode === 'currency') {
          const localResult = await classifyCurrency(videoRef.current)
          if (localResult) {
            return localResult
          }

          if (offlineModeEnabled()) {
            throw new Error(
              'Offline mode is on, but the local currency model could not identify this note. Try holding it flatter or reconnect to the internet.'
            )
          }
        }

        if (offlineModeEnabled() && (mode === 'scene' || mode === 'face')) {
          throw new Error('Offline mode is on. Scene and face descriptions need internet access.')
        }

        if (mode === 'face') {
          const faceModelsReady = await loadFaceModels()

          if (faceModelsReady && contacts.length > 0) {
            const localMatch = await matchFace(videoRef.current, contacts)

            if (localMatch) {
              return `This appears to be ${localMatch.name}.`
            }

            const base64 = compressFrame(videoRef.current)
            const liveDescriptor = await descriptorFromVideo(videoRef.current)

            if (!liveDescriptor) {
              return 'No face detected in frame. Please point the camera directly at the person.'
            }

            const contactList = contacts.map((contact) => contact.contact_name).join(', ')
            const prompt = PROMPTS.face.replace('{CONTACTS_PLACEHOLDER}', contactList)
            return await callVision(base64, prompt)
          }

          const base64 = compressFrame(videoRef.current)
          const contactList =
            contacts.length > 0
              ? contacts.map((contact) => contact.contact_name).join(', ')
              : 'No registered contacts.'
          const prompt = PROMPTS.face.replace('{CONTACTS_PLACEHOLDER}', contactList)
          return await callVision(base64, prompt)
        }

        const base64 = compressFrame(videoRef.current)

        const prompt = PROMPTS[mode] || PROMPTS.scene

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
