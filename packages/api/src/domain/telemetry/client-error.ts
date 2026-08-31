import { createHash } from 'node:crypto'

export const CLIENT_ERROR_KINDS = ['ui_boundary', 'api', 'network'] as const
export type ClientErrorKind = typeof CLIENT_ERROR_KINDS[number]

export const CLIENT_ERROR_KIND_SET = new Set<string>(CLIENT_ERROR_KINDS)

export const CLIENT_ERROR_FEATURE_PATTERN = /^[a-z][a-z0-9_:-]{0,63}$/

export const CLIENT_ERROR_PROPERTY_KEYS = new Set([
  'http_status',
  'api_path',
  'component',
])

const FORBIDDEN_PROPERTY_KEY = /message|text|content|password|token|ocr|reply|body|prompt|credential|secret|stack/i

export interface ClientErrorInput {
  fingerprint: string
  feature: string
  errorKind: ClientErrorKind
  errorCode: string
  sessionId?: string
  route?: string
  patientId?: string
  properties?: Record<string, unknown>
}

export interface ClientErrorRecord {
  id: string
  accountId: string | null
  sessionId: string | null
  fingerprint: string
  feature: string
  errorKind: ClientErrorKind
  errorCode: string
  route: string | null
  patientId: string | null
  properties: Record<string, unknown>
  createdAt: Date
}

export interface ClientErrorAggregateRow {
  fingerprint: string
  feature: string
  errorKind: ClientErrorKind
  errorCode: string
  count: number
  accountCount: number
  lastSeenAt: string
}

export function computeClientErrorFingerprint(
  feature: string,
  errorKind: string,
  errorCode: string,
): string {
  const raw = `${feature}|${errorKind}|${errorCode}`.toLowerCase()
  return createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

export function sanitizeClientErrorCode(code: string | undefined): string {
  const trimmed = (code ?? 'unknown').trim().slice(0, 64)
  if (!trimmed) return 'unknown'
  return trimmed.replace(/[^\w.-]/g, '_').slice(0, 64)
}

export function sanitizeClientErrorFeature(feature: string | undefined): string | null {
  const trimmed = (feature ?? '').trim().toLowerCase().slice(0, 64)
  if (!trimmed || !CLIENT_ERROR_FEATURE_PATTERN.test(trimmed)) return null
  return trimmed
}

export function sanitizeClientErrorProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!properties) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (FORBIDDEN_PROPERTY_KEY.test(key)) continue
    if (!CLIENT_ERROR_PROPERTY_KEYS.has(key)) continue
    if (value === null || value === undefined) continue
    if (typeof value === 'string') {
      if (value.length > 128) continue
      if (FORBIDDEN_PROPERTY_KEY.test(value)) continue
      out[key] = value
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value
    }
  }
  return out
}
