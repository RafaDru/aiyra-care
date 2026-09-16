const STORAGE_KEY = 'aiyracare.first_visit_tour_completed'

export function isFirstVisitTourCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markFirstVisitTourCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}
