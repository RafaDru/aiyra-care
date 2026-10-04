import {
  incidentPipelineUiBucket,
  type IncidentPipelineUiBucket,
} from './ch-incident-display.js'
import type { OpsAnalysisQueueItem } from './ops.types.js'

export type IncidentTableSortOrder = 'ascend' | 'descend'

export type IncidentTableSortState = {
  columnKey: string
  order: IncidentTableSortOrder
}

export const INCIDENT_TABLE_SORT_SESSION_KEY = 'ch-incidentes-table-sort'

export const DEFAULT_INCIDENT_TABLE_SORT: IncidentTableSortState = {
  columnKey: 'updatedAt',
  order: 'descend',
}

const PRIORITY_RANK: Record<OpsAnalysisQueueItem['priority'], number> = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4,
}

const PIPELINE_BUCKET_RANK: Record<IncidentPipelineUiBucket, number> = {
  falha: 0,
  em_triagem: 1,
  em_fila: 2,
  encaminhado: 3,
  aberto: 4,
  triado: 5,
}

export function parseIncidentRefSortKey(code: string | null): number {
  if (!code) return 0
  const m = /^INC-(\d+)$/i.exec(code.trim())
  return m ? Number.parseInt(m[1], 10) : 0
}

export function loadIncidentTableSort(): IncidentTableSortState {
  try {
    const raw = sessionStorage.getItem(INCIDENT_TABLE_SORT_SESSION_KEY)
    if (!raw) return DEFAULT_INCIDENT_TABLE_SORT
    const parsed = JSON.parse(raw) as Partial<IncidentTableSortState>
    if (
      typeof parsed.columnKey === 'string' &&
      (parsed.order === 'ascend' || parsed.order === 'descend')
    ) {
      return { columnKey: parsed.columnKey, order: parsed.order }
    }
  } catch {
    /* ignore corrupt session value */
  }
  return DEFAULT_INCIDENT_TABLE_SORT
}

export function persistIncidentTableSort(state: IncidentTableSortState): void {
  sessionStorage.setItem(INCIDENT_TABLE_SORT_SESSION_KEY, JSON.stringify(state))
}

function compareIncidentRows(
  a: OpsAnalysisQueueItem,
  b: OpsAnalysisQueueItem,
  columnKey: string,
): number {
  switch (columnKey) {
    case 'referenceCode':
      return parseIncidentRefSortKey(a.referenceCode) - parseIncidentRefSortKey(b.referenceCode)
    case 'updatedAt':
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    case 'queuedAt':
      return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()
    case 'title':
      return a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
    case 'priority':
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    case 'pipelineStatus':
      return (
        PIPELINE_BUCKET_RANK[incidentPipelineUiBucket(a)] -
        PIPELINE_BUCKET_RANK[incidentPipelineUiBucket(b)]
      )
    default:
      return 0
  }
}

export function sortIncidentTableItems(
  items: OpsAnalysisQueueItem[],
  sort: IncidentTableSortState,
): OpsAnalysisQueueItem[] {
  const dir = sort.order === 'ascend' ? 1 : -1
  return [...items].sort((a, b) => compareIncidentRows(a, b, sort.columnKey) * dir)
}
