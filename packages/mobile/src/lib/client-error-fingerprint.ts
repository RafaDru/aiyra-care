export type ClientErrorKind = 'ui_boundary' | 'api' | 'network'

/** Deriva feature a partir da rota Expo Router (sem expor UUID em fingerprint). */
export function deriveFeatureFromRoute(route: string): string {
  const path = route.split('?')[0] || '/'
  if (path.includes('settings/family')) return 'family_hub'
  if (path.includes('(tabs)/settings') || path.endsWith('/settings')) return 'settings'
  if (path.includes('/onboarding')) return 'onboarding'
  if (path.includes('/compliance')) return 'compliance'
  if (path.includes('/patient/')) return 'patient_detail'
  if (path.includes('(tabs)') || path.includes('/index')) return 'dashboard'
  if (path.includes('/login') || path.includes('/welcome')) return 'auth'
  return 'mobile_shell'
}

export function deriveFeatureFromApiPath(apiPath: string): string {
  const base = apiPath.split('?')[0]
  const segments = base.split('/').filter(Boolean)
  if (!segments.length) return 'api:root'
  if (segments[0] === 'patients' && segments.length >= 3) {
    return `api:patients:${segments[2] ?? 'resource'}`
  }
  if (segments[0] === 'patients' && segments.length === 2) return 'api:patients:item'
  if (segments[0] === 'integration-links') return 'api:integration_links'
  if (segments[0] === 'ava') return 'api:ava'
  return `api:${segments[0]}`
}

function fallbackFingerprint(feature: string, errorKind: ClientErrorKind, errorCode: string): string {
  let h = 0
  const raw = `${feature}|${errorKind}|${errorCode}`.toLowerCase()
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0').slice(0, 16)
}

export async function computeClientErrorFingerprint(
  feature: string,
  errorKind: ClientErrorKind,
  errorCode: string,
): Promise<string> {
  const raw = `${feature}|${errorKind}|${errorCode}`.toLowerCase()
  try {
    const subtle = globalThis.crypto?.subtle
    if (subtle) {
      const data = new TextEncoder().encode(raw)
      const hash = await subtle.digest('SHA-256', data)
      const hex = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      return hex.slice(0, 16)
    }
  } catch {
    /* Hermes / older RN */
  }
  return fallbackFingerprint(feature, errorKind, errorCode)
}

export function sanitizeErrorCode(code: string): string {
  const trimmed = code.trim().slice(0, 64)
  if (!trimmed) return 'unknown'
  return trimmed.replace(/[^\w.-]/g, '_').slice(0, 64)
}
