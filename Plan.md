# Sahaay AI Progress Plan

## Completed

- Repo scaffold created with the required root files: `.env.example`, `.gitignore`, `.npmrc`, `package.json`, `vite.config.js`, `index.html`, and `README.md`.
- Frontend folder structure created under `src/` with `hooks/`, `utils/`, `screens/`, `components/`, and `assets/`.
- Public assets scaffolded under `public/`, including `favicon.svg` and placeholder `currency-model` files.
- Core AI utilities implemented:
  - `src/utils/prompts.js`
  - `src/utils/tts.js`
  - `src/utils/openai.js`
  - `src/utils/currency.js`
- Core AI hooks implemented:
  - `src/hooks/useAI.js`
  - `src/hooks/useMic.js`
  - `src/hooks/useVision.js`
- Test harness implemented in `src/App.jsx`.
- React entry files added:
  - `src/main.jsx`
  - `src/index.css`
- Placeholder screen files created so the full screen structure exists for the frontend team:
  - `src/screens/OrbScreen.jsx`
  - `src/screens/OnboardingScreen.jsx`
  - `src/screens/DemoScreen.jsx`
  - `src/screens/CaregiverScreen.jsx`
  - `src/screens/QuickActionsScreen.jsx`
  - `src/screens/SettingsScreen.jsx`
- Backend scaffold created:
  - `server/index.js`
  - `server/db.js`
- Project dependencies installed successfully.
- Frontend production build completed successfully with `npm run build`.
- SQLite bootstrap verified successfully by loading `server/db.js`.

## Notes

- `.npmrc` uses `legacy-peer-deps=true` because `@teachablemachine/image` has an outdated TensorFlow peer dependency declaration.
- `public/currency-model/` currently contains placeholders and still needs the real Teachable Machine export.
- Screen files are placeholders only and still need UI implementation by the frontend owners.
- Real API keys still need to be added to `.env`.

## Current Status

- The repo is bootstrapped and buildable.
- The AI integration layer and backend scaffold are in place.
- The next work should focus on real screen implementation, real environment configuration, and replacing placeholder currency model assets.
