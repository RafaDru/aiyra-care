import type { LegalDocumentKind } from '@/lib/api.types'

const LABELS: Record<LegalDocumentKind, string> = {
  terms_of_use: 'Termos de uso',
  privacy_policy: 'Política de privacidade',
  cookie_policy: 'Política de cookies',
  minor_guardian_consent: 'Consentimento do responsável (menor)',
}

export function legalKindLabel(kind: LegalDocumentKind): string {
  return LABELS[kind] ?? kind
}
