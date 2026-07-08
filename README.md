<div align="center">
  <h1>👁️ Sahaay AI</h1>
  <p><strong>A Voice-First, Camera-Powered AI Companion for Visually Impaired Users in India.</strong></p>
</div>

---

## 🌟 About the Project

**Sahaay AI** is a highly accessible web application built specifically to assist the visually impaired. It acts as an intelligent set of eyes, providing real-time scene descriptions, reading text, identifying Indian currency notes offline, and recognizing the faces of registered contacts and caregivers. 

By combining cutting-edge Vision Language Models (VLMs), on-device Machine Learning (via ONNX WebAssembly), and speech technologies, Sahaay creates a seamless, voice-driven experience that empowers users in their daily lives. 

---

## ✨ Key Features

- **🗣️ Voice-First Interface:** Entirely controllable via voice commands (Wake word integration) with built-in Speech-To-Text (Whisper) and Text-To-Speech. 
- **🖼️ Scene & Object Recognition:** Snap a picture and ask questions! Powered by advanced Vision models (Gemini, Groq, NVIDIA) to describe surroundings in detail.
- **📖 Reading Assistant:** Point the camera at documents, signs, or menus to have the text read aloud.
- **💵 Offline Currency Detection:** Identifies Indian Rupee notes in real-time, completely offline, using an embedded ONNX model. Includes built-in safeguards to suppress false detections.
- **👥 Facial Recognition:** Register family and friends. Sahaay will match faces seen through the camera against its SQLite database.
- **🚨 Emergency Actions:** Quickly trigger calls or alerts to predefined emergency contacts via voice.

---

## 🛠️ Technology Stack

### **Frontend** (React Workspace)
- ⚛️ **React 18 & Vite** for lightning-fast UI rendering.
- 🎨 **Tailwind CSS v4** for clean, accessible styling.
- 🧠 **ONNX Runtime Web** & **TensorFlow.js** for running the lightweight currency detection models directly in the browser (no latency, full privacy!).
- 🎤 **Web Speech API** for native browser Text-to-Speech capabilities.

### **Backend** (Node.js Workspace)
- 🟢 **Express.js** acting as a secure proxy to hide sensitive AI API keys from the client.
- 🗄️ **better-sqlite3** for lightning-fast, local persistence of query logs, registered faces, and emergency contacts.
- 🛡️ **express-rate-limit** to prevent abuse on AI endpoints.

---

## 🚀 Getting Started

Sahaay AI is configured as a modern **npm workspace** containing both a `frontend` and `backend`.

### 1. Prerequisites
- Node.js (v20+ recommended)
- A webcam (for testing vision features)
- Chrome or Edge (recommended for best Web Speech API compatibility)

### 2. Environment Setup
Create a `.env` file in the **root** folder based on `.env.example` and add your API keys:
```env
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
NVIDIA_API_KEY=your_key_here
```

### 3. Installation
Run this from the **root folder** to install dependencies for both the frontend and backend:
```bash
npm install
```

### 4. Running Locally
Start both the Vite frontend server and the Node.js backend server simultaneously:
```bash
npm run dev
```
- 🌐 Frontend will be available at: `http://localhost:5174/app`
- ⚙️ Backend API will be available at: `http://localhost:3001`

*(Note: During local development, the Vite dev server automatically proxies `/api/*` requests to the Node.js backend).*

---

## ☁️ Deployment (Render)

Sahaay AI is perfectly structured for deployment on platforms like Render. 

1. Ensure the **Build Command** is set to: `npm install && npm run build`
2. Ensure the **Start Command** is set to: `npm start` (this runs `cross-env NODE_ENV=production node index.js` in the backend).
3. **Important for SQLite:** Set an environment variable `DB_PATH=/var/data/sahaay.db` and mount a **Persistent Disk** to `/var/data` on Render. This ensures your registered faces and logs survive server restarts!

---

## 📝 Important Notes

- 🤖 The backend contains proxy routes (`/api/vision`, `/api/whisper`, `/api/text`) to securely handle requests to Gemini, NVIDIA, and Groq without exposing keys to the browser.
- 💵 The custom ONNX currency model weights are located in `frontend/public/currency-model/best.onnx`.
- 🧩 Ensure `legacy-peer-deps=true` is maintained if you encounter peer dependency warnings related to older ML packages.

<div align="center">
  <i>Built with ❤️ for a more accessible future.</i>
</div>
