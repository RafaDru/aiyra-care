export type SupportInvestigatorMode = 'immediate' | 'batch'

const DEFAULT_BATCH_INTERVAL_MS = 21_600_000

export function resolveSupportInvestigatorMode(): SupportInvestigatorMode {
  const raw = process.env.OPS_SUPPORT_INVESTIGATOR_MODE?.trim().toLowerCase()
  return raw === 'batch' ? 'batch' : 'immediate'
}

export function isSupportInvestigatorBatchMode(): boolean {
  return resolveSupportInvestigatorMode() === 'batch'
}

export function resolveSupportInvestigatorBatchIntervalMs(): number {
  const raw = Number(process.env.OPS_SUPPORT_INVESTIGATOR_BATCH_INTERVAL_MS ?? DEFAULT_BATCH_INTERVAL_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BATCH_INTERVAL_MS
}
