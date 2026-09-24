import type { OpsAnalysisQueueItem } from './ops.types.js'

export type IncidentPipelineUiBucket = 'aberto' | 'encaminhado' | 'em_fila' | 'em_triagem'

export const INCIDENT_ORIGIN_LABEL: Record<string, string> = {
  usuario: 'Usuário',
  user: 'Usuário',
  sonda: 'Sonda',
  cliente: 'Cliente (automático)',
  alerta_ops: 'Alerta ops',
  job: 'Job / worker',
  agente: 'Agente',
  batch: 'Batch',
}

const PIPELINE_UI_LABEL: Record<IncidentPipelineUiBucket, string> = {
  aberto: 'Aberto',
  encaminhado: 'Encaminhado',
  em_fila: 'Em fila',
  em_triagem: 'Em triagem',
}

const PIPELINE_TAG_COLOR: Record<IncidentPipelineUiBucket, string> = {
  aberto: 'gold',
  encaminhado: 'blue',
  em_fila: 'cyan',
  em_triagem: 'processing',
}

export function incidentPipelineUiBucket(row: OpsAnalysisQueueItem): IncidentPipelineUiBucket {
  const pipeline = row.incidentPipelineStatus
  if (pipeline === 'forwarded') return 'encaminhado'
  if (pipeline === 'queued_worker') return 'em_fila'
  if (pipeline === 'in_triage') return 'em_triagem'
  if (pipeline === 'open') return 'aberto'
  if (pipeline === 'triaged' || pipeline === 'dismissed') return 'aberto'

  if (row.status === 'investigating' || row.status === 'fix_proposed') return 'em_triagem'
  return 'aberto'
}

export function incidentPipelineLabel(row: OpsAnalysisQueueItem): string {
  return PIPELINE_UI_LABEL[incidentPipelineUiBucket(row)]
}

export function incidentPipelineTagColor(row: OpsAnalysisQueueItem): string {
  return PIPELINE_TAG_COLOR[incidentPipelineUiBucket(row)]
}

/** @deprecated use incidentPipelineLabel */
export type IncidentTriageStatus = 'em_aberto' | 'em_triagem'

/** @deprecated use incidentPipelineUiBucket */
export function incidentTriageStatus(
  status: OpsAnalysisQueueItem['status'],
): IncidentTriageStatus {
  if (status === 'investigating' || status === 'fix_proposed') return 'em_triagem'
  return 'em_aberto'
}

/** @deprecated use incidentPipelineLabel */
export function incidentTriageLabel(triage: IncidentTriageStatus): string {
  return triage === 'em_triagem' ? 'Em triagem' : 'Em aberto'
}

export function incidentOriginLabel(row: OpsAnalysisQueueItem): string {
  const snap = row.contextSnapshot ?? {}
  const fromSnap = snap.incidentOrigin
  if (typeof fromSnap === 'string' && INCIDENT_ORIGIN_LABEL[fromSnap]) {
    return INCIDENT_ORIGIN_LABEL[fromSnap]
  }
  if (snap.batch === true) return INCIDENT_ORIGIN_LABEL.batch
  if (row.sourceType === 'support_report') return INCIDENT_ORIGIN_LABEL.usuario
  if (row.sourceType === 'ops_alert') return INCIDENT_ORIGIN_LABEL.alerta_ops
  return '—'
}

export function incidentApplicationLabel(row: OpsAnalysisQueueItem): string {
  const app = row.contextSnapshot?.application
  if (typeof app === 'string' && app.length) return app
  if (row.lane === 'sre_support') return 'Ops'
  return 'Web'
}
