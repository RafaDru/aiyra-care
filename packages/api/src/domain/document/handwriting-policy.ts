import type { HandwritingCreditAccount, HandwritingQuota, InterpretationTier } from './handwriting-understanding.js'

export function isPaidOcrAllowed(): boolean {
  const v = process.env.OCR_ALLOW_PAID?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

export function isHandwritingInterpretationEnabled(): boolean {
  const v = process.env.HANDWRITING_INTERPRETATION_ENABLED?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  return !!(process.env.GEMINI_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim())
}

export function geminiFreeModel(): string {
  return process.env.GEMINI_FREE_MODEL?.trim() || process.env.GEMINI_VISION_MODEL?.trim() || 'gemini-2.5-flash'
}

/** Modelos Flash em ordem — gemini-2.0-flash foi desligado em jun/2026. */
export function geminiFreeModelCandidates(): string[] {
  const configured = [
    process.env.GEMINI_FREE_MODEL?.trim(),
    process.env.GEMINI_VISION_MODEL?.trim(),
  ].filter((m): m is string => !!m)
  const fallbacks = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash']
  return [...new Set([...configured, ...fallbacks])]
}

export function geminiPremiumModel(): string {
  return process.env.GEMINI_PREMIUM_MODEL?.trim() || 'gemini-2.5-pro'
}

export function geminiPremiumModelCandidates(): string[] {
  const configured = process.env.GEMINI_PREMIUM_MODEL?.trim()
  const fallbacks = ['gemini-2.5-pro', 'gemini-3.6-flash']
  return [...new Set([configured, ...fallbacks].filter((m): m is string => !!m))]
}

export function openAiVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL?.trim() || 'gpt-4o-mini'
}

export function handwritingPricingInfo(): import('./handwriting-understanding.js').HandwritingPricingInfo {
  const freeProviders = ['gemini-flash']
  if (process.env.GROQ_API_KEY?.trim()) freeProviders.push('groq-text')
  const premiumProviders = [...freeProviders]
  if (process.env.GEMINI_API_KEY?.trim()) premiumProviders.push('gemini-pro')
  if (process.env.OPENAI_API_KEY?.trim()) premiumProviders.push('openai-vision')

  return {
    freeTierLabel: 'Franquia mensal (APIs free tier)',
    freeTierProviders: freeProviders,
    premiumTierLabel: 'Créditos de pacote (fallback premium)',
    premiumTierProviders: premiumProviders,
    monthlyFreeUsesFreeTierOnly: true,
    packageUsesPremiumFallback: true,
  }
}

export function tierForCreditSource(source: 'monthly_free' | 'package'): InterpretationTier {
  return source === 'monthly_free' ? 'free' : 'premium'
}

export function handwritingScopeId(): string {
  return process.env.HANDWRITING_CREDITS_SCOPE?.trim() || 'default'
}

export function defaultMonthlyFreeAllowance(): number {
  const n = Number(process.env.HANDWRITING_MONTHLY_FREE ?? 10)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 10
}

export function estimatedInterpretationCostCents(tier: 'free' | 'premium', provider: string): number {
  if (tier === 'free') return 0
  if (provider.includes('openai')) return 8
  if (provider.includes('gemini') && provider.includes('pro')) return 5
  return 3
}

export function handwritingAdminKey(): string | undefined {
  return process.env.HANDWRITING_ADMIN_KEY?.trim() || undefined
}

function currentMonthPeriod(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export function normalizeMonthlyPeriod<T extends { monthlyPeriod: string; monthlyFreeUsed: number }>(account: T): T {
  const period = currentMonthPeriod()
  if (account.monthlyPeriod === period) return account
  return { ...account, monthlyPeriod: period, monthlyFreeUsed: 0 }
}

export function computeQuota(
  account: HandwritingCreditAccount,
  interpretationEnabled: boolean,
): HandwritingQuota {
  const normalized = normalizeMonthlyPeriod(account)
  const monthlyFreeRemaining = Math.max(0, normalized.monthlyFreeAllowance - normalized.monthlyFreeUsed)
  return {
    scopeId: normalized.scopeId,
    monthlyFreeAllowance: normalized.monthlyFreeAllowance,
    monthlyFreeRemaining,
    packageCredits: normalized.packageCredits,
    totalAvailable: monthlyFreeRemaining + normalized.packageCredits,
    monthlyPeriod: normalized.monthlyPeriod,
    interpretationEnabled,
    pricing: handwritingPricingInfo(),
  }
}

/** Consome 1 crédito: primeiro franquia mensal, depois pacote pago. */
export function consumeOneCredit(account: HandwritingCreditAccount): {
  account: HandwritingCreditAccount
  source: 'monthly_free' | 'package'
} {
  const normalized = normalizeMonthlyPeriod(account)
  const monthlyRemaining = normalized.monthlyFreeAllowance - normalized.monthlyFreeUsed
  if (monthlyRemaining > 0) {
    return {
      source: 'monthly_free',
      account: {
        ...normalized,
        monthlyFreeUsed: normalized.monthlyFreeUsed + 1,
      },
    }
  }
  if (normalized.packageCredits > 0) {
    return {
      source: 'package',
      account: {
        ...normalized,
        packageCredits: normalized.packageCredits - 1,
      },
    }
  }
  throw new Error('HANDWRITING_QUOTA_EXCEEDED')
}
