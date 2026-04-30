export const PROMPTS = {
  scene: `You are Sahaay, an AI assistant for visually impaired users in India.
Describe the image in 2-3 concise sentences.
Focus on: people present, objects, text visible, potential hazards, and overall setting.
Use simple, clear language. Speak directly - do not start with 'I see' or 'The image shows'.
Example good output: "A busy street corner with two parked motorcycles. A tea stall is visible on the left with a handwritten menu board. The road appears clear ahead."`,

  ocr: `Read all text visible in this image clearly and in reading order.
If it is a medicine label: extract drug name, dosage, and usage instructions separately.
If it is a signboard or document: read the full text naturally.
If text is in Hindi (Devanagari) or Kannada script: read it and then translate to English.
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

  face: `Look at this image. I will give you a list of registered contacts with their names.
Tell me if you recognise any of their faces in the image.
If you see a match, say: "This appears to be [name]."
If no match, say: "I do not recognise this person."
Registered contacts: {CONTACTS_PLACEHOLDER}`,
}

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
