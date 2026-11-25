import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../utils/localStt.js', async (importOriginal) => ({
  ...(await importOriginal()),
  preloadLocalStt: vi.fn(() => Promise.resolve()),
  transcribeLocally: vi.fn(async () => '  is the road clear  '),
}))
vi.mock('../utils/openai.js', () => ({ callWhisper: vi.fn(async () => 'from cloud') }))

import { isOnDeviceOnly, ON_DEVICE_KEY } from '../utils/privacy.js'
import { pickVoice } from '../utils/tts.js'
import { toMono, whisperLanguage, transcribeLocally, preloadLocalStt } from '../utils/localStt.js'
import { callWhisper } from '../utils/openai.js'
import { useMic } from '../hooks/useMic.js'
import { useWakeWord } from '../hooks/useWakeWord.js'

class FakeMediaRecorder {
  constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm' }
  start() {
    this.state = 'recording'
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob(['audio']) })
      this.state = 'inactive'
      this.onstop?.()
    }, 0)
  }
  stop() {}
}

describe('on-device only mode', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    global.MediaRecorder = FakeMediaRecorder
    // Present in the browser, but must not be used in on-device mode
    window.SpeechRecognition = vi.fn(function FakeRecognition() {
      this.start = vi.fn()
      this.stop = vi.fn()
      this.abort = vi.fn()
    })
  })

  afterEach(() => {
    delete global.MediaRecorder
    window.SpeechRecognition = undefined
  })

  it('isOnDeviceOnly reads the stored setting', () => {
    expect(isOnDeviceOnly()).toBe(false)
    localStorage.setItem(ON_DEVICE_KEY, 'true')
    expect(isOnDeviceOnly()).toBe(true)
  })

  it('useMic transcribes on the device and never uses cloud speech recognition', async () => {
    localStorage.setItem(ON_DEVICE_KEY, 'true')
    const { result } = renderHook(() => useMic())

    let text
    await act(async () => { text = await result.current.startRecording('hi-IN') })

    expect(text).toBe('is the road clear')
    expect(transcribeLocally).toHaveBeenCalledWith(expect.any(Blob), 'hi-IN')
    expect(window.SpeechRecognition).not.toHaveBeenCalled()
    expect(callWhisper).not.toHaveBeenCalled()
    expect(preloadLocalStt).toHaveBeenCalled() // model is fetched ahead of the first question
  })

  it('useMic uses the browser recogniser when on-device mode is off', async () => {
    const { result } = renderHook(() => useMic())
    act(() => { result.current.startRecording('en-IN') })
    expect(window.SpeechRecognition).toHaveBeenCalled()
    expect(transcribeLocally).not.toHaveBeenCalled()
    expect(preloadLocalStt).not.toHaveBeenCalled()
  })

  it('useWakeWord never starts the always-on cloud recogniser in on-device mode', () => {
    localStorage.setItem(ON_DEVICE_KEY, 'true')
    const { result } = renderHook(() => useWakeWord({ enabled: true }))
    expect(result.current.unavailable).toBe(true)
    expect(window.SpeechRecognition).not.toHaveBeenCalled()
  })
})

describe('pickVoice', () => {
  const googleHindi = { name: 'Google हिन्दी', lang: 'hi-IN', localService: false }
  const localHindi = { name: 'Microsoft Kalpana', lang: 'hi-IN', localService: true }
  const localEnglish = { name: 'Microsoft Heera', lang: 'en-IN', localService: true }

  it('prefers a local voice over a cloud voice for the same language', () => {
    expect(pickVoice([googleHindi, localHindi], 'hi-IN')).toBe(localHindi)
  })

  it('falls back to a cloud voice for the language when on-device mode is off', () => {
    expect(pickVoice([googleHindi, localEnglish], 'hi-IN')).toBe(googleHindi)
  })

  it('never returns a cloud voice in on-device mode', () => {
    expect(pickVoice([googleHindi, localEnglish], 'hi-IN', { localOnly: true })).toBe(localEnglish)
    expect(pickVoice([googleHindi], 'hi-IN', { localOnly: true })).toBeNull()
  })
})

describe('localStt helpers', () => {
  it('maps app languages to Whisper language codes', () => {
    expect(whisperLanguage('en-IN')).toBe('en')
    expect(whisperLanguage('hi-IN')).toBe('hi')
    expect(whisperLanguage('kn-IN')).toBe('kn')
    expect(whisperLanguage('xx')).toBe('en')
  })

  it('toMono averages stereo channels and passes mono through', () => {
    const mono = new Float32Array([0.5, -0.5])
    expect(toMono([mono])).toBe(mono)
    expect(Array.from(toMono([new Float32Array([1, 0]), new Float32Array([0, 1])]))).toEqual([0.5, 0.5])
  })
})
