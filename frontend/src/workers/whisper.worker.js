// Runs Whisper speech-to-text inside the browser, off the main thread.
// The model weights are downloaded once and cached by the browser; the audio
// itself never leaves the device.
import { pipeline } from '@huggingface/transformers'

const MODEL_ID = 'onnx-community/whisper-base' // multilingual: English, Hindi, Kannada

// WebAssembly + 8-bit weights, chosen by measurement (3.5 s spoken question):
//   wasm   q8           ->  79 MB download, ~2.0 s per transcription
//   webgpu fp32/q4      -> 209 MB download, ~5.7 s per transcription
// Same transcript from both. WASM also works on phones without WebGPU.
const DEVICE = 'wasm'
const DTYPE = 'q8'

let transcriberPromise = null

function getTranscriber() {
  if (!transcriberPromise) {
    const device = DEVICE
    transcriberPromise = pipeline('automatic-speech-recognition', MODEL_ID, {
      device,
      dtype: DTYPE,
      progress_callback: (p) => {
        if (p.status === 'progress' || p.status === 'done') {
          self.postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total, status: p.status })
        }
      },
    })
      .then((t) => {
        self.postMessage({ type: 'ready', device })
        return t
      })
      .catch((err) => {
        transcriberPromise = null // allow a retry, e.g. after the network comes back
        throw err
      })
  }
  return transcriberPromise
}

self.onmessage = async ({ data }) => {
  const { id, type } = data
  try {
    if (type === 'load') {
      await getTranscriber()
      self.postMessage({ id, type: 'loaded' })
      return
    }

    if (type === 'transcribe') {
      const transcriber = await getTranscriber()
      const output = await transcriber(data.audio, { language: data.language, task: 'transcribe' })
      self.postMessage({ id, type: 'result', text: (output?.text || '').trim() })
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err?.message || String(err) })
  }
}
