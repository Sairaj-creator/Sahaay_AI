import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn(),
  },
  Tensor: vi.fn().mockImplementation((type, data, dims) => ({ type, data, dims })),
}))

import { InferenceSession } from 'onnxruntime-web'

const makeOutput = (classIdx, score) => {
  const data = new Float32Array(11 * 8400).fill(0)
  data[0] = 320; data[1 * 8400] = 320  // cx, cy
  data[2 * 8400] = 100; data[3 * 8400] = 100  // w, h
  data[(4 + classIdx) * 8400] = score
  return { output0: { data, dims: [1, 11, 8400] } }
}

describe('utils/currency', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    
    // Mock canvas context
    const mockContext = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(640 * 640 * 4).fill(0)
      })
    }
    
    const originalCreateElement = document.createElement.bind(document)
    document.createElement = (tag) => {
      if (tag === 'canvas') {
        return {
          getContext: () => mockContext,
          width: 0,
          height: 0
        }
      }
      return originalCreateElement(tag)
    }
  })

  it('loadCurrencyModel() calls InferenceSession.create with /currency.onnx', async () => {
    InferenceSession.create.mockResolvedValue({})
    const { loadCurrencyModel } = await import('../utils/currency.js')
    await loadCurrencyModel()
    expect(InferenceSession.create).toHaveBeenCalledWith('/currency.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
  })

  it('loadCurrencyModel() called twice only calls create once (singleton guard)', async () => {
    InferenceSession.create.mockResolvedValue({})
    const { loadCurrencyModel } = await import('../utils/currency.js')
    await loadCurrencyModel()
    await loadCurrencyModel()
    expect(InferenceSession.create).toHaveBeenCalledTimes(1)
  })

  it('loadCurrencyModel() returns null and resets singleton when create rejects', async () => {
    InferenceSession.create.mockRejectedValue(new Error('fail'))
    const { loadCurrencyModel } = await import('../utils/currency.js')
    await expect(loadCurrencyModel()).rejects.toThrow('fail')
  })

  it('classifyCurrency(videoEl) returns null when model fails to load', async () => {
    InferenceSession.create.mockRejectedValue(new Error('fail'))
    const { classifyCurrency } = await import('../utils/currency.js')
    const res = await classifyCurrency(document.createElement('video'))
    expect(res).toBeNull()
  })

  it('classifyCurrency(videoEl) returns null when session run returns output with no confident detection', async () => {
    InferenceSession.create.mockResolvedValue({
      run: vi.fn().mockResolvedValue(makeOutput(0, 0.2))
    })
    const { classifyCurrency } = await import('../utils/currency.js')
    const res = await classifyCurrency(document.createElement('video'))
    expect(res).toBeNull()
  })

  it('classifyCurrency(videoEl) returns "This is a one hundred rupee note." when class index 3 has score 0.90', async () => {
    InferenceSession.create.mockResolvedValue({
      run: vi.fn().mockResolvedValue(makeOutput(3, 0.90))
    })
    const { classifyCurrency } = await import('../utils/currency.js')
    const res = await classifyCurrency(document.createElement('video'))
    expect(res).toBe('This is a one hundred rupee note.')
  })

  it('classifyCurrency(videoEl) returns null when class index 6 (₹2000) has the highest score — suppression check', async () => {
    InferenceSession.create.mockResolvedValue({
      run: vi.fn().mockResolvedValue(makeOutput(6, 0.95))
    })
    const { classifyCurrency } = await import('../utils/currency.js')
    const res = await classifyCurrency(document.createElement('video'))
    expect(res).toBeNull()
  })

  it('classifyCurrency(videoEl) returns the caution suffix string for class index 0 (₹10) with score 0.73', async () => {
    InferenceSession.create.mockResolvedValue({
      run: vi.fn().mockResolvedValue(makeOutput(0, 0.73))
    })
    const { classifyCurrency } = await import('../utils/currency.js')
    const res = await classifyCurrency(document.createElement('video'))
    expect(res).toContain('appears to be a ten rupee note')
    expect(res).toContain('hold it flat under good light')
  })

  it('classifyCurrency(videoEl) returns null for class index 0 with score 0.65 (below WEAK_THRESHOLD)', async () => {
    InferenceSession.create.mockResolvedValue({
      run: vi.fn().mockResolvedValue(makeOutput(0, 0.65))
    })
    const { classifyCurrency } = await import('../utils/currency.js')
    const res = await classifyCurrency(document.createElement('video'))
    expect(res).toBeNull()
  })
})
