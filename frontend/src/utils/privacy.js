// "On-device only" mode: camera frames, audio and questions never leave the device.
// The storage key predates the rename (it was the "Offline-first" toggle), so it is
// kept as-is to preserve existing users' choice.
export const ON_DEVICE_KEY = 'sahaay-offline-mode'

export function isOnDeviceOnly() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ON_DEVICE_KEY) === 'true'
  } catch {
    return false
  }
}
