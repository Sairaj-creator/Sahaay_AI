let currentUtterance = null

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

    const voices = window.speechSynthesis.getVoices()
    const match =
      voices.find((voice) => voice.lang === lang) ||
      voices.find((voice) => voice.lang.startsWith(lang.split('-')[0])) ||
      voices.find((voice) => voice.lang.includes('en'))

    if (match) {
      utterance.voice = match
    }

    utterance.onend = resolve
    utterance.onerror = resolve

    currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking() {
  if (currentUtterance) {
    currentUtterance = null
  }
  window.speechSynthesis?.cancel()
}

export function announceScreen(text, lang = 'en-IN') {
  setTimeout(() => speak(text, lang), 300)
}
