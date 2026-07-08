import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(), fillRect: vi.fn(), clearRect: vi.fn(),
}))

// Mock Web Speech API — not available in jsdom
global.SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({
  onend: null,
  onerror: null,
}))
global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue([
    { lang: 'en-IN', name: 'Test Voice' },
  ]),
}

// Mock SpeechRecognition — not available in jsdom
global.SpeechRecognition = undefined
global.webkitSpeechRecognition = undefined

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }],
  }),
}

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
