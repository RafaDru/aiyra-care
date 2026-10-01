const STORAGE_KEY = 'aiyra.activeCareCircleId'

export function readStoredActiveCareCircleId(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw && raw.length > 0 ? raw : null
  } catch {
    return null
  }
}

export function writeStoredActiveCareCircleId(circleId: string | null): void {
  try {
    if (!circleId) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, circleId)
  } catch {
    /* ignore quota / private mode */
  }
}
