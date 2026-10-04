/** Parses CH search box input (Incidentes / Defeitos). */
export type OpsSearchKind = 'incident_ref' | 'defect_ref' | 'uuid_prefix' | 'title'

export type ParsedOpsSearch = {
  kind: OpsSearchKind
  value: string
}

const REF_INCIDENT = /^INC-\d{6}$/i
const REF_DEFECT = /^DEF-\d{6}$/i
const UUID_PREFIX = /^[0-9a-f]{8,36}$/i

export function parseOpsSearchInput(raw: string): ParsedOpsSearch | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (REF_INCIDENT.test(trimmed)) {
    return { kind: 'incident_ref', value: trimmed.toUpperCase() }
  }
  if (REF_DEFECT.test(trimmed)) {
    return { kind: 'defect_ref', value: trimmed.toUpperCase() }
  }
  if (UUID_PREFIX.test(trimmed)) {
    return { kind: 'uuid_prefix', value: trimmed.toLowerCase() }
  }
  return { kind: 'title', value: trimmed }
}

export function matchesOpsAnalysisQueueItem(
  item: { id: string; title: string; referenceCode: string | null },
  parsed: ParsedOpsSearch,
): boolean {
  if (parsed.kind === 'incident_ref') {
    return item.referenceCode?.toUpperCase() === parsed.value
  }
  if (parsed.kind === 'uuid_prefix') {
    return item.id.toLowerCase().startsWith(parsed.value)
  }
  return item.title.toLowerCase().includes(parsed.value.toLowerCase())
}

export function matchesPlatformDefectItem(
  item: { id: string; title: string; referenceCode: string | null },
  parsed: ParsedOpsSearch,
): boolean {
  if (parsed.kind === 'defect_ref') {
    return item.referenceCode?.toUpperCase() === parsed.value
  }
  if (parsed.kind === 'uuid_prefix') {
    return item.id.toLowerCase().startsWith(parsed.value)
  }
  return item.title.toLowerCase().includes(parsed.value.toLowerCase())
}
