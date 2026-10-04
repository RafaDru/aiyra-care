import type { Medication } from '@/lib/api.types'

export function extractDurationFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const m = notes.match(/Duração:\s*([^·]+)/i)
  return m?.[1]?.trim() ?? null
}

export function effectiveDuration(med: Pick<Medication, 'duration' | 'notes'>): string | null {
  return med.duration?.trim() || extractDurationFromNotes(med.notes)
}

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

export type MedicationFormPayload = {
  genericName: string
  brandName?: string
  dosage?: string
  frequency?: string
  route?: string
  duration?: string
  startDate?: string
  endDate?: string
  endDateIsProjected?: boolean
  prescribingDoctor?: string
  notes?: string
  isActive?: boolean
}

export function buildMedicationPayload(input: {
  genericName: string
  brandName: string
  dosage: string
  frequency: string
  route: string
  duration: string
  startDateIso?: string
  endDateIso?: string
  endDateIsProjectedInput?: boolean
  prescribingDoctor: string
  notes: string
  isActive: boolean
}): MedicationFormPayload {
  const duration = input.duration.trim() || undefined
  let endDate = input.endDateIso
  let endDateIsProjected = input.endDateIsProjectedInput ?? false

  const days = parseDurationDays(duration)
  const anchor = input.startDateIso
  if (days && anchor) {
    const projected = projectEndDate(new Date(anchor), days)
    if (!endDate || endDateIsProjected) {
      endDate = projected.toISOString()
      endDateIsProjected = true
    }
  }

  return {
    genericName: input.genericName.trim(),
    brandName: input.brandName.trim() || undefined,
    dosage: input.dosage.trim() || undefined,
    frequency: input.frequency.trim() || undefined,
    route: input.route.trim() || undefined,
    duration,
    startDate: input.startDateIso,
    endDate,
    endDateIsProjected,
    prescribingDoctor: input.prescribingDoctor.trim() || undefined,
    notes: input.notes.trim() || undefined,
    isActive: input.isActive,
  }
}
