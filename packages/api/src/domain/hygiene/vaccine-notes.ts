import type { Vaccine } from '../vaccine/vaccine.entity.js'

export type VaccineNotesParsed = {
  text: string
  meta: Record<string, unknown>
}

/** Texto livre + JSON de metadados (higienização, portal). */
export function parseVaccineNotes(notes: string | null | undefined): VaccineNotesParsed {
  if (!notes?.trim()) return { text: '', meta: {} }
  const nl = notes.indexOf('\n')
  if (nl < 0) {
    if (notes.trimStart().startsWith('{')) {
      try {
        return { text: '', meta: JSON.parse(notes) as Record<string, unknown> }
      } catch {
        return { text: notes, meta: {} }
      }
    }
    return { text: notes, meta: {} }
  }
  const text = notes.slice(0, nl)
  try {
    return { text, meta: JSON.parse(notes.slice(nl + 1)) as Record<string, unknown> }
  } catch {
    return { text, meta: {} }
  }
}

export function buildVaccineNotes(text: string, meta: Record<string, unknown>): string | null {
  if (!text.trim() && Object.keys(meta).length === 0) return null
  if (!Object.keys(meta).length) return text.trim() || null
  return `${text}\n${JSON.stringify(meta)}`
}

export function hygieneCanonicalIdFromVaccineNotes(notes: string | null | undefined): string | null {
  const { meta } = parseVaccineNotes(notes)
  return typeof meta.hygieneCanonicalId === 'string' ? meta.hygieneCanonicalId : null
}

export function isVaccineHygieneDuplicate(vaccine: Vaccine): boolean {
  return hygieneCanonicalIdFromVaccineNotes(vaccine.notes) != null
}
