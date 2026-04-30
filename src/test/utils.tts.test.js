import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { speak, stopSpeaking, announceScreen } from '../utils/tts.js'

describe('utils/tts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('speak() calls window.speechSynthesis.speak with an utterance whose lang matches the argument', async () => {
    speak('hello', 'fr-FR')
    expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('hello')
    const utterance = global.SpeechSynthesisUtterance.mock.results[0].value
    expect(utterance.lang).toBe('fr-FR')
    expect(global.speechSynthesis.speak).toHaveBeenCalledWith(utterance)
  })

  it('speak() returns a Promise that resolves', async () => {
    const promise = speak('test')
    const utterance = global.SpeechSynthesisUtterance.mock.results[0].value
    utterance.onend()
    await expect(promise).resolves.toBeUndefined()
  })

  it('stopSpeaking() calls window.speechSynthesis.cancel', () => {
    stopSpeaking()
    expect(global.speechSynthesis.cancel).toHaveBeenCalled()
  })

  it('announceScreen() calls speak after a delay', () => {
    announceScreen('dashboard', 'en-US')
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled()
    vi.advanceTimersByTime(600)
    expect(global.speechSynthesis.speak).toHaveBeenCalled()
  })

  it('Calling speak() twice cancels the first before starting the second', () => {
    speak('first')
    expect(global.speechSynthesis.cancel).toHaveBeenCalledTimes(1)
    speak('second')
    expect(global.speechSynthesis.cancel).toHaveBeenCalledTimes(2)
  })
})
