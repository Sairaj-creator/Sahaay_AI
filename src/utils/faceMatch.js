import * as faceapi from 'face-api.js'

let modelsLoaded = false
let loadingPromise = null

const LOCAL_FACES_KEY = 'sahaay-registered-faces'

export function loadLocalFaces() {
  try {
    const raw = localStorage.getItem(LOCAL_FACES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalFace(contact_name, embedding, photo_url = '') {
  const faces = loadLocalFaces()
  faces.push({ id: Date.now(), contact_name, embedding, photo_url })
  localStorage.setItem(LOCAL_FACES_KEY, JSON.stringify(faces))
}

export function deleteLocalFace(id) {
  const faces = loadLocalFaces().filter((f) => f.id !== id)
  localStorage.setItem(LOCAL_FACES_KEY, JSON.stringify(faces))
}

export async function loadFaceModels() {
  if (modelsLoaded) return true
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      const MODEL_URL = '/face-models'

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])

      modelsLoaded = true
      return true
    } catch (err) {
      console.warn('face-api.js models failed to load:', err.message)
      loadingPromise = null
      return false
    }
  })()

  return loadingPromise
}

export async function descriptorFromBase64(base64, mimeType = 'image/jpeg') {
  let img = null
  try {
    img = document.createElement('img')
    // Must be in DOM so face-api.js can read pixel dimensions
    img.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden'
    document.body.appendChild(img)
    img.src = `data:${mimeType};base64,${base64}`

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Could not load face image.'))
    })

    const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
    const detection = await faceapi
      .detectSingleFace(img, opts)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) return null
    return Array.from(detection.descriptor)
  } catch (err) {
    console.warn('Could not extract face descriptor from image:', err.message)
    return null
  } finally {
    img?.parentNode?.removeChild(img)
  }
}

export async function descriptorFromVideo(videoElement) {
  try {
    // Snapshot to a canvas so face-api.js gets a stable frozen frame
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth || 640
    canvas.height = videoElement.videoHeight || 480
    canvas.getContext('2d').drawImage(videoElement, 0, 0)

    const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
    const detection = await faceapi
      .detectSingleFace(canvas, opts)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) return null
    return Array.from(detection.descriptor)
  } catch (err) {
    console.warn('Could not extract face descriptor from video:', err.message)
    return null
  }
}

function euclideanDistance(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export async function matchFace(videoElement, registeredFaces) {
  const liveDescriptor = await descriptorFromVideo(videoElement)
  if (!liveDescriptor) return null

  const validFaces = registeredFaces.filter(
    (face) => Array.isArray(face.embedding) && face.embedding.length === 128
  )
  if (validFaces.length === 0) return null

  let bestMatch = null
  let bestDistance = Infinity

  for (const face of validFaces) {
    const distance = euclideanDistance(liveDescriptor, face.embedding)
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = face
    }
  }

  // face-api.js standard threshold: < 0.5 is a confident match, < 0.6 is acceptable
  if (bestMatch && bestDistance < 0.5) {
    return { name: bestMatch.contact_name, score: bestDistance }
  }

  return null
}
