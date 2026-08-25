import type { HandwritingCreditAccount } from '../document/handwriting-understanding.js'
import type { LlmMessage, LlmQuotaStatus, LlmTier, LlmUsageAccount, LlmUsageQuota, LlmTokenUsage } from './llm.types.js'

export function tokensPerCredit(): number {
  const n = Number(process.env.LLM_TOKENS_PER_CREDIT ?? 10_000)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10_000
}

export function llmWarnAtPercent(): number {
  const n = Number(process.env.LLM_WARN_AT_PERCENT ?? 80)
  if (!Number.isFinite(n)) return 80
  return Math.min(100, Math.max(50, Math.floor(n)))
}

export function avaMaxOutputTokens(): number {
  const n = Number(process.env.LLM_AVA_MAX_OUTPUT_TOKENS ?? 1024)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1024
}

export function avaReserveOutputTokens(): number {
  return avaMaxOutputTokens()
}

export function handwritingInterpretTokenDebit(): number {
  return tokensPerCredit()
}

export function isAvaLlmEnabled(): boolean {
  const v = process.env.AVA_LLM_ENABLED?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  return !!(
    process.env.GROQ_API_KEY?.trim()
    || process.env.GEMINI_API_KEY?.trim()
    || opencodeGoApiKey()
    || opencodeZenApiKey()
  )
}

function sharedOpenCodeApiKey(): string | undefined {
  return process.env.OPENCODE_API_KEY?.trim() || undefined
}

function machineOpenCodeGoKey(): string | undefined {
  return process.env.OPENCODE_GO_API_KEY?.trim()
    || process.env.OPENCODEGO_API_KEY?.trim()
    || undefined
}

/** Chave Zen pay-as-you-go (`/zen/v1`). */
export function opencodeZenApiKey(): string | undefined {
  return process.env.OPENCODE_ZEN_API_KEY?.trim()
    || machineOpenCodeGoKey()
    || sharedOpenCodeApiKey()
}

/** Chave Go ($10/mês — `/go/v1`). */
export function opencodeGoApiKey(): string | undefined {
  return machineOpenCodeGoKey()
    || process.env.OPENCODE_ZEN_API_KEY?.trim()
    || sharedOpenCodeApiKey()
}

export function groqChatModel(): string {
  return process.env.GROQ_CHAT_MODEL?.trim() || process.env.GROQ_TEXT_MODEL?.trim() || 'qwen/qwen3.6-27b'
}

/** Primário Ava — Gemini Flash (rápido / econômico). */
export function geminiFlashLiteChatModel(): string {
  return process.env.GEMINI_FLASH_LITE_MODEL?.trim()
    || process.env.GEMINI_CHAT_MODEL?.trim()
    || process.env.GEMINI_FREE_MODEL?.trim()
    || 'gemini-2.5-flash'
}

export function geminiChatModel(): string {
  return geminiFlashLiteChatModel()
}

/** Fallback final — modelo Gemini mais capaz disponível na conta. */
export function geminiProChatModel(): string {
  return process.env.GEMINI_PRO_CHAT_MODEL?.trim()
    || process.env.GEMINI_PREMIUM_MODEL?.trim()
    || 'gemini-3.5-flash-lite'
}

export function opencodeGoChatModel(): string {
  return process.env.OPENCODE_GO_CHAT_MODEL?.trim() || 'deepseek-v4-flash'
}

export function opencodeGoBaseUrl(): string {
  return process.env.OPENCODE_GO_BASE_URL?.trim() || 'https://opencode.ai/zen/go/v1'
}

export function opencodeZenBaseUrl(): string {
  return process.env.OPENCODE_ZEN_BASE_URL?.trim() || 'https://opencode.ai/zen/v1'
}

/** Zen gratuito — só com consentimento explícito (dados podem melhorar o modelo). */
export function opencodeZenFreeChatModel(): string {
  return process.env.OPENCODE_ZEN_FREE_CHAT_MODEL?.trim() || 'deepseek-v4-flash-free'
}

export function tierForCreditSource(source: 'monthly_free' | 'package'): LlmTier {
  return source === 'monthly_free' ? 'free' : 'premium'
}

export function estimatedLlmCostCents(tier: LlmTier, provider: string): number {
  if (tier === 'free') return 0
  if (provider.includes('openai')) return 8
  if (provider.includes('pro')) return 5
  return 3
}

/** Estimativa PT — ~3,5 chars/token. */
export function estimateTokensFromText(text: string): number {
  const len = text.trim().length
  if (!len) return 0
  return Math.max(1, Math.ceil(len / 3.5))
}

export function estimatePromptTokens(messages: LlmMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokensFromText(m.content) + 4, 0)
}

export function estimateCompletionReserve(messages: LlmMessage[], maxOutput?: number): number {
  return estimatePromptTokens(messages) + (maxOutput ?? avaReserveOutputTokens())
}

export function usageFromApiOrEstimate(
  usage: Partial<{ promptTokens: number; completionTokens: number; totalTokens: number }> | null | undefined,
  promptText: string,
  completionText: string,
): LlmTokenUsage {
  const inFromApi = usage?.promptTokens
  const outFromApi = usage?.completionTokens
  if (typeof inFromApi === 'number' && typeof outFromApi === 'number') {
    const total = usage?.totalTokens ?? inFromApi + outFromApi
    return {
      tokensIn: inFromApi,
      tokensOut: outFromApi,
      tokensTotal: total,
      usageSource: 'api',
    }
  }
  const tokensIn = estimateTokensFromText(promptText)
  const tokensOut = estimateTokensFromText(completionText)
  return {
    tokensIn,
    tokensOut,
    tokensTotal: tokensIn + tokensOut,
    usageSource: 'estimated',
  }
}

function currentMonthPeriod(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export function normalizeLlmUsagePeriod(account: LlmUsageAccount): LlmUsageAccount {
  const period = currentMonthPeriod()
  if (account.monthlyPeriod === period) return account
  return { ...account, monthlyPeriod: period, monthlyTokensUsed: 0 }
}

export function creditPoolTokens(creditAccount: HandwritingCreditAccount): number {
  const perCredit = tokensPerCredit()
  const monthlyRemaining = Math.max(0, creditAccount.monthlyFreeAllowance - creditAccount.monthlyFreeUsed)
  return (monthlyRemaining + creditAccount.packageCredits) * perCredit
}

function quotaStatus(usagePercent: number, totalRemaining: number): LlmQuotaStatus {
  if (totalRemaining <= 0) return 'exhausted'
  if (usagePercent >= llmWarnAtPercent()) return 'warn'
  return 'ok'
}

export function computeLlmUsageQuota(
  usageAccount: LlmUsageAccount,
  creditAccount: HandwritingCreditAccount,
  llmEnabled: boolean,
): LlmUsageQuota {
  const normalized = normalizeLlmUsagePeriod(usageAccount)
  const perCredit = tokensPerCredit()
  const warnAt = llmWarnAtPercent()
  const monthlyRemainingCredits = Math.max(
    0,
    creditAccount.monthlyFreeAllowance - creditAccount.monthlyFreeUsed,
  )
  const monthlyTokenAllowance = creditAccount.monthlyFreeAllowance * perCredit
  const totalTokenBudget = creditPoolTokens(creditAccount)
  const monthlyUsed = normalized.monthlyTokensUsed
  const totalRemaining = Math.max(0, totalTokenBudget - monthlyUsed)

  // % do pool total (franquia restante + pacotes), não só da franquia nominal mensal
  const usagePercent = totalTokenBudget > 0
    ? Math.min(100, Math.round((monthlyUsed / totalTokenBudget) * 100))
    : monthlyUsed > 0 ? 100 : 0

  return {
    scopeId: normalized.scopeId,
    tokensPerCredit: perCredit,
    monthlyTokenAllowance,
    monthlyTokensUsed: monthlyUsed,
    monthlyTokensRemaining: Math.max(0, monthlyRemainingCredits * perCredit - monthlyUsed),
    packageTokenBalance: creditAccount.packageCredits * perCredit,
    totalTokensRemaining: totalRemaining,
    creditsEquivalentRemaining: Math.floor(totalRemaining / perCredit),
    warnAtPercent: warnAt,
    usagePercent,
    status: quotaStatus(usagePercent, totalRemaining),
    monthlyPeriod: normalized.monthlyPeriod,
    handwritingCredits: {
      monthlyFreeRemaining: monthlyRemainingCredits,
      packageCredits: creditAccount.packageCredits,
      totalAvailable: monthlyRemainingCredits + creditAccount.packageCredits,
    },
    llmEnabled,
  }
}

export function assertTokenBudget(
  usageAccount: LlmUsageAccount,
  creditAccount: HandwritingCreditAccount,
  estimatedTokens: number,
): void {
  const normalized = normalizeLlmUsagePeriod(usageAccount)
  const remaining = creditPoolTokens(creditAccount) - normalized.monthlyTokensUsed
  if (estimatedTokens > remaining) {
    throw new Error('LLM_QUOTA_EXCEEDED')
  }
}

export function recordTokenUsage(
  usageAccount: LlmUsageAccount,
  tokensTotal: number,
): LlmUsageAccount {
  const normalized = normalizeLlmUsagePeriod(usageAccount)
  return {
    ...normalized,
    monthlyTokensUsed: normalized.monthlyTokensUsed + tokensTotal,
  }
}
