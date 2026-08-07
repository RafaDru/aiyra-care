import type { Medication } from './api.types.js'

/** Extrai duração de notes legadas ("Duração: 5 dias · …"). */
export function extractDurationFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const m = notes.match(/Duração:\s*([^·]+)/i)
  return m?.[1]?.trim() ?? null
}

export function effectiveDuration(med: Pick<Medication, 'duration' | 'notes'>): string | null {
  return med.duration?.trim() || extractDurationFromNotes(med.notes)
}

/** Converte textos comuns de receita em dias (ex.: "5 dias", "2 semanas"). */
export function parseDurationDays(duration: string | null | undefined): number | null {
  if (!duration?.trim()) return null
  const text = duration.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (/continu|cronico|indetermin|uso permanente/.test(text)) return null

  const dayMatch = text.match(/(\d+)\s*dias?\b/)
  if (dayMatch) return Number(dayMatch[1])

  const weekMatch = text.match(/(\d+)\s*semanas?\b/)
  if (weekMatch) return Number(weekMatch[1]) * 7

  const monthMatch = text.match(/(\d+)\s*mes(es)?\b/)
  if (monthMatch) return Number(monthMatch[1]) * 30

  const onlyNumber = text.match(/^(\d+)$/)
  if (onlyNumber) return Number(onlyNumber[1])

  return null
}

export function projectEndDate(start: Date, durationDays: number): Date {
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + durationDays)
  return end
}

export function resolveProjectedEndDate(
  med: Pick<Medication, 'duration' | 'notes' | 'startedAt' | 'startDate'>,
): Date | null {
  const days = parseDurationDays(effectiveDuration(med))
  if (!days) return null
  const anchor = med.startedAt ?? med.startDate
  if (!anchor) return null
  return projectEndDate(new Date(anchor), days)
}

export function formatMedicationDate(value: string | Date | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}
