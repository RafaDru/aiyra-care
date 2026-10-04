import type { OpsAnalysisQueueItem } from './ops.types.js'

export type IncidentBoardFilter =
  | 'needs_attention'
  | 'triaged'
  | 'resolved'
  | 'all_open'

export const INCIDENT_BOARD_FILTER_LABELS: Record<IncidentBoardFilter, string> = {
  all_open: 'Em aberto',
  needs_attention: 'Precisam atenção',
  triaged: 'Triados',
  resolved: 'Resolvidos',
}

export function suggestIncidentBoardFilter(item: OpsAnalysisQueueItem): IncidentBoardFilter {
  const pipeline = item.incidentPipelineStatus ?? 'open'
  if (pipeline === 'resolved') return 'resolved'
  if (pipeline === 'triaged') return 'triaged'
  /** Sem chip «Descartados»; linha permanece visível com deep link (`ensureId`). */
  if (pipeline === 'dismissed') return 'all_open'
  if (
    pipeline === 'dispatch_failed' ||
    pipeline === 'open' ||
    pipeline === 'forwarded' ||
    pipeline === 'queued_worker' ||
    pipeline === 'in_triage'
  ) {
    return 'needs_attention'
  }
  return 'all_open'
}
