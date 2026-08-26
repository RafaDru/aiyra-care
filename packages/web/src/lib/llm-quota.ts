import type { LlmUsageQuota } from '../lib/api.types.js'

/** Franquia esgotada — ignora quando `quotaBypassed` (feature flag / env). */
export function isLlmQuotaExhausted(quota: LlmUsageQuota | null | undefined): boolean {
  if (!quota) return false
  if (quota.quotaBypassed) return false
  return quota.totalTokensRemaining <= 0 || quota.status === 'exhausted'
}
