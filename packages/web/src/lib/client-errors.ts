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
const pendingIngest: Promise<void>[] = []
/** Teto para não bloquear envio de suporte se ingest de telemetria travar (ex. E2E / rede lenta). */
const AWAIT_PENDING_INGEST_MAX_MS = 2_000
/** Aborta fetch pendente para liberar pool HTTP (evita fila infinita antes de POST /support/reports). */
const INGEST_FETCH_TIMEOUT_MS = 4_000

function withIngestTimeout(run: (signal?: AbortSignal) => Promise<unknown>): Promise<void> {
  if (typeof AbortController === 'undefined') {
    return Promise.resolve(run()).then(() => undefined, () => undefined)
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), INGEST_FETCH_TIMEOUT_MS)
  return run(controller.signal).then(() => undefined, () => undefined).finally(() => clearTimeout(timer))
}

/** Aguarda telemetria fire-and-forget antes do bundle de suporte (evita race com `client_errors`). */
export async function awaitPendingClientErrorReports(): Promise<void> {
  const batch = pendingIngest.splice(0)
  if (!batch.length) return
  await Promise.race([
    Promise.allSettled(batch),
    new Promise<void>((resolve) => {
      setTimeout(resolve, AWAIT_PENDING_INGEST_MAX_MS)
    }),
  ])
}

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
  const ingest = withIngestTimeout((signal) =>
    api.telemetry.reportClientErrors(
      {
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
      },
      signal ? { signal } : undefined,
    ),
  )
  pendingIngest.push(ingest)
}

export function reportApiClientError(
  apiPath: string,
  status: number,
  options?: { patientId?: string; route?: string; message?: string },
): void {
  const errorCode = status > 0
    ? `HTTP_${status}`
    : sanitizeErrorCode(options?.message ?? 'api_error')
  void reportClientError({
    errorKind: 'api',
    errorCode,
    apiPath,
    patientId: options?.patientId,
    route: options?.route,
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

/** Ava / LLM boundary — stable `ava_companion` for CH bridge (phase 4). */
export function reportAvaCompanionError(
  apiPath: string,
  statusOrCode: number | string,
  options?: { patientId?: string; route?: string },
): void {
  const errorCode =
    typeof statusOrCode === 'number' && statusOrCode > 0
      ? `HTTP_${statusOrCode}`
      : sanitizeErrorCode(String(statusOrCode))
  void reportClientError({
    feature: 'ava_companion',
    errorKind: 'api',
    errorCode,
    apiPath,
    patientId: options?.patientId,
    route: options?.route,
  }).catch(() => undefined)
}

/** Account/settings flows — stable `account_settings` feature for CH bridge pilot. */
export function reportAccountSettingsFailure(
  apiPath: string,
  statusOrCode: number | string,
  options?: { route?: string },
): void {
  const errorCode =
    typeof statusOrCode === 'number' && statusOrCode > 0
      ? `HTTP_${statusOrCode}`
      : sanitizeErrorCode(String(statusOrCode))
  void reportClientError({
    feature: 'account_settings',
    errorKind: 'api',
    errorCode,
    apiPath,
    route: options?.route,
  }).catch(() => undefined)
}
