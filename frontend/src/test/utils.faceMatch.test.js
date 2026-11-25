import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as faceapi from 'face-api.js'

vi.mock('face-api.js', () => ({
  nets: {
    ssdMobilenetv1: { loadFromUri: vi.fn() },
    faceLandmark68Net: { loadFromUri: vi.fn() },
    faceRecognitionNet: { loadFromUri: vi.fn() },
  },
  detectSingleFace: vi.fn(),
  SsdMobilenetv1Options: vi.fn(),
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
    expect(res).toEqual({ name: 'John Doe', score: 0 })
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

  it('findBestMatch picks the closest registered face under the threshold', async () => {
    const { findBestMatch } = await import('../utils/faceMatch.js')
    const res = findBestMatch(vecA, [
      { embedding: vecC, contact_name: 'Stranger' },
      { embedding: vecB, contact_name: 'Amma' },
    ])
    expect(res).toEqual({ name: 'Amma', score: 0 })
  })

  it('findBestMatch skips faces with missing or wrong-length embeddings', async () => {
    const { findBestMatch } = await import('../utils/faceMatch.js')
    expect(findBestMatch(vecA, [{ embedding: [], contact_name: 'Empty' }])).toBeNull()
    expect(findBestMatch(vecA, [{ embedding: null, contact_name: 'Null' }])).toBeNull()
    expect(findBestMatch(null, [{ embedding: vecB, contact_name: 'X' }])).toBeNull()
  })

  it('saveLocalFace stores the face and setLocalFaceServerId links it to the server row', async () => {
    localStorage.clear()
    const { saveLocalFace, setLocalFaceServerId, loadLocalFaces } = await import('../utils/faceMatch.js')
    const face = saveLocalFace('Appa', vecA, 'data:image/jpeg;base64,xx')
    expect(loadLocalFaces()).toHaveLength(1)
    expect(loadLocalFaces()[0]).toMatchObject({ contact_name: 'Appa', embedding: vecA, server_id: null })

    setLocalFaceServerId(face.id, 42)
    expect(loadLocalFaces()[0].server_id).toBe(42)
  })

  it('deleteLocalFace removes only that face', async () => {
    localStorage.clear()
    const { saveLocalFace, deleteLocalFace, loadLocalFaces } = await import('../utils/faceMatch.js')
    const a = saveLocalFace('A', vecA)
    vi.advanceTimersByTime(5) // ids are timestamps
    saveLocalFace('B', vecC)
    deleteLocalFace(a.id)
    expect(loadLocalFaces().map((f) => f.contact_name)).toEqual(['B'])
  })

  it('saveLocalFace throws a clear error when browser storage is full', async () => {
    const { saveLocalFace } = await import('../utils/faceMatch.js')
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => saveLocalFace('Big', vecA, 'x')).toThrow(/Not enough storage/)
    spy.mockRestore()
  })

  it('mergeFaces keeps local faces and adds only unlinked server faces', async () => {
    const { mergeFaces } = await import('../utils/faceMatch.js')
    const local = [{ id: 1000, contact_name: 'Amma', embedding: vecA, server_id: 7 }]
    const server = [
      { id: 7, contact_name: 'Amma', embedding: vecA },
      { id: 8, contact_name: 'Appa', embedding: vecC },
    ]
    const merged = mergeFaces(local, server)
    expect(merged.map((f) => f.contact_name)).toEqual(['Amma', 'Appa'])
    expect(merged[1]).toMatchObject({ id: 'server-8', server_id: 8 })
  })

  it('mergeFaces links unlinked (pre-fix) local faces to their identical server copy', async () => {
    const { mergeFaces } = await import('../utils/faceMatch.js')
    const local = [{ id: 1000, contact_name: 'Raj', embedding: vecA }] // no server_id
    const server = [
      { id: 2, contact_name: 'Raj', embedding: [...vecA] },
      { id: 3, contact_name: 'Raj', embedding: vecC }, // same name, different face: kept separate
    ]
    const merged = mergeFaces(local, server)
    expect(merged).toHaveLength(2)
    expect(merged[0]).toMatchObject({ id: 1000, server_id: 2 })
    expect(merged[1]).toMatchObject({ id: 'server-3', server_id: 3 })
  })

  it('mergeFaces tolerates a non-array server response', async () => {
    const { mergeFaces } = await import('../utils/faceMatch.js')
    expect(mergeFaces([], { error: 'x' })).toEqual([])
  })

  it('descriptorFromVideo retries with a padded frame when the first pass finds no face', async () => {
    faceapi.detectSingleFace
      .mockReturnValueOnce({ withFaceLandmarks: () => ({ withFaceDescriptor: async () => null }) })
      .mockReturnValueOnce({ withFaceLandmarks: () => ({ withFaceDescriptor: async () => ({ descriptor: vecA }) }) })
    const { descriptorFromVideo } = await import('../utils/faceMatch.js')
    const res = await descriptorFromVideo(document.createElement('video'))
    expect(res).toEqual(vecA)
    expect(faceapi.detectSingleFace).toHaveBeenCalledTimes(2)
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
    await vi.runAllTimersAsync() // first pass + padded retry both find nothing
    const res = await promise
    expect(res).toBeNull()
  })
})
