import type { Vaccine, VaccineScheduleItem } from '../../lib/api.types.js'
import {
  catalogIdFromRndsCode,
  findCatalogEntry,
  getCatalogSlot,
  type CatalogSlot,
} from './vaccine-catalog.js'

/** Campos variáveis vindos de qualquer origem — conferidos no slot do catálogo. */
export interface SlotVariableData {
  applicationDate?: string | null
  clinic?: string | null
  appliedBy?: string | null
  batch?: string | null
  source?: string | null
  /** Todas as origens que reportaram esta dose (conferência cruzada). */
  sources?: string[]
  scheduleStatus?: string | null
  scheduleItemId?: string
  vaccineRecordId?: string
  susRawLabel?: string
  notes?: string | null
}

export interface ConferenceResult {
  slot: CatalogSlot | null
  doseNumber: number
  entryId?: string
}

function inferDoseNumber(doseLabel?: string | null, doseNumber?: number | null): number {
  if (doseNumber != null && doseNumber > 0) return doseNumber
  if (!doseLabel) return 1
  const norm = doseLabel.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const digit = norm.match(/(\d+)/)
  if (digit) return Number.parseInt(digit[1], 10)
  if (/primeira|1a|1ª/.test(norm)) return 1
  if (/segunda|2a|2ª|reforco/.test(norm)) return 2
  if (/terceira|3a|3ª/.test(norm)) return 3
  if (/quarta|4a|4ª/.test(norm)) return 4
  return 1
}

/** Conferência: código RNDS → alias → slot já gravado no banco. */
export function conferRawLabel(
  vaccineName: string,
  doseLabel?: string | null,
  doseNumber?: number | null,
  vaccineCode?: string | null,
): ConferenceResult {
  const fromCode = catalogIdFromRndsCode(vaccineCode)
  if (fromCode) {
    const dose = inferDoseNumber(doseLabel, doseNumber)
    const slot = getCatalogSlot(fromCode, dose) ?? getCatalogSlot(fromCode, 1)
    if (slot) return { slot, doseNumber: slot.doseNumber }
  }

  const entry = findCatalogEntry(vaccineName)
  if (!entry) return { slot: null, doseNumber: inferDoseNumber(doseLabel, doseNumber) }

  const inferred = inferDoseNumber(doseLabel, doseNumber)
  const doseDef = entry.doses.find((d) => d.dose === inferred) ?? entry.doses[0]
  const slot = getCatalogSlot(entry.id, doseDef.dose)
  return { slot, doseNumber: doseDef.dose }
}

export function conferScheduleItem(item: VaccineScheduleItem): ConferenceResult {
  if (item.catalog_slot_key) {
    const [catalogId, doseStr] = item.catalog_slot_key.split(':')
    const dose = Number.parseInt(doseStr, 10)
    const slot = getCatalogSlot(catalogId, dose)
    if (slot) return { slot, doseNumber: dose, entryId: item.id }
  }
  const result = conferRawLabel(item.vaccine_name, item.dose_label, item.dose_number, item.vaccine_code)
  return { ...result, entryId: item.id }
}

export function conferAppliedVaccine(vaccine: Vaccine): ConferenceResult {
  const result = conferRawLabel(vaccine.vaccineName, null, vaccine.doseNumber)
  return { ...result, entryId: vaccine.id }
}

function collectSources(prev?: SlotVariableData, next: SlotVariableData): string[] {
  const set = new Set<string>()
  for (const s of prev?.sources ?? []) if (s) set.add(s)
  if (prev?.source) set.add(prev.source)
  if (next.source) set.add(next.source)
  for (const s of next.sources ?? []) if (s) set.add(s)
  return Array.from(set)
}

export function mergeSlotData(prev?: SlotVariableData, next: SlotVariableData): SlotVariableData {
  if (!prev) {
    const sources = collectSources(undefined, next)
    return { ...next, sources }
  }
  return {
    applicationDate: next.applicationDate ?? prev.applicationDate,
    clinic: next.clinic ?? prev.clinic,
    appliedBy: next.appliedBy ?? prev.appliedBy,
    batch: next.batch ?? prev.batch,
    source: next.source ?? prev.source,
    scheduleStatus: next.scheduleStatus ?? prev.scheduleStatus,
    scheduleItemId: next.scheduleItemId ?? prev.scheduleItemId,
    vaccineRecordId: next.vaccineRecordId ?? prev.vaccineRecordId,
    susRawLabel: next.susRawLabel ?? prev.susRawLabel,
    notes: next.notes ?? prev.notes,
    sources: collectSources(prev, next),
  }
}

export function slotDataFromSchedule(item: VaccineScheduleItem): SlotVariableData {
  return {
    applicationDate: item.application_date,
    clinic: item.clinic,
    appliedBy: item.applied_by,
    batch: item.batch_number,
    source: item.source,
    scheduleStatus: item.status,
    scheduleItemId: item.id,
    susRawLabel: item.vaccine_name,
  }
}

export function slotDataFromApplied(vaccine: Vaccine): SlotVariableData {
  return {
    applicationDate: vaccine.applicationDate,
    clinic: vaccine.clinic,
    appliedBy: vaccine.appliedBy,
    batch: vaccine.batchNumber,
    source: vaccine.source,
    scheduleStatus: 'applied',
    vaccineRecordId: vaccine.id,
    susRawLabel: vaccine.vaccineName,
    notes: vaccine.notes,
  }
}

/** Preenche mapa slotKey → dados variáveis conferidos (qualquer origem). */
export function buildConferredSlotMap(
  schedule: VaccineScheduleItem[],
  applied: Vaccine[],
): Map<string, SlotVariableData> {
  const map = new Map<string, SlotVariableData>()

  for (const item of schedule) {
    const key = item.catalog_slot_key
      ? item.catalog_slot_key
      : (() => {
          const { slot } = conferScheduleItem(item)
          return slot?.slotKey
        })()
    if (!key) continue
    map.set(key, mergeSlotData(map.get(key), slotDataFromSchedule(item)))
  }

  for (const vaccine of applied) {
    const { slot } = conferAppliedVaccine(vaccine)
    if (!slot) continue
    const key = slot.slotKey
    map.set(key, mergeSlotData(map.get(key), slotDataFromApplied(vaccine)))
  }

  return map
}

export function listUnconferredSchedule(schedule: VaccineScheduleItem[]): VaccineScheduleItem[] {
  return schedule.filter((item) => !conferScheduleItem(item).slot)
}

export function listUnconferredApplied(applied: Vaccine[]): Vaccine[] {
  return applied.filter((v) => !conferAppliedVaccine(v).slot)
}
