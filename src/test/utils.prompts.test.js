import { describe, it, expect } from 'vitest'
import { PROMPTS, DEMO_SCRIPTS, checkDemoScript } from '../utils/prompts.js'

describe('utils/prompts', () => {
  it('PROMPTS object has keys scene, ocr, currency, face', () => {
    expect(PROMPTS).toHaveProperty('scene')
    expect(PROMPTS).toHaveProperty('ocr')
    expect(PROMPTS).toHaveProperty('currency')
    expect(PROMPTS).toHaveProperty('face')
  })

  it('Each prompt value is a non-empty string', () => {
    expect(typeof PROMPTS.scene).toBe('string')
    expect(PROMPTS.scene.length).toBeGreaterThan(0)
    expect(typeof PROMPTS.ocr).toBe('string')
    expect(PROMPTS.ocr.length).toBeGreaterThan(0)
    expect(typeof PROMPTS.currency).toBe('string')
    expect(PROMPTS.currency.length).toBeGreaterThan(0)
    expect(typeof PROMPTS.face).toBe('string')
    expect(PROMPTS.face.length).toBeGreaterThan(0)
  })

  it('PROMPTS.face contains the placeholder string "{CONTACTS_PLACEHOLDER}"', () => {
    expect(PROMPTS.face).toContain('{CONTACTS_PLACEHOLDER}')
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
