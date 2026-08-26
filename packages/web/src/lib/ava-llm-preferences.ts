const STORAGE_KEY = 'aiyracare.avaAllowLlmDataSharing'

export function readAvaAllowLlmDataSharing(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeAvaAllowLlmDataSharing(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // ignore
  }
}

const IMAGE_ATTACH_KEY = 'aiyracare.avaImageAttachWarningDismissed'

export function readAvaImageAttachWarningDismissed(): boolean {
  try {
    return localStorage.getItem(IMAGE_ATTACH_KEY) === '1'
  } catch {
    return false
  }
}

export function writeAvaImageAttachWarningDismissed(value: boolean): void {
  try {
    localStorage.setItem(IMAGE_ATTACH_KEY, value ? '1' : '0')
  } catch {
    // ignore
  }
}

const LAST_ACTIVITY_KEY = 'aiyracare.avaLastActivityAt'

export function touchAvaLastActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

export function readAvaLastActivityAt(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}
