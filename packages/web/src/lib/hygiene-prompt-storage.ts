const SNOOZE_KEY = 'aiyracare:hygiene-prompt-snoozed-until'

export function isHygienePromptSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY)
    if (!raw) return false
    const until = Number(raw)
    if (!Number.isFinite(until)) return false
    return Date.now() < until
  } catch {
    return false
  }
}

export function snoozeHygienePrompt(hours = 24): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + hours * 3600 * 1000))
  } catch {
    /* ignore */
  }
}
