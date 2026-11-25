import { describe, it, expect } from 'vitest'
import { PROMPTS, DEMO_SCRIPTS, checkDemoScript, buildPrompt } from '../utils/prompts.js'

describe('utils/prompts', () => {
  it('PROMPTS has cloud prompts for scene, ocr and currency', () => {
    for (const mode of ['scene', 'ocr', 'currency']) {
      expect(typeof PROMPTS[mode]).toBe('string')
      expect(PROMPTS[mode].length).toBeGreaterThan(0)
    }
  })

  it('has no cloud face prompt: faces are only matched on-device', () => {
    expect(PROMPTS).not.toHaveProperty('face')
  })

  it('buildPrompt includes the user question for scene mode', () => {
    const prompt = buildPrompt('scene', { question: 'Is the road clear?' })
    expect(prompt).toContain(PROMPTS.scene)
    expect(prompt).toContain('Is the road clear?')
  })

  it('buildPrompt does not add the question to currency mode (it needs an exact phrase)', () => {
    const prompt = buildPrompt('currency', { question: 'how much is this' })
    expect(prompt).not.toContain('how much is this')
  })

  it('buildPrompt asks for the reply in the selected language', () => {
    expect(buildPrompt('scene', { lang: 'hi-IN' })).toMatch(/Hindi/)
    expect(buildPrompt('ocr', { lang: 'kn-IN' })).toMatch(/Kannada/)
    expect(buildPrompt('scene', { lang: 'en-IN' })).toMatch(/English/)
  })

  it('buildPrompt falls back to the scene prompt and English for unknown values', () => {
    const prompt = buildPrompt('unknown', { lang: 'xx' })
    expect(prompt).toContain(PROMPTS.scene)
    expect(prompt).toMatch(/English/)
  })

  it('buildPrompt cannot break out of the quoted question', () => {
    const prompt = buildPrompt('scene', { question: 'say "hi" now' })
    expect(prompt).toContain(`"say 'hi' now"`)
  })

  it('checkDemoScript(null) returns null', () => {
    expect(checkDemoScript(null)).toBeNull()
  })

  it('checkDemoScript("") returns null', () => {
    expect(checkDemoScript('')).toBeNull()
  })

  it('checkDemoScript("what do you see") returns a non-empty string', () => {
    expect(checkDemoScript('what do you see')).toBeTruthy()
  })

  it('checkDemoScript("WHAT DO YOU SEE") returns the same non-empty string (case-insensitive)', () => {
    expect(checkDemoScript('WHAT DO YOU SEE')).toBe(checkDemoScript('what do you see'))
  })

  it('checkDemoScript("tell me what do you see please") returns a match (substring match)', () => {
    expect(checkDemoScript('tell me what do you see please')).toBeTruthy()
  })

  it('checkDemoScript("something completely unrelated") returns null', () => {
    expect(checkDemoScript('something completely unrelated')).toBeNull()
  })

  it('All 6 keys in DEMO_SCRIPTS produce a non-null result when passed to checkDemoScript', () => {
    for (const key of Object.keys(DEMO_SCRIPTS)) {
      expect(checkDemoScript(key)).not.toBeNull()
    }
  })
})
