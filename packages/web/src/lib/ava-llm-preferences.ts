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
