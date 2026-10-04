import {
  computeClientErrorFingerprint,
  deriveFeatureFromApiPath,
  deriveFeatureFromRoute,
  sanitizeErrorCode,
  type ClientErrorKind,
} from '@/lib/client-error-fingerprint'
import { getMobileSessionId } from '@/lib/mobile-session-id'
import { getAccessToken, supabaseConfigured } from '@/lib/supabase'

const DEDUPE_MS = 15_000
const recent = new Map<string, number>()

let currentRoute = '/'

export function setMobileTelemetryRoute(route: string): void {
  currentRoute = route || '/'
}

function shouldDedupe(key: string): boolean {
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < DEDUPE_MS) return true
  recent.set(key, now)
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

async function postClientErrors(
  errors: Array<{
    fingerprint: string
    feature: string
    errorKind: ClientErrorKind
    errorCode: string
    sessionId: string
    route?: string
    patientId?: string
    properties?: Record<string, unknown>
  }>,
): Promise<void> {
  if (!supabaseConfigured) return
  const token = await getAccessToken()
  if (!token) return

  const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3010'
  await fetch(`${base.replace(/\/$/, '')}/telemetry/client-errors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ errors }),
  })
}

export async function reportClientError(input: ReportClientErrorInput): Promise<void> {
  const route = input.route ?? currentRoute
  const feature =
    input.feature ??
    (input.apiPath ? deriveFeatureFromApiPath(input.apiPath) : deriveFeatureFromRoute(route))
  const errorCode = sanitizeErrorCode(input.errorCode)
  const fingerprint = await computeClientErrorFingerprint(feature, input.errorKind, errorCode)
  if (shouldDedupe(fingerprint)) return

  const sessionId = await getMobileSessionId()
  try {
    await postClientErrors([
      {
        fingerprint,
        feature,
        errorKind: input.errorKind,
        errorCode,
        sessionId,
        route,
        patientId: input.patientId,
        properties: {
          platform: 'mobile',
          ...(input.apiPath ? { api_path: input.apiPath.split('?')[0].slice(0, 128) } : {}),
          ...input.properties,
        },
      },
    ])
  } catch {
    /* fire-and-forget */
  }
}

export function reportApiClientError(
  apiPath: string,
  status: number,
  options?: { patientId?: string; route?: string; message?: string },
): void {
  const errorCode = status > 0 ? `HTTP_${status}` : sanitizeErrorCode(options?.message ?? 'api_error')
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

export function reportUiBoundaryError(
  componentName: string,
  errorName: string,
  options?: { feature?: string; route?: string },
): void {
  void reportClientError({
    feature: options?.feature ?? 'mobile_shell',
    errorKind: 'ui_boundary',
    errorCode: sanitizeErrorCode(errorName || 'ReactError'),
    route: options?.route,
    properties: { component: componentName.slice(0, 64) },
  }).catch(() => undefined)
}

/**
 * Telemetria ops em falhas de auth (com JWT após cadastro/login parcial).
 */
export async function reportAuthClientError(
  context: 'login' | 'signup' | 'google',
  errorCode: string,
): Promise<void> {
  const fingerprint = await computeClientErrorFingerprint(
    'mobile_shell',
    'api',
    `mobile_auth_${context}_${errorCode.slice(0, 80)}`,
  )
  if (shouldDedupe(fingerprint)) return

  const token = await getAccessToken()
  if (!token) return

  const sessionId = await getMobileSessionId()
  try {
    await postClientErrors([
      {
        fingerprint,
        feature: 'mobile_shell',
        errorKind: 'api',
        errorCode: errorCode.slice(0, 200),
        sessionId,
        route: '/(auth)/login',
        properties: { auth_context: context, platform: 'mobile' },
      },
    ])
  } catch {
    /* fire-and-forget */
  }
}
