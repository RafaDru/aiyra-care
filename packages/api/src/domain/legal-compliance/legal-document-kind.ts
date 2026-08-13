export const LEGAL_DOCUMENT_KINDS = [
  'terms_of_use',
  'privacy_policy',
  'cookie_policy',
  'minor_guardian_consent',
] as const

export type LegalDocumentKind = typeof LEGAL_DOCUMENT_KINDS[number]

/** Documentos obrigatórios para uso da plataforma (go-live público). */
export const REQUIRED_LEGAL_ACCEPTANCE_KINDS: readonly LegalDocumentKind[] = [
  'terms_of_use',
  'privacy_policy',
]

export function isLegalDocumentKind(value: string): value is LegalDocumentKind {
  return (LEGAL_DOCUMENT_KINDS as readonly string[]).includes(value)
}

export function legalKindLabel(kind: LegalDocumentKind, locale: 'pt-BR' | 'en' = 'pt-BR'): string {
  const labels: Record<LegalDocumentKind, Record<'pt-BR' | 'en', string>> = {
    terms_of_use: { 'pt-BR': 'Termos de Uso', en: 'Terms of Use' },
    privacy_policy: { 'pt-BR': 'Política de Privacidade', en: 'Privacy Policy' },
    cookie_policy: { 'pt-BR': 'Política de Cookies', en: 'Cookie Policy' },
    minor_guardian_consent: { 'pt-BR': 'Consentimento do responsável (menor)', en: 'Guardian consent (minor)' },
  }
  return labels[kind][locale]
}
