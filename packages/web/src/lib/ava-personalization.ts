/** Primeiro nome do cuidador para linha narrativa da Ava. */
export function caregiverFirstName(
  displayName: string | null | undefined,
  email?: string | null,
): string | null {
  if (displayName?.trim()) {
    const first = displayName.trim().split(/\s+/)[0]
    if (first && first.length >= 2) return first
  }
  if (email?.trim()) {
    const local = email.split('@')[0]?.trim()
    if (local && local.length >= 2) return local
  }
  return null
}
