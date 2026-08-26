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
