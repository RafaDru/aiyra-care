import type { OpsAnalysisQueueItem } from './ops.types.js'

export type IncidentTriageStatus = 'em_aberto' | 'em_triagem'

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

export function incidentTriageStatus(
  status: OpsAnalysisQueueItem['status'],
): IncidentTriageStatus {
  if (status === 'investigating' || status === 'fix_proposed') return 'em_triagem'
  return 'em_aberto'
}

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
