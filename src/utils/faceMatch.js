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
  try {
    const img = document.createElement('img')
    img.src = `data:${mimeType};base64,${base64}`

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Could not load face image.'))
    })

    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) {
      return null
    }

    return Array.from(detection.descriptor)
  } catch (err) {
    console.warn('Could not extract face descriptor from image:', err.message)
    return null
  }
}

export async function descriptorFromVideo(videoElement) {
  try {
    const detection = await faceapi
      .detectSingleFace(videoElement)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) {
      return null
    }

    return Array.from(detection.descriptor)
  } catch (err) {
    console.warn('Could not extract face descriptor from video:', err.message)
    return null
  }
}

function cosineSimilarity(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}

export async function matchFace(videoElement, registeredFaces) {
  const liveDescriptor = await descriptorFromVideo(videoElement)

  if (!liveDescriptor) {
    return null
  }

  const validFaces = registeredFaces.filter(
    (face) => Array.isArray(face.embedding) && face.embedding.length === 128
  )

  if (validFaces.length === 0) {
    return null
  }

  let bestMatch = null
  let bestSimilarity = -1

  for (const face of validFaces) {
    const similarity = cosineSimilarity(liveDescriptor, face.embedding)
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestMatch = face
    }
  }

  if (bestMatch && bestSimilarity >= 0.75) {
    return { name: bestMatch.contact_name, score: bestSimilarity }
  }

  return null
}
