export const PROMPTS = {
  scene: `You are Sahaay, an AI assistant for visually impaired users in India.
Describe the image in 2-3 concise sentences.
Focus on: people present, objects, text visible, potential hazards, and overall setting.
Use simple, clear language. Speak directly - do not start with 'I see' or 'The image shows'.
Example good output: "A busy street corner with two parked motorcycles. A tea stall is visible on the left with a handwritten menu board. The road appears clear ahead."`,

  ocr: `Read all text visible in this image clearly and in reading order.
If it is a medicine label: extract drug name, dosage, and usage instructions separately.
If it is a signboard or document: read the full text naturally.
If the text is in a different language from the one you are asked to reply in: read it, then give a short translation.
Keep it brief and clear. Do not describe the image - only read the text.`,

  currency: `Identify the Indian rupee note in this image.
Reply ONLY with one of these exact phrases:
- "This is a ten rupee note."
- "This is a twenty rupee note."
- "This is a fifty rupee note."
- "This is a one hundred rupee note."
- "This is a two hundred rupee note."
- "This is a five hundred rupee note."
If you cannot identify a rupee note clearly, say exactly: "I could not identify a rupee note. Please hold the note flat under good light."
No other output. No explanation.`,
}

// Face recognition is deliberately NOT done by a cloud vision model: it has never
// seen the registered contacts, so it can only guess a name. Faces are matched
// on-device in utils/faceMatch.js.

const REPLY_LANGUAGE = {
  'en-IN': 'Respond only in English.',
  'hi-IN':
    'Respond only in Hindi, written in Devanagari script. If the instructions above give an exact English phrase, say the same thing in Hindi instead.',
  'kn-IN':
    'Respond only in Kannada, written in Kannada script. If the instructions above give an exact English phrase, say the same thing in Kannada instead.',
}

const MAX_QUESTION_LENGTH = 300

/**
 * Build the vision-model prompt for a mode, adding the user's spoken question
 * (scene and read modes) and the language the answer will be spoken in.
 */
export function buildPrompt(mode, { question = '', lang = 'en-IN' } = {}) {
  const parts = [PROMPTS[mode] || PROMPTS.scene]

  const trimmed = (question || '').trim().slice(0, MAX_QUESTION_LENGTH)
  if (trimmed && mode !== 'currency') {
    parts.push(
      `The user asked: "${trimmed.replace(/"/g, "'")}". Answer that question first, using only what is visible in the image. If the image does not show the answer, say so.`
    )
  }

  parts.push(REPLY_LANGUAGE[lang] || REPLY_LANGUAGE['en-IN'])
  return parts.join('\n\n')
}

// Scripted answers for the /demo stage screen ONLY. They never look at the camera,
// so they must never be used in the real assistant.
export const DEMO_SCRIPTS = {
  'what do you see':
    'A well-lit desk with a laptop, some notebooks, and a water bottle. The room appears to be an office or study space.',
  'what is in front': 'A well-lit desk with a laptop, some notebooks, and a water bottle.',
  'how much is this': 'This is a five hundred rupee note.',
  'which note': 'This is a five hundred rupee note.',
  'read this':
    'The label reads: Paracetamol 500 milligram tablets. Take one tablet every six hours. Do not exceed four tablets in twenty-four hours.',
  'what does it say':
    'The label reads: Paracetamol 500 milligram tablets. Take one tablet every six hours.',
}

export function checkDemoScript(transcript) {
  if (!transcript) return null
  const lower = transcript.toLowerCase()
  const key = Object.keys(DEMO_SCRIPTS).find((phrase) => lower.includes(phrase))
  return key ? DEMO_SCRIPTS[key] : null
}
