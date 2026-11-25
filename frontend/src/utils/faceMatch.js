import * as faceapi from 'face-api.js'

let modelsLoaded = false
let loadingPromise = null

const LOCAL_FACES_KEY = 'sahaay-registered-faces'

// face-api.js descriptors: distance < 0.5 is a confident match for the same person.
export const MATCH_THRESHOLD = 0.5

export function loadLocalFaces() {
  try {
    const raw = localStorage.getItem(LOCAL_FACES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocalFaces(faces) {
  try {
    localStorage.setItem(LOCAL_FACES_KEY, JSON.stringify(faces))
  } catch {
    // Usually QuotaExceededError: localStorage holds only ~5 MB per site.
    throw new Error('Not enough storage on this device to save the face. Delete an older contact and try again.')
  }
}

/** Save a face on this device. Returns the saved record. */
export function saveLocalFace(contact_name, embedding, photo_url = '', server_id = null) {
  const faces = loadLocalFaces()
  const face = { id: Date.now(), contact_name, embedding, photo_url, server_id }
  faces.push(face)
  writeLocalFaces(faces)
  return face
}

/** Remember the backend row id of a local face, so deleting it removes both copies. */
export function setLocalFaceServerId(localId, server_id) {
  const faces = loadLocalFaces().map((f) => (f.id === localId ? { ...f, server_id } : f))
  writeLocalFaces(faces)
}

export function deleteLocalFace(id) {
  const faces = loadLocalFaces().filter((f) => f.id !== id)
  writeLocalFaces(faces)
}

function sameEmbedding(a, b) {
  return (
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.length > 0 &&
    a.every((v, i) => Math.abs(v - b[i]) < 1e-6)
  )
}

/**
 * Combine faces stored on this device with faces stored on the backend, so each
 * person appears once and carries the server_id needed to delete the server copy.
 *
 * Faces registered before local and server copies were linked have no server_id;
 * they are paired with their server copy by matching name and identical embedding.
 */
export function mergeFaces(localFaces = [], serverFaces = []) {
  const server = Array.isArray(serverFaces) ? serverFaces : []
  const claimed = new Set(localFaces.map((f) => f.server_id).filter((id) => id != null))

  const local = localFaces.map((f) => {
    if (f.server_id != null) return f
    const twin = server.find(
      (s) => !claimed.has(s.id) && s.contact_name === f.contact_name && sameEmbedding(s.embedding, f.embedding)
    )
    if (!twin) return f
    claimed.add(twin.id)
    return { ...f, server_id: twin.id }
  })

  const serverOnly = server
    .filter((f) => !claimed.has(f.id))
    .map((f) => ({ ...f, id: `server-${f.id}`, server_id: f.id }))

  return [...local, ...serverOnly]
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

async function describeFace(source) {
  const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
  return faceapi.detectSingleFace(source, opts).withFaceLandmarks().withFaceDescriptor()
}

/**
 * Detect one face and return its 128-number descriptor, or null.
 *
 * SSD MobileNet often misses a face that fills the whole frame (a cropped headshot,
 * or the camera held close to someone): tested on tight 150x150 crops it found no
 * face in 3 of 4. Adding a plain border around the image fixed all of them (score
 * 0.95-1.00), so retry that way when the first pass finds nothing.
 */
async function detectDescriptor(source, width, height) {
  let detection = await describeFace(source)

  if (!detection && width > 0 && height > 0) {
    const pad = Math.round(Math.max(width, height) * 0.5)
    const padded = document.createElement('canvas')
    padded.width = width + 2 * pad
    padded.height = height + 2 * pad
    const ctx = padded.getContext('2d')
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, padded.width, padded.height)
    ctx.drawImage(source, pad, pad, width, height)
    detection = await describeFace(padded)
  }

  return detection ? Array.from(detection.descriptor) : null
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

    return await detectDescriptor(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
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

    return await detectDescriptor(canvas, canvas.width, canvas.height)
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

/**
 * Find the registered face closest to a live descriptor.
 * Returns { name, score } when the distance is under MATCH_THRESHOLD, otherwise null.
 */
export function findBestMatch(liveDescriptor, registeredFaces = []) {
  if (!liveDescriptor || liveDescriptor.length !== 128) return null

  let bestMatch = null
  let bestDistance = Infinity

  for (const face of registeredFaces) {
    if (!Array.isArray(face.embedding) || face.embedding.length !== 128) continue
    const distance = euclideanDistance(liveDescriptor, face.embedding)
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = face
    }
  }

  if (bestMatch && bestDistance < MATCH_THRESHOLD) {
    return { name: bestMatch.contact_name, score: bestDistance }
  }

  return null
}

export async function matchFace(videoElement, registeredFaces) {
  const liveDescriptor = await descriptorFromVideo(videoElement)
  if (!liveDescriptor) return null
  return findBestMatch(liveDescriptor, registeredFaces)
}
