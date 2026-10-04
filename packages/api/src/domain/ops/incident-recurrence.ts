import type { AnalysisQueueSourceType } from './ops-analysis-queue.types.js'

export const INCIDENT_RECURRENCE_KIND_REINCIDENCIA = 'reincidencia' as const
export type IncidentRecurrenceKind = typeof INCIDENT_RECURRENCE_KIND_REINCIDENCIA

export function extractIncidentFingerprint(
  contextSnapshot: Record<string, unknown> | undefined,
): string | null {
  const fp = contextSnapshot?.fingerprint
  return typeof fp === 'string' && fp.trim() ? fp.trim().slice(0, 128) : null
}

export type IncidentRecurrenceLookupInput = {
  sourceType: AnalysisQueueSourceType
  sourceId: string
  deploymentTier: string
  contextSnapshot?: Record<string, unknown>
}
