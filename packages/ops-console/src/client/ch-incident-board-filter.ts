import type { OpsAnalysisQueueItem } from './ops.types.js'

export type IncidentBoardFilter =
  | 'needs_attention'
  | 'triaged'
  | 'resolved'
  | 'all_open'

export const INCIDENT_BOARD_FILTER_LABELS: Record<IncidentBoardFilter, string> = {
  needs_attention: 'Precisam atenção',
  triaged: 'Triados',
  resolved: 'Resolvidos',
  all_open: 'Todos abertos',
}

export function suggestIncidentBoardFilter(item: OpsAnalysisQueueItem): IncidentBoardFilter {
  if (item.incidentPipelineStatus === 'resolved') return 'resolved'
  if (item.incidentPipelineStatus === 'dismissed') return 'all_open'
  if (item.incidentPipelineStatus === 'triaged') return 'triaged'
  return 'needs_attention'
}
