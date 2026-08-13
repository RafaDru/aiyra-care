const STORAGE_KEY = 'aiyracare.dismissedHints'

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function isHintDismissed(hintId: string): boolean {
  return readSet().has(hintId)
}

export function dismissHint(hintId: string): void {
  const set = readSet()
  set.add(hintId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}
