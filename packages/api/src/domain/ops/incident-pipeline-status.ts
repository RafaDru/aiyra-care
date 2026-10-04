import type { AnalysisQueueStatus, IncidentPipelineStatus } from './ops-analysis-queue.types.js'

export type { IncidentPipelineStatus }

/** Estados exibidos na UI CH (tab Incidentes). */
export type IncidentPipelineUiBucket =
  | 'aberto'
  | 'encaminhado'
  | 'em_fila'
  | 'em_triagem'
  | 'falha'

const UI_LABEL: Record<IncidentPipelineUiBucket, string> = {
  aberto: 'Aberto',
  encaminhado: 'Encaminhado',
  em_fila: 'Em fila',
  em_triagem: 'Em triagem',
  falha: 'Falha',
}

export function incidentPipelineUiLabel(bucket: IncidentPipelineUiBucket): string {
  return UI_LABEL[bucket]
}

/** Prefer canonical PG column; heal stale rows stuck in `in_triage` while outbox is only `forwarded`. */
export function resolveIncidentPipelineStatusForDisplay(input: {
  incidentPipelineStatus?: IncidentPipelineStatus | null
  analysisArtifactPath?: string | null
  dispatchStatus?: string | null
}): IncidentPipelineStatus | null | undefined {
  const pipeline = input.incidentPipelineStatus
  if (
    pipeline === 'in_triage' &&
    input.dispatchStatus === 'forwarded' &&
    !input.analysisArtifactPath
  ) {
    return 'forwarded'
  }
  return pipeline
}

export function incidentPipelineUiBucket(
  pipelineStatus: IncidentPipelineStatus | null | undefined,
  legacyStatus?: AnalysisQueueStatus,
): IncidentPipelineUiBucket {
  if (pipelineStatus === 'forwarded') return 'encaminhado'
  if (pipelineStatus === 'queued_worker') return 'em_fila'
  if (pipelineStatus === 'in_triage') return 'em_triagem'
  if (pipelineStatus === 'open') return 'aberto'
  if (pipelineStatus === 'dispatch_failed') return 'falha'
  if (pipelineStatus === 'triaged' || pipelineStatus === 'dismissed') return 'aberto'

  if (legacyStatus === 'investigating' || legacyStatus === 'fix_proposed') {
    return 'em_triagem'
  }
  return 'aberto'
}

export function buildIncidentDispatchIdempotencyKey(incidentId: string, dispatchKind = 'triage_v1'): string {
  return `${incidentId}:${dispatchKind}`
}
