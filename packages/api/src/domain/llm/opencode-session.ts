import { createHash } from 'node:crypto'

const MAX_LEN = 128

/** Normaliza id estável para header `x-opencode-session` (OpenCode Zen/Go). */
export function normalizeOpenCodeSessionId(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('opencode session id vazio')
  if (trimmed.length <= MAX_LEN) return trimmed
  return createHash('sha256').update(trimmed).digest('hex').slice(0, MAX_LEN)
}

/** Hash estável de partes (mesmo input → mesmo id). */
export function stableOpenCodeSessionFromParts(parts: string[]): string {
  const joined = parts.filter((p) => p?.trim()).join('|')
  if (!joined) throw new Error('opencode session parts vazias')
  return createHash('sha256').update(joined).digest('hex').slice(0, 32)
}

export function resolveOpenCodeSessionId(
  explicit?: string | null,
  fallbackParts?: string[],
): string {
  if (explicit?.trim()) return normalizeOpenCodeSessionId(explicit)
  if (fallbackParts?.length) {
    return normalizeOpenCodeSessionId(`aiyracare:${stableOpenCodeSessionFromParts(fallbackParts)}`)
  }
  throw new Error('opencode session id não definido')
}

export function buildAvaOpenCodeSessionId(input: {
  conversationId?: string | null
  scopeId: string
  patientId: string
  healthThreadId?: string | null
}): string {
  if (input.conversationId?.trim()) return normalizeOpenCodeSessionId(input.conversationId.trim())
  if (input.healthThreadId?.trim()) {
    return normalizeOpenCodeSessionId(`ava-thread:${input.healthThreadId.trim()}`)
  }
  return normalizeOpenCodeSessionId(`ava:${input.scopeId}:${input.patientId}`)
}
