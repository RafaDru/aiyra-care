import type { OpsAnalysisQueueItem } from './ops.types.js'

export const INCIDENT_QUEUE_STATUS_LABEL: Record<OpsAnalysisQueueItem['status'], string> = {
  queued: 'Na fila',
  investigating: 'Investigando',
  fix_proposed: 'Solução proposta',
  completed: 'Concluída',
  dismissed: 'Descartada',
  failed: 'Falhou',
}

export const INCIDENT_LANE_LABEL: Record<OpsAnalysisQueueItem['lane'], string> = {
  development_support: 'Correção (Dev)',
  sre_support: 'Infra (SRE)',
}

export const INCIDENT_PRIORITY_LABEL: Record<OpsAnalysisQueueItem['priority'], string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  critical: 'Crítica',
}

/** Tag curta alinhada a deep links / busca por prefixo UUID. */
export function incidentShortTag(investigationId: string): string {
  return `[inc:${investigationId.slice(0, 8)}]`
}

export function formatIncidentRefLine(item: {
  id: string
  referenceCode: string | null
}): string {
  const tag = incidentShortTag(item.id)
  return item.referenceCode ? `${item.referenceCode} · ${tag}` : tag
}

export function incidentDispatchStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Sem registro de envio'
  const map: Record<string, string> = {
    pending: 'Aguardando envio',
    forwarded: 'Enviado ao Cursor',
    dead: 'Falhou após tentativas',
    skipped: 'Envio ignorado',
  }
  return map[status] ?? status
}

export function incidentSourceFootnote(row: OpsAnalysisQueueItem): string | null {
  if (row.sourceType === 'support_report') return 'Origem: relato de suporte'
  if (row.sourceType === 'ops_alert') return 'Origem: alerta de operação'
  if (row.sourceType) return `Origem: ${row.sourceType.replace(/_/g, ' ')}`
  return null
}

export type IncidentPipelineUiBucket =
  | 'aberto'
  | 'encaminhado'
  | 'em_fila'
  | 'em_triagem'
  | 'triado'
  | 'resolvido'
  | 'descartado'
  | 'falha'

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
  triado: 'Triado',
  resolvido: 'Resolvido',
  descartado: 'Descartado',
  falha: 'Falha',
}

const PIPELINE_TAG_COLOR: Record<IncidentPipelineUiBucket, string> = {
  aberto: 'gold',
  encaminhado: 'blue',
  em_fila: 'cyan',
  em_triagem: 'processing',
  triado: 'success',
  resolvido: 'default',
  descartado: 'default',
  falha: 'error',
}

function resolvePipelineStatus(row: OpsAnalysisQueueItem) {
  const pipeline = row.incidentPipelineStatus
  const activelyTriaging = row.status === 'investigating' || row.status === 'fix_proposed'
  if (
    pipeline === 'in_triage' &&
    row.dispatch?.status === 'forwarded' &&
    !row.analysisArtifactPath &&
    !activelyTriaging
  ) {
    return 'forwarded' as const
  }
  return pipeline
}

export function incidentPipelineUiBucket(row: OpsAnalysisQueueItem): IncidentPipelineUiBucket {
  const pipeline = resolvePipelineStatus(row)
  if (pipeline === 'forwarded') return 'encaminhado'
  if (pipeline === 'queued_worker') return 'em_fila'
  if (pipeline === 'in_triage') return 'em_triagem'
  if (pipeline === 'open') return 'aberto'
  if (pipeline === 'dispatch_failed') return 'falha'
  if (pipeline === 'triaged') return 'triado'
  if (pipeline === 'resolved') return 'resolvido'
  if (pipeline === 'dismissed') return 'descartado'

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

export function incidentPlannedMaintenanceActive(row: OpsAnalysisQueueItem): boolean {
  return row.contextSnapshot?.plannedMaintenanceActive === true
}

export const INCIDENT_PLANNED_MAINTENANCE_LABEL = 'Em manutenção'

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
