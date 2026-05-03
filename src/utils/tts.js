let currentUtterance = null
let keepAliveTimer = null

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
      const match =
        voices.find((voice) => voice.lang === lang) ||
        voices.find((voice) => voice.lang.startsWith(lang.split('-')[0])) ||
        voices.find((voice) => voice.lang.includes('en'))

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
