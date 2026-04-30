# Sahaay AI — Manual Test Checklist

## Environment setup checks:
- `.env` has `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY` set
- `public/currency.onnx` is present
- `public/face-models/` contains all 7 weight files
- Backend is running on port 3001 (`node server/index.js`)
- Frontend is running (`npm run dev`)
- Browser is Chrome or Edge (required for Web Speech API)
- Mic and camera permissions granted

## OrbScreen checks:
- Page loads, orb visible, status shows `idle`
- Camera feed starts within 3 seconds (hidden video element active)
- Hint panel hidden by default, toggles open/closed correctly
- All 6 demo phrases visible when panel is open
- Mode buttons visible: scene, ocr, currency, face — active mode highlighted teal
- Offline banner does not appear when connected
- Disconnect network — offline banner appears immediately
- Reconnect — banner disappears

## Scene mode:
- Switch to scene, tap orb, say `"what do you see"`
- Orb pulses red during listening
- Orb turns amber during thinking
- Orb turns teal during speaking
- Response spoken aloud and shown in panel
- Response is a coherent scene description (2-3 sentences)

## OCR mode:
- Switch to ocr, point camera at printed text, tap orb, say `"read this"`
- Response reads the visible text aloud

## Currency mode (ONNX):
- Switch to currency, hold a ₹100 note flat under good light, tap orb
- Response says `"This is a one hundred rupee note."`
- Hold a ₹10 note — response either identifies it or says denomination unclear
- No response should mention ₹2000

## Face mode:
- Go to caregiver screen, upload a clear front-facing photo, enter a name, click Save face
- Button shows `"Analysing photo..."` during processing
- Status confirms face registered
- Return to orb, switch to face mode, tap orb while facing camera
- Response says `"This appears to be [name]."`
- Point camera away from any face — response says `"No face detected in frame."`

## Language switching:
- On settings screen, switch to Hindi — voice announcement plays in Hindi
- Switch to Kannada — announcement plays in Kannada
- Switch back to English — announcement plays in English

## Caregiver dashboard:
- Activity log shows recent queries with timestamp, mode, truncated text
- Registered faces grid shows uploaded photos with names
- Delete button removes a face and refreshes the grid
- Emergency contact form saves and GET route returns it

## Backend rate limiting:
- Send 31 POST requests to `/api/log-query` within 60 seconds
- 31st request returns 429 with `{ error: 'Too many requests. Please slow down.' }`
