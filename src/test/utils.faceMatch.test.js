import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as faceapi from 'face-api.js'

vi.mock('face-api.js', () => ({
  nets: {
    ssdMobilenetv1: { loadFromUri: vi.fn() },
    faceLandmark68Net: { loadFromUri: vi.fn() },
    faceRecognitionNet: { loadFromUri: vi.fn() },
  },
  detectSingleFace: vi.fn(),
}))

const vecA = Array(128).fill(0).map((_, i) => Math.sin(i))
const vecB = [...vecA]
const vecC = Array(128).fill(0).map((_, i) => Math.cos(i * 2 + 1))

describe('utils/faceMatch', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loadFaceModels() returns false when any loadFromUri rejects', async () => {
    faceapi.nets.ssdMobilenetv1.loadFromUri.mockRejectedValue(new Error('fail'))
    faceapi.nets.faceLandmark68Net.loadFromUri.mockResolvedValue()
    faceapi.nets.faceRecognitionNet.loadFromUri.mockResolvedValue()
    const { loadFaceModels } = await import('../utils/faceMatch.js')
    const res = await loadFaceModels()
    expect(res).toBe(false)
  })

  it('loadFaceModels() called twice only loads models once (singleton guard)', async () => {
    faceapi.nets.ssdMobilenetv1.loadFromUri.mockResolvedValue()
    faceapi.nets.faceLandmark68Net.loadFromUri.mockResolvedValue()
    faceapi.nets.faceRecognitionNet.loadFromUri.mockResolvedValue()
    
    const { loadFaceModels } = await import('../utils/faceMatch.js')
    
    const res1 = await loadFaceModels()
    const res2 = await loadFaceModels()
    
    expect(res1).toBe(true)
    expect(res2).toBe(true)
    expect(faceapi.nets.ssdMobilenetv1.loadFromUri).toHaveBeenCalledTimes(1)
    expect(faceapi.nets.faceLandmark68Net.loadFromUri).toHaveBeenCalledTimes(1)
    expect(faceapi.nets.faceRecognitionNet.loadFromUri).toHaveBeenCalledTimes(1)
  })

  it('matchFace(videoEl, []) returns null when contacts array is empty', async () => {
    faceapi.detectSingleFace.mockReturnValue({
      withFaceLandmarks: () => ({
        withFaceDescriptor: async () => null
      })
    })
    const { matchFace } = await import('../utils/faceMatch.js')
    const res = await matchFace(document.createElement('video'), [])
    expect(res).toBeNull()
  })

  it('matchFace(videoEl, contacts) returns null when detectSingleFace returns null (no face in frame)', async () => {
    faceapi.detectSingleFace.mockReturnValue({
      withFaceLandmarks: () => ({
        withFaceDescriptor: async () => null
      })
    })
    const { matchFace } = await import('../utils/faceMatch.js')
    const res = await matchFace(document.createElement('video'), [{ embedding: vecA, contact_name: 'Test' }])
    expect(res).toBeNull()
  })

  it('matchFace returns the correct contact name when cosine similarity exceeds 0.6', async () => {
    faceapi.detectSingleFace.mockReturnValue({
      withFaceLandmarks: () => ({
        withFaceDescriptor: async () => ({ descriptor: vecA })
      })
    })
    const { matchFace } = await import('../utils/faceMatch.js')
    const res = await matchFace(document.createElement('video'), [{ embedding: vecB, contact_name: 'John Doe' }])
    expect(res).toEqual({ name: 'John Doe', score: 1.0 })
  })

  it('matchFace returns null when best cosine similarity is below 0.6', async () => {
    faceapi.detectSingleFace.mockReturnValue({
      withFaceLandmarks: () => ({
        withFaceDescriptor: async () => ({ descriptor: vecA })
      })
    })
    const { matchFace } = await import('../utils/faceMatch.js')
    const res = await matchFace(document.createElement('video'), [{ embedding: vecC, contact_name: 'John Doe' }])
    expect(res).toBeNull()
  })

  it('descriptorFromBase64 returns null when detectSingleFace returns null', async () => {
    faceapi.detectSingleFace.mockReturnValue({
      withFaceLandmarks: () => ({
        withFaceDescriptor: async () => null
      })
    })
    const { descriptorFromBase64 } = await import('../utils/faceMatch.js')
    
    // Mock HTMLImageElement src setter to trigger onload
    const originalSrc = Object.getOwnPropertyDescriptor(global.HTMLImageElement.prototype, 'src')
    Object.defineProperty(global.HTMLImageElement.prototype, 'src', {
      configurable: true,
      set(val) {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
    })
    
    const promise = descriptorFromBase64('abcd')
    await vi.advanceTimersByTimeAsync(50)
    const res = await promise
    expect(res).toBeNull()
    
    if (originalSrc) {
      Object.defineProperty(global.HTMLImageElement.prototype, 'src', originalSrc)
    }
  })

  it('descriptorFromVideo returns null within 9 seconds when detectSingleFace never resolves', async () => {
    faceapi.detectSingleFace.mockReturnValue({
      withFaceLandmarks: () => ({
        withFaceDescriptor: () => new Promise((resolve) => setTimeout(resolve, 10000))
      })
    })
    const { descriptorFromVideo } = await import('../utils/faceMatch.js')
    
    const promise = descriptorFromVideo(document.createElement('video'))
    vi.runAllTimers()
    const res = await promise
    expect(res).toBeNull()
  })
})
