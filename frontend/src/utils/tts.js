import { isOnDeviceOnly } from './privacy.js'

let currentUtterance = null
let keepAliveTimer = null

/**
 * Choose a speech voice for a language.
 *
 * Voices with localService === false (e.g. Chrome's "Google हिन्दी") synthesise in the
 * cloud, so the reply text is sent to Google. Local voices are always preferred; with
 * localOnly they are the only candidates.
 */
export function pickVoice(voices, lang, { localOnly = false } = {}) {
  const base = lang.split('-')[0]
  const byLang = (list) =>
    list.find((v) => v.lang === lang) ||
    list.find((v) => v.lang?.startsWith(base)) ||
    null

  const local = voices.filter((v) => v.localService)
  const localMatch = byLang(local)
  if (localMatch) return localMatch

  if (localOnly) {
    // No local voice for this language: an English local voice is better than silence.
    return local.find((v) => v.lang?.startsWith('en')) || local[0] || null
  }

  return byLang(voices) || voices.find((v) => v.lang?.includes('en')) || null
}

// Chrome has a known bug where speechSynthesis silently stops after ~15s.
// This keepalive timer calls pause/resume every 10s to prevent that.
function startKeepAlive() {
  stopKeepAlive()
  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }
  }, 10000)
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer)
    keepAliveTimer = null
  }
}

export function speak(text, lang = 'en-IN') {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve()
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const match = pickVoice(voices, lang, { localOnly: isOnDeviceOnly() })

      if (match) {
        utterance.voice = match
      }

      currentUtterance = utterance
      startKeepAlive()
      window.speechSynthesis.speak(utterance)
    }

    utterance.onend = () => {
      stopKeepAlive()
      resolve()
    }
    utterance.onerror = () => {
      stopKeepAlive()
      resolve()
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoiceAndSpeak()
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoiceAndSpeak()
      }
    }
  })
}

export function stopSpeaking() {
  stopKeepAlive()
  currentUtterance = null
  window.speechSynthesis?.cancel()
}

export function announceScreen(text, lang = 'en-IN') {
  setTimeout(() => speak(text, lang), 300)
}
