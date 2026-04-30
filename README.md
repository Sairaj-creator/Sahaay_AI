# Sahaay AI

Voice-first, camera-powered AI companion for visually impaired users in India.

## Stack

- React 18 + Vite
- Tailwind CSS v4
- Web Speech API for STT/TTS
- Gemini 2.0 Flash Lite with Groq vision fallback
- Tesseract.js OCR
- TensorFlow.js + Teachable Machine for offline currency detection
- Express + SQLite backend scaffold

## Setup

1. Create `.env` from `.env.example`.
2. Install all dependencies with `npm install`.
3. Start the backend separately with `node server/index.js`.
4. Run the frontend with `npm run dev`.

## Notes

- Use Chrome or Edge for speech recognition.
- This repo includes `.npmrc` with `legacy-peer-deps=true` because `@teachablemachine/image` still declares an outdated TensorFlow peer range.
- Set `VITE_API_BASE_URL` to your hosted backend URL in production. During local development, Vite proxies `/api/*` to `http://localhost:3001`.
- Place trained Teachable Machine exports in `public/currency-model/`.
- The `src/hooks/useAI.js` contract is the shared integration surface for the team.
