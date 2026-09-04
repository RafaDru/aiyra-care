export type ClientErrorKind = 'ui_boundary' | 'api' | 'network'

/** Deriva chave estável de feature a partir da rota do browser. */
export function deriveFeatureFromRoute(route: string): string {
  const path = route.split('?')[0].replace(/\/+$/, '') || '/'
  if (path === '/' || path === '') return 'dashboard'
  if (path.startsWith('/patients/') && path.includes('/context')) return 'patient_context'
  if (path.startsWith('/patients/')) return 'patient_detail'
  if (path.startsWith('/integrations')) return 'integrations'
  if (path.startsWith('/settings/family')) return 'settings_family'
  if (path.startsWith('/settings/plan')) return 'billing'
  if (path.startsWith('/settings')) return 'settings'
  if (path.startsWith('/invite/accept')) return 'family_invite'
  if (path.startsWith('/compliance')) return 'compliance'
  if (path.startsWith('/onboarding')) return 'onboarding'
  if (path.startsWith('/emergency')) return 'emergency'
  if (path.startsWith('/roadmap')) return 'roadmap'
  return 'app'
}

/** Normaliza path da API para fingerprint (sem query). */
export function deriveFeatureFromApiPath(apiPath: string): string {
  const base = apiPath.split('?')[0]
  const segments = base.split('/').filter(Boolean)
  if (!segments.length) return 'api:root'
  if (segments[0] === 'patients' && segments.length >= 3) {
    return `api:patients:${segments[2] ?? 'resource'}`
  }
  if (segments[0] === 'patients' && segments.length === 2) {
    return 'api:patients:item'
  }
  if (segments[0] === 'integration-links') return 'api:integration_links'
  if (segments[0] === 'ava') return 'api:ava'
  return `api:${segments[0]}`
}

export async function computeClientErrorFingerprint(
  feature: string,
  errorKind: ClientErrorKind,
  errorCode: string,
): Promise<string> {
  const raw = `${feature}|${errorKind}|${errorCode}`.toLowerCase()
  const data = new TextEncoder().encode(raw)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 16)
}

export function sanitizeErrorCode(code: string): string {
  const trimmed = code.trim().slice(0, 64)
  if (!trimmed) return 'unknown'
  return trimmed.replace(/[^\w.-]/g, '_').slice(0, 64)
}
