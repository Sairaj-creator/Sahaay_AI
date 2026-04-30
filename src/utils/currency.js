import * as ort from 'onnxruntime-web'

const MODEL_URL = '/currency.onnx'
const INPUT_SIZE = 640
const CONF_THRESHOLD = 0.55
const IOU_THRESHOLD = 0.45

const LABEL_MAP = {
  0: 'ten',
  1: 'twenty',
  2: 'fifty',
  3: 'one hundred',
  4: 'two hundred',
  5: 'five hundred',
}

const WEAK_CLASSES = new Set([0, 2])
const WEAK_THRESHOLD = 0.72

let sessionPromise = null

export async function loadCurrencyModel() {
  if (sessionPromise) return sessionPromise
  sessionPromise = ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  }).catch((err) => {
    sessionPromise = null
    throw err
  })
  return sessionPromise
}

function letterboxCanvas(videoElement, size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  const videoWidth = videoElement.videoWidth || size
  const videoHeight = videoElement.videoHeight || size
  const scale = Math.min(size / videoWidth, size / videoHeight)
  const drawW = videoWidth * scale
  const drawH = videoHeight * scale
  const x = (size - drawW) / 2
  const y = (size - drawH) / 2

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(videoElement, x, y, drawW, drawH)

  return canvas
}

function canvasToTensor(canvas, size) {
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, size, size)
  const { data: pixels } = imageData
  const area = size * size
  const data = new Float32Array(3 * area)

  for (let i = 0; i < area; i += 1) {
    const pixelOffset = i * 4
    data[i] = pixels[pixelOffset] / 255
    data[area + i] = pixels[pixelOffset + 1] / 255
    data[area * 2 + i] = pixels[pixelOffset + 2] / 255
  }

  return new ort.Tensor('float32', data, [1, 3, size, size])
}

function computeIoU(boxA, boxB) {
  const x1 = Math.max(boxA[0], boxB[0])
  const y1 = Math.max(boxA[1], boxB[1])
  const x2 = Math.min(boxA[2], boxB[2])
  const y2 = Math.min(boxA[3], boxB[3])
  const intersectionWidth = Math.max(0, x2 - x1)
  const intersectionHeight = Math.max(0, y2 - y1)
  const intersectionArea = intersectionWidth * intersectionHeight

  const areaA = Math.max(0, boxA[2] - boxA[0]) * Math.max(0, boxA[3] - boxA[1])
  const areaB = Math.max(0, boxB[2] - boxB[0]) * Math.max(0, boxB[3] - boxB[1])
  const unionArea = areaA + areaB - intersectionArea

  return unionArea > 0 ? intersectionArea / unionArea : 0
}

function nms(boxes, scores, iouThreshold) {
  const sortedIndices = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.index)

  const kept = []

  for (const candidateIndex of sortedIndices) {
    let suppressed = false

    for (const keptIndex of kept) {
      if (computeIoU(boxes[candidateIndex], boxes[keptIndex]) > iouThreshold) {
        suppressed = true
        break
      }
    }

    if (!suppressed) {
      kept.push(candidateIndex)
    }
  }

  return kept
}

function parseOutput(outputTensor, confThreshold, iouThreshold) {
  const data = outputTensor.data
  const anchors = 8400
  const classes = 7
  const boxes = []
  const scores = []
  const classIndices = []

  for (let i = 0; i < anchors; i += 1) {
    const cx = data[0 * anchors + i]
    const cy = data[1 * anchors + i]
    const w = data[2 * anchors + i]
    const h = data[3 * anchors + i]

    let classIdx = -1
    let classScore = -Infinity

    for (let c = 0; c < classes; c += 1) {
      const score = data[(4 + c) * anchors + i]
      if (score > classScore) {
        classScore = score
        classIdx = c
      }
    }

    if (classIdx === 6) continue

    const effectiveThreshold = WEAK_CLASSES.has(classIdx) ? WEAK_THRESHOLD : confThreshold
    if (classScore < effectiveThreshold) continue

    const x1 = cx - w / 2
    const y1 = cy - h / 2
    const x2 = cx + w / 2
    const y2 = cy + h / 2

    boxes.push([x1, y1, x2, y2])
    scores.push(classScore)
    classIndices.push(classIdx)
  }

  if (boxes.length === 0) {
    return null
  }

  const keptIndices = nms(boxes, scores, iouThreshold)
  if (keptIndices.length === 0) {
    return null
  }

  const topIndex = keptIndices[0]
  return {
    classIdx: classIndices[topIndex],
    score: scores[topIndex],
  }
}

export async function classifyCurrency(videoElement) {
  let session
  try {
    session = await loadCurrencyModel()
  } catch (err) {
    console.warn('ONNX currency model failed to load:', err.message)
    return null
  }

  try {
    const canvas = letterboxCanvas(videoElement, INPUT_SIZE)
    const tensor = canvasToTensor(canvas, INPUT_SIZE)
    const feeds = { images: tensor }
    const results = await session.run(feeds)
    const outputKey = Object.keys(results)[0]
    const detection = parseOutput(results[outputKey], CONF_THRESHOLD, IOU_THRESHOLD)

    if (!detection) {
      return null
    }

    const label = LABEL_MAP[detection.classIdx]
    if (!label) return null

    if (WEAK_CLASSES.has(detection.classIdx) && detection.score < 0.8) {
      return `This appears to be a ${label} rupee note, but I am not fully certain. Please hold it flat under good light.`
    }

    return `This is a ${label} rupee note.`
  } catch (err) {
    console.warn('Currency inference error:', err.message)
    return null
  }
}
