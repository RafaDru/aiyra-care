import type { LegalDocumentKind } from '../lib/api.types.js'

export const COMPLIANCE_ACCEPT_PATH = '/compliance/accept'

const ALLOWED_RETURN_PATHS = new Set([
  COMPLIANCE_ACCEPT_PATH,
  '/login',
  '/settings',
  '/settings/general',
  '/settings/account',
  '/settings/plan',
  '/settings/legal',
  '/',
])

/** Evita open redirect — só paths internos explícitos. */
export function sanitizeLegalReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const path = decodeURIComponent(raw.trim())
    if (!path.startsWith('/') || path.startsWith('//')) return null
    return ALLOWED_RETURN_PATHS.has(path) ? path : null
  } catch {
    return null
  }
}

export function legalDocumentPath(kind: LegalDocumentKind, returnTo?: string | null): string {
  let base: string
  switch (kind) {
    case 'terms_of_use':
      base = '/termos'
      break
    case 'privacy_policy':
      base = '/privacidade'
      break
    case 'cookie_policy':
      base = '/cookies'
      break
    case 'minor_guardian_consent':
      base = '/consentimento-menor'
      break
    default:
      base = '/termos'
  }
  const ret = sanitizeLegalReturnPath(returnTo)
  if (ret) return `${base}?return=${encodeURIComponent(ret)}`
  return base
}

export const LOGIN_LEGAL_KINDS: LegalDocumentKind[] = [
  'terms_of_use',
  'privacy_policy',
  'cookie_policy',
]
