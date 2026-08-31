import {
  computeClientErrorFingerprint,
  deriveFeatureFromApiPath,
  deriveFeatureFromRoute,
  sanitizeErrorCode,
  type ClientErrorKind,
} from './client-error-fingerprint.js'

const SESSION_KEY = 'aiyracare.browser_session'
const DEDUPE_MS = 15_000
const recentKeys = new Map<string, number>()

function getBrowserSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

function shouldDedupe(fingerprint: string): boolean {
  const now = Date.now()
  const last = recentKeys.get(fingerprint)
  if (last && now - last < DEDUPE_MS) return true
  recentKeys.set(fingerprint, now)
  if (recentKeys.size > 200) {
    for (const [key, ts] of recentKeys) {
      if (now - ts > DEDUPE_MS) recentKeys.delete(key)
    }
  }
  return false
}

export interface ReportClientErrorInput {
  feature?: string
  errorKind: ClientErrorKind
  errorCode: string
  route?: string
  patientId?: string
  apiPath?: string
  properties?: Record<string, unknown>
}

/**
 * Cataloga erro cliente (sem PHI) — fire-and-forget com dedupe curto.
 */
export async function reportClientError(input: ReportClientErrorInput): Promise<void> {
  const route = input.route ?? (typeof window !== 'undefined' ? window.location.pathname : undefined)
  const feature = input.feature
    ?? (input.apiPath ? deriveFeatureFromApiPath(input.apiPath) : deriveFeatureFromRoute(route ?? '/'))
  const errorCode = sanitizeErrorCode(input.errorCode)
  const fingerprint = await computeClientErrorFingerprint(feature, input.errorKind, errorCode)
  if (shouldDedupe(fingerprint)) return

  const { api } = await import('./api.js')
  await api.telemetry.reportClientErrors({
    errors: [{
      fingerprint,
      feature,
      errorKind: input.errorKind,
      errorCode,
      sessionId: getBrowserSessionId(),
      route,
      patientId: input.patientId,
      properties: {
        ...(input.apiPath ? { api_path: input.apiPath.split('?')[0].slice(0, 128) } : {}),
        ...input.properties,
      },
    }],
  })
}

export function reportApiClientError(
  apiPath: string,
  status: number,
  patientId?: string,
): void {
  void reportClientError({
    errorKind: 'api',
    errorCode: `HTTP_${status}`,
    apiPath,
    patientId,
  }).catch(() => undefined)
}

export function reportNetworkClientError(apiPath: string): void {
  void reportClientError({
    errorKind: 'network',
    errorCode: 'NETWORK',
    apiPath,
  }).catch(() => undefined)
}

export function reportUiBoundaryError(componentName: string, errorName: string): void {
  void reportClientError({
    feature: 'ui',
    errorKind: 'ui_boundary',
    errorCode: sanitizeErrorCode(errorName || 'ReactError'),
    properties: { component: componentName.slice(0, 64) },
  }).catch(() => undefined)
}
