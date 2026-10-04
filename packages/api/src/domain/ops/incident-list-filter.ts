/** Filtro da lista Incidentes no Command Hub (tab Operação). */
export type IncidentBoardFilter =
  | 'needs_attention'
  | 'triaged'
  | 'all_open'
  | 'completed'

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
         AND ${p}incident_pipeline_status NOT IN ('triaged', 'dismissed')`
    case 'triaged':
      return `${p}status NOT IN ('completed', 'dismissed')
         AND ${p}incident_pipeline_status = 'triaged'`
    case 'all_open':
      return `${p}status NOT IN ('completed', 'dismissed')`
    case 'completed':
      return `${p}status IN ('completed', 'dismissed')
         OR ${p}incident_pipeline_status IN ('dismissed')`
    default:
      return incidentBoardWhereClause('needs_attention')
  }
}
