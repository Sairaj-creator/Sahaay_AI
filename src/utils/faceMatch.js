import * as faceapi from 'face-api.js'

let modelsLoaded = false
let modelsLoading = false

export async function loadFaceModels() {
  if (modelsLoaded) return true
  if (modelsLoading) return false

  modelsLoading = true

  try {
    const MODEL_URL = '/face-models'

    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])

    modelsLoaded = true
    modelsLoading = false
    return true
  } catch (err) {
    console.warn('face-api.js models failed to load:', err.message)
    modelsLoading = false
    return false
  }
}

export async function descriptorFromBase64(base64) {
  try {
    const img = document.createElement('img')
    img.src = `data:image/jpeg;base64,${base64}`

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

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
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

  if (bestMatch && bestSimilarity >= 0.6) {
    return { name: bestMatch.contact_name, score: bestSimilarity }
  }

  return null
}
