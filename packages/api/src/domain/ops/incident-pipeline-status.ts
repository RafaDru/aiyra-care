import type { AnalysisQueueStatus, IncidentPipelineStatus } from './ops-analysis-queue.types.js'

export type { IncidentPipelineStatus }

/** Estados exibidos na UI CH (tab Incidentes). */
export type IncidentPipelineUiBucket = 'aberto' | 'encaminhado' | 'em_fila' | 'em_triagem'

const UI_LABEL: Record<IncidentPipelineUiBucket, string> = {
  aberto: 'Aberto',
  encaminhado: 'Encaminhado',
  em_fila: 'Em fila',
  em_triagem: 'Em triagem',
}

export function incidentPipelineUiLabel(bucket: IncidentPipelineUiBucket): string {
  return UI_LABEL[bucket]
}

export function incidentPipelineUiBucket(
  pipelineStatus: IncidentPipelineStatus | null | undefined,
  legacyStatus?: AnalysisQueueStatus,
): IncidentPipelineUiBucket {
  if (pipelineStatus === 'forwarded') return 'encaminhado'
  if (pipelineStatus === 'queued_worker') return 'em_fila'
  if (pipelineStatus === 'in_triage') return 'em_triagem'
  if (pipelineStatus === 'open') return 'aberto'
  if (pipelineStatus === 'triaged' || pipelineStatus === 'dismissed') return 'aberto'

  if (legacyStatus === 'investigating' || legacyStatus === 'fix_proposed') {
    return 'em_triagem'
  }
  return 'aberto'
}

export function buildIncidentDispatchIdempotencyKey(incidentId: string, dispatchKind = 'triage_v1'): string {
  return `${incidentId}:${dispatchKind}`
}
