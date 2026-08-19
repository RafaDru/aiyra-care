export type ExamNotesParsed = {
  dedup: string
  meta: Record<string, unknown>
}

/** Primeira linha = chave de dedup; resto = JSON de metadados do portal/import. */
export function parseExamNotes(notes: string | null | undefined): ExamNotesParsed {
  if (!notes) return { dedup: '', meta: {} }
  const nl = notes.indexOf('\n')
  if (nl < 0) return { dedup: notes, meta: {} }
  try {
    return { dedup: notes.slice(0, nl), meta: JSON.parse(notes.slice(nl + 1)) as Record<string, unknown> }
  } catch {
    return { dedup: notes.slice(0, nl), meta: {} }
  }
}

export function buildExamNotes(dedup: string, meta: Record<string, unknown>): string {
  return `${dedup}\n${JSON.stringify(meta)}`
}

export function examDocumentIdFromNotes(notes: string | null | undefined): string | null {
  const { meta } = parseExamNotes(notes)
  return typeof meta.documentId === 'string' ? meta.documentId : null
}
