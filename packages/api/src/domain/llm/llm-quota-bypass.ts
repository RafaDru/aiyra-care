function parseCsv(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Conta/e-mail com franquia de IA desativada (testes e ops). */
export function isLlmQuotaBypassed(scopeId: string, email?: string | null): boolean {
  const unlimited = process.env.LLM_QUOTA_UNLIMITED?.trim().toLowerCase()
  if (unlimited === '1' || unlimited === 'true' || unlimited === 'yes') return true

  const ids = parseCsv(process.env.LLM_QUOTA_BYPASS_ACCOUNT_IDS)
  if (ids.includes(scopeId)) return true

  const emails = parseCsv(process.env.LLM_QUOTA_BYPASS_EMAILS).map((e) => e.toLowerCase())
  const normalizedEmail = email?.trim().toLowerCase()
  if (normalizedEmail && emails.includes(normalizedEmail)) return true

  return false
}
