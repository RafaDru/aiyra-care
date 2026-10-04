import type {
  AnalysisQueueStatus,
  IncidentPipelineStatus,
} from './ops-analysis-queue.types.js'

/** Filtro da lista Incidentes no Command Hub (tab Operação). */
export type IncidentBoardFilter =
  | 'needs_attention'
  | 'triaged'
  | 'resolved'
  | 'all_open'

const REF_INCIDENT = /^INC-\d{6}$/i
const REF_DEFECT = /^DEF-\d{6}$/i
const UUID_PREFIX = /^[0-9a-f]{8,36}$/i

export function normalizeIncidentReferenceCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase()
  if (!REF_INCIDENT.test(trimmed)) return null
  return trimmed
}

export function normalizeDefectReferenceCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase()
  if (!REF_DEFECT.test(trimmed)) return null
  return trimmed
}

export function parseOpsReferenceOrUuidQuery(raw: string): {
  kind: 'incident_ref' | 'defect_ref' | 'uuid_prefix' | 'title'
  value: string
} {
  const trimmed = raw.trim()
  const inc = normalizeIncidentReferenceCode(trimmed)
  if (inc) return { kind: 'incident_ref', value: inc }
  const def = normalizeDefectReferenceCode(trimmed)
  if (def) return { kind: 'defect_ref', value: def }
  if (UUID_PREFIX.test(trimmed)) return { kind: 'uuid_prefix', value: trimmed.toLowerCase() }
  return { kind: 'title', value: trimmed }
}

export function incidentBoardWhereClause(filter: IncidentBoardFilter, alias = ''): string {
  const p = alias ? `${alias}.` : ''
  switch (filter) {
    case 'needs_attention':
      return `${p}status NOT IN ('completed', 'dismissed')
         AND ${p}incident_pipeline_status NOT IN ('triaged', 'resolved', 'dismissed')`
    case 'triaged':
      return `${p}incident_pipeline_status = 'triaged'
         AND ${p}status NOT IN ('dismissed')`
    case 'resolved':
      return `${p}incident_pipeline_status = 'resolved'`
    case 'all_open':
      return `${p}status NOT IN ('dismissed')
         AND ${p}incident_pipeline_status NOT IN ('resolved', 'dismissed')`
    default:
      return incidentBoardWhereClause('all_open', alias)
  }
}

/** Espelha `incidentBoardWhereClause` para testes e validação na UI. */
export function incidentMatchesBoardFilter(
  item: {
    status: AnalysisQueueStatus
    incidentPipelineStatus: IncidentPipelineStatus
  },
  filter: IncidentBoardFilter,
): boolean {
  const { status, incidentPipelineStatus: pipeline } = item
  switch (filter) {
    case 'needs_attention':
      return (
        status !== 'completed' &&
        status !== 'dismissed' &&
        pipeline !== 'triaged' &&
        pipeline !== 'resolved' &&
        pipeline !== 'dismissed'
      )
    case 'triaged':
      return pipeline === 'triaged' && status !== 'dismissed'
    case 'resolved':
      return pipeline === 'resolved'
    case 'all_open':
      return (
        status !== 'dismissed' &&
        pipeline !== 'resolved' &&
        pipeline !== 'dismissed'
      )
    default:
      return incidentMatchesBoardFilter(item, 'all_open')
  }
}

export function suggestIncidentBoardFilterFromPipeline(
  pipeline: IncidentPipelineStatus,
): IncidentBoardFilter {
  if (pipeline === 'resolved') return 'resolved'
  if (pipeline === 'triaged') return 'triaged'
  /** Sem chip «Descartados»; UI mantém linha via `ensureId` no deep link. */
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
