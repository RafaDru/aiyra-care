/** Extrai metadados Mater Dei de exams.notes (2ª linha JSON). */
export function examMetaFromNotes(notes: string | null | undefined): Record<string, unknown> {
  if (!notes) return {}
  const nl = notes.indexOf('\n')
  if (nl < 0) return {}
  try {
    return JSON.parse(notes.slice(nl + 1)) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function examDocumentIdFromNotes(notes: string | null | undefined): string | null {
  const meta = examMetaFromNotes(notes)
  return typeof meta.documentId === 'string' ? meta.documentId : null
}

export function examImageSeriesCountFromNotes(notes: string | null | undefined): number {
  const meta = examMetaFromNotes(notes)
  return typeof meta.imageSeriesCount === 'number' ? meta.imageSeriesCount : 0
}

export function examImageDocumentIdsFromNotes(notes: string | null | undefined): string[] {
  const meta = examMetaFromNotes(notes)
  if (!Array.isArray(meta.imageDocumentIds)) return []
  return meta.imageDocumentIds.filter((id): id is string => typeof id === 'string')
}
