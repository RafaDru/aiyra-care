import type { LlmUsageQuota } from './api.types'

export function isLlmQuotaExhausted(quota: LlmUsageQuota | null | undefined): boolean {
  if (!quota) return false
  if (quota.quotaBypassed) return false
  return quota.totalTokensRemaining <= 0 || quota.status === 'exhausted'
}
