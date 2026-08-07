import {
  catalogIdFromRndsCode,
  findCatalogEntry,
  getCatalogSlot,
  VACCINE_CATALOG,
  type VaccineCatalogEntry,
} from '../../domain/vaccine/vaccine-catalog.js'

export type MatchMethod = 'rnds_code' | 'alias' | 'fuzzy' | 'unmatched'

export interface ConferenceInput {
  vaccineName: string
  vaccineCode?: string | null
  doseLabel?: string | null
  doseNumber?: number | null
  applicationDate?: string | null
  birthDate?: string | null
}

export interface ConferenceResult {
  catalogSlotKey: string | null
  catalogId: string | null
  displayName: string
  doseNumber: number
  method: MatchMethod
  score: number
}

function inferDoseNumber(doseLabel?: string | null, doseNumber?: number | null): number {
  if (doseNumber != null && doseNumber > 0) return doseNumber
  if (!doseLabel) return 1
  const norm = doseLabel.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const digit = norm.match(/(\d+)/)
  if (digit) return Number.parseInt(digit[1], 10)
  if (/primeira|1a|1ª/.test(norm)) return 1
  if (/segunda|2a|2ª/.test(norm)) return 2
  if (/terceira|3a|3ª/.test(norm)) return 3
  if (/quarta|4a|4ª/.test(norm)) return 4
  return 1
}

function ageMonthsAt(birthDate: string, atDate: string): number {
  const birth = new Date(birthDate)
  const at = new Date(atDate)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return -1
  let months = (at.getFullYear() - birth.getFullYear()) * 12 + (at.getMonth() - birth.getMonth())
  if (at.getDate() < birth.getDate()) months -= 1
  return Math.max(0, months)
}

function resolveDoseNumber(
  entry: VaccineCatalogEntry,
  doseLabel?: string | null,
  doseNumber?: number | null,
  applicationDate?: string | null,
  birthDate?: string | null,
): number {
  const inferred = inferDoseNumber(doseLabel, doseNumber)
  if (entry.doses.some((d) => d.dose === inferred)) return inferred

  if (applicationDate && birthDate) {
    const ageAt = ageMonthsAt(birthDate, applicationDate)
    if (ageAt >= 0) {
      let best = entry.doses[0]
      let bestDiff = Infinity
      for (const d of entry.doses) {
        const diff = Math.abs(d.ageMonths - ageAt)
        if (diff < bestDiff) {
          bestDiff = diff
          best = d
        }
      }
      if (bestDiff <= 4) return best.dose
    }
  }

  return entry.doses[0]?.dose ?? 1
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeKey(s).split(/\s+/).filter((t) => t.length >= 3))
}

function fuzzyScore(name: string, entry: VaccineCatalogEntry): number {
  const a = tokenSet(name)
  if (a.size === 0) return 0
  const candidates = [entry.displayName, ...entry.aliases]
  let best = 0
  for (const c of candidates) {
    const b = tokenSet(c)
    let inter = 0
    for (const t of a) if (b.has(t)) inter++
    const score = inter / Math.max(a.size, b.size)
    if (score > best) best = score
  }
  return best
}

/** Conferência: código RNDS → alias → similaridade de tokens. */
export function conferVaccineRecord(input: ConferenceInput): ConferenceResult {
  const fallbackName = input.vaccineName?.trim() || 'Imunobiológico'

  const fromCode = catalogIdFromRndsCode(input.vaccineCode)
  if (fromCode) {
    const entry = VACCINE_CATALOG.find((e) => e.id === fromCode)
    if (entry) {
      const doseNum = resolveDoseNumber(entry, input.doseLabel, input.doseNumber, input.applicationDate, input.birthDate)
      const slot = getCatalogSlot(fromCode, doseNum)
      if (slot) {
        return {
          catalogSlotKey: slot.slotKey,
          catalogId: fromCode,
          displayName: slot.entry.displayName,
          doseNumber: doseNum,
          method: 'rnds_code',
          score: 1,
        }
      }
    }
  }

  const aliasEntry = findCatalogEntry(input.vaccineName)
  if (aliasEntry) {
    const doseNum = resolveDoseNumber(aliasEntry, input.doseLabel, input.doseNumber, input.applicationDate, input.birthDate)
    const slot = getCatalogSlot(aliasEntry.id, doseNum)
    if (slot) {
      return {
        catalogSlotKey: slot.slotKey,
        catalogId: aliasEntry.id,
        displayName: slot.entry.displayName,
        doseNumber: doseNum,
        method: 'alias',
        score: 0.9,
      }
    }
  }

  let bestEntry: VaccineCatalogEntry | null = null
  let bestScore = 0
  for (const entry of VACCINE_CATALOG) {
    const s = fuzzyScore(input.vaccineName, entry)
    if (s > bestScore) {
      bestScore = s
      bestEntry = entry
    }
  }

  if (bestEntry && bestScore >= 0.45) {
    const doseNum = resolveDoseNumber(bestEntry, input.doseLabel, input.doseNumber, input.applicationDate, input.birthDate)
    const slot = getCatalogSlot(bestEntry.id, doseNum)
    if (slot) {
      return {
        catalogSlotKey: slot.slotKey,
        catalogId: bestEntry.id,
        displayName: slot.entry.displayName,
        doseNumber: doseNum,
        method: 'fuzzy',
        score: bestScore,
      }
    }
  }

  return {
    catalogSlotKey: null,
    catalogId: null,
    displayName: fallbackName,
    doseNumber: inferDoseNumber(input.doseLabel, input.doseNumber),
    method: 'unmatched',
    score: bestScore,
  }
}
