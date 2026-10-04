/** Sanitiza `last_error` do outbox para exibição no CH (sem URLs/segredos). */
export function sanitizeDispatchLastError(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null
  let text = String(raw)
  text = text.replace(/https?:\/\/[^\s'"]+/gi, '[url]')
  text = text.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+/=]{8,}/gi,
    '$1[redacted]',
  )
  text = text.replace(
    /\b(x-[a-z-]+-key|api[_-]?key|token|secret)\s*[:=]\s*[^\s,&]+/gi,
    '$1=[redacted]',
  )
  text = text.replace(/[A-Za-z0-9_-]{32,}/g, (m) => (m.length > 40 ? '[token]' : m))
  return text.trim().slice(0, 500)
}

export type IncidentDispatchSnapshot = {
  status: string | null
  attemptCount: number
  lastError: string | null
  forwardedAt: string | null
  updatedAt: string | null
}
