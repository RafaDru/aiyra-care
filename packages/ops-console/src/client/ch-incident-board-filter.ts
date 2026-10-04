import type { OpsAnalysisQueueItem } from './ops.types.js'

export type IncidentBoardFilter = 'needs_attention' | 'triaged' | 'all_open' | 'completed'

export const INCIDENT_BOARD_FILTER_LABELS: Record<IncidentBoardFilter, string> = {
  needs_attention: 'Precisam atenção',
  triaged: 'Triados',
  all_open: 'Todos abertos',
  completed: 'Concluídos',
}

export function suggestIncidentBoardFilter(item: OpsAnalysisQueueItem): IncidentBoardFilter {
  if (item.status === 'completed' || item.status === 'dismissed') return 'completed'
  if (item.incidentPipelineStatus === 'dismissed') return 'completed'
  if (item.incidentPipelineStatus === 'triaged') return 'triaged'
  return 'needs_attention'
}
