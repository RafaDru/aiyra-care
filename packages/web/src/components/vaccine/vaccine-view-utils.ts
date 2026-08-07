import type { Vaccine, VaccineScheduleItem } from '../../lib/api.types.js'
import { getAllCatalogSlots } from './vaccine-catalog.js'
import {
  buildConferredSlotMap,
  listUnconferredApplied,
  listUnconferredSchedule,
  type SlotVariableData,
} from './vaccine-conference.js'
import {
  type DoseVisualStatus,
  formatDoseLabel,
  formatPeriodLabel,
  formatShortDate,
  patientAgeMonths,
  resolveVisualStatus,
  sourceLabel,
} from './vaccine-display-helpers.js'

export interface VaccineDoseRow {
  id: string
  seriesKey: string
  catalogId: string
  displayName: string
  doseNumber: number
  doseLabel: string
  visualStatus: DoseVisualStatus
  periodMonths: number
  periodLabel: string
  primaryLine: string
  secondaryLine?: string
  /** Linha de conferência — uma ou mais origens. */
  confirmationLine?: string
  sourceLabels: string[]
  isExtra: boolean
  clinic?: string | null
  batch?: string | null
  linkFromAbove?: boolean
  unconferredLabel?: string
  /** ID do registro em `vaccines` quando a dose veio de cadastro manual (ou outra origem editável). */
  vaccineRecordId?: string
  editable?: boolean
}

export interface VaccinePeriodGroup {
  periodMonths: number
  periodLabel: string
  rows: VaccineDoseRow[]
}

export interface VaccinePeriodView {
  groups: VaccinePeriodGroup[]
  extraGroup?: VaccinePeriodGroup
  counts: { overdue: number; current: number; applied: number; future: number }
  conferredSlots: number
  totalCatalogSlots: number
  multiSourceConfirmations: number
}

export interface VaccineAlphabeticalGroup {
  vaccineName: string
  catalogId: string
  rows: VaccineDoseRow[]
  isExtra: boolean
}

export interface TimelineColumn {
  ageMonths: number
  periodLabel: string
  catalogRows: VaccineDoseRow[]
  extraRows: VaccineDoseRow[]
}

export interface VaccineTimelineView {
  columns: TimelineColumn[]
  childAgeMonths: number
  horizonMonths: number
}

/** 18 anos — limite calendário infantil PNI na UI. */
export const CHILD_VACCINE_VIEW_MAX_MONTHS = 18 * 12

/** Horizonte mínimo à frente da idade atual no carrossel (10 anos). */
export const TIMELINE_FORWARD_MONTHS = 10 * 12

function confirmationLineFromSources(sources: string[]): string | undefined {
  if (sources.length === 0) return undefined
  const labels = sources.map(sourceLabel)
  if (labels.length === 1) return `Fonte: ${labels[0]}`
  return `Confirmado por: ${labels.join(' · ')}`
}

function sourcesFromData(data?: SlotVariableData): string[] {
  if (!data) return []
  if (data.sources?.length) return data.sources
  return data.source ? [data.source] : []
}

function isManualVaccineRecord(data?: SlotVariableData): boolean {
  if (!data?.vaccineRecordId) return false
  const sources = sourcesFromData(data)
  return sources.length > 0 && sources.every((s) => s === 'manual')
}

function primaryLineForSlot(
  data: SlotVariableData | undefined,
  visualStatus: DoseVisualStatus,
  ageMonths: number,
): string {
  if (data?.applicationDate) {
    return `Aplicada em ${formatShortDate(data.applicationDate)}`
  }
  if (visualStatus === 'overdue') {
    return `Não aplicada — atrasada (prevista ${formatPeriodLabel(ageMonths)})`
  }
  if (visualStatus === 'current') {
    return `Período para vacinação (${formatPeriodLabel(ageMonths)})`
  }
  return `Prevista — ${formatPeriodLabel(ageMonths)}`
}

function rowFromCatalogSlot(
  slotKey: string,
  catalogId: string,
  vaccineName: string,
  doseNumber: number,
  ageMonths: number,
  data: SlotVariableData | undefined,
  childAgeMonths: number,
): VaccineDoseRow {
  const hasApp = Boolean(data?.applicationDate)
  const visualStatus = resolveVisualStatus(
    hasApp,
    data?.scheduleStatus,
    ageMonths,
    childAgeMonths,
  )
  const meta: string[] = []
  if (data?.clinic) meta.push(data.clinic)
  if (data?.appliedBy) meta.push(data.appliedBy)
  if (data?.notes) meta.push(data.notes)

  const sources = sourcesFromData(data)

  return {
    id: slotKey,
    seriesKey: catalogId,
    catalogId,
    displayName: vaccineName,
    doseNumber,
    doseLabel: formatDoseLabel(doseNumber),
    visualStatus,
    periodMonths: ageMonths,
    periodLabel: formatPeriodLabel(ageMonths),
    primaryLine: primaryLineForSlot(data, visualStatus, ageMonths),
    secondaryLine: meta.length ? meta.join(' · ') : undefined,
    confirmationLine: confirmationLineFromSources(sources),
    sourceLabels: sources.map(sourceLabel),
    isExtra: false,
    clinic: data?.clinic,
    batch: data?.batch,
    vaccineRecordId: data?.vaccineRecordId,
    editable: isManualVaccineRecord(data),
  }
}

function rowFromUnconferredSchedule(item: VaccineScheduleItem, childAgeMonths: number): VaccineDoseRow {
  const age = item.expected_age_months ?? childAgeMonths
  const hasApp = Boolean(item.application_date)
  const visualStatus = resolveVisualStatus(hasApp, item.status, age, childAgeMonths)
  return {
    id: `unconf-schedule:${item.id}`,
    seriesKey: `raw:${item.id}`,
    catalogId: 'extra',
    displayName: item.vaccine_name,
    doseNumber: item.dose_number ?? 1,
    doseLabel: item.dose_label ?? formatDoseLabel(item.dose_number ?? 1),
    visualStatus,
    periodMonths: age,
    periodLabel: formatPeriodLabel(age),
    primaryLine: primaryLineForSlot(slotDataFromScheduleItem(item), visualStatus, age),
    secondaryLine: [item.clinic, item.applied_by].filter(Boolean).join(' · ') || undefined,
    confirmationLine: confirmationLineFromSources([item.source]),
    sourceLabels: [sourceLabel(item.source)],
    isExtra: true,
    clinic: item.clinic,
    batch: item.batch_number,
    unconferredLabel: item.vaccine_name,
  }
}

function slotDataFromScheduleItem(item: VaccineScheduleItem): SlotVariableData {
  return {
    applicationDate: item.application_date,
    clinic: item.clinic,
    appliedBy: item.applied_by,
    batch: item.batch_number,
    source: item.source,
    scheduleStatus: item.status,
  }
}

function rowFromUnconferredApplied(vaccine: Vaccine, birthDate?: string | null): VaccineDoseRow {
  const age = birthDate
    ? patientAgeMonths(birthDate, new Date(vaccine.applicationDate))
    : 10001
  return {
    id: `unconf-applied:${vaccine.id}`,
    seriesKey: `raw:${vaccine.id}`,
    catalogId: 'extra',
    displayName: vaccine.vaccineName,
    doseNumber: vaccine.doseNumber ?? 1,
    doseLabel: formatDoseLabel(vaccine.doseNumber ?? 1),
    visualStatus: 'applied',
    periodMonths: age,
    periodLabel: age < 9999 ? formatPeriodLabel(age) : '—',
    primaryLine: `Aplicada em ${formatShortDate(vaccine.applicationDate)}`,
    secondaryLine: [vaccine.clinic, vaccine.appliedBy].filter(Boolean).join(' · ') || undefined,
    confirmationLine: confirmationLineFromSources([vaccine.source]),
    sourceLabels: [sourceLabel(vaccine.source)],
    isExtra: true,
    clinic: vaccine.clinic,
    batch: vaccine.batchNumber,
    unconferredLabel: vaccine.vaccineName,
    vaccineRecordId: vaccine.id,
    editable: vaccine.source === 'manual',
  }
}

export function buildVaccinePeriodView(
  applied: Vaccine[],
  schedule: VaccineScheduleItem[],
  birthDate?: string | null,
): VaccinePeriodView {
  const childAgeMonths = birthDate ? patientAgeMonths(birthDate) : 0
  const catalogSlots = getAllCatalogSlots()
  const slotMap = buildConferredSlotMap(schedule, applied)

  const catalogRows: VaccineDoseRow[] = catalogSlots.map((slot) =>
    rowFromCatalogSlot(
      slot.slotKey,
      slot.catalogId,
      slot.vaccineName,
      slot.doseNumber,
      slot.ageMonths,
      slotMap.get(slot.slotKey),
      childAgeMonths,
    ),
  )

  const unconferredSchedule = listUnconferredSchedule(schedule)
  const unconferredApplied = listUnconferredApplied(applied)
  const extraRows: VaccineDoseRow[] = [
    ...unconferredSchedule.map((item) => rowFromUnconferredSchedule(item, childAgeMonths)),
    ...unconferredApplied.map((v) => rowFromUnconferredApplied(v, birthDate)),
  ]

  const byPeriod = new Map<number, VaccineDoseRow[]>()
  for (const row of catalogRows) {
    if (!byPeriod.has(row.periodMonths)) byPeriod.set(row.periodMonths, [])
    byPeriod.get(row.periodMonths)!.push(row)
  }

  const groups: VaccinePeriodGroup[] = Array.from(byPeriod.entries())
    .sort(([a], [b]) => a - b)
    .map(([periodMonths, rows]) => ({
      periodMonths,
      periodLabel: formatPeriodLabel(periodMonths),
      rows: rows.sort((a, b) => {
        if (a.seriesKey !== b.seriesKey) return a.displayName.localeCompare(b.displayName)
        return a.doseNumber - b.doseNumber
      }),
    }))

  linkSeriesAcrossPeriods(groups)

  const counts = { overdue: 0, current: 0, applied: 0, future: 0 }
  for (const row of catalogRows) {
    counts[row.visualStatus]++
  }
  for (const row of extraRows) {
    if (row.visualStatus === 'applied') counts.applied++
  }

  const extraGroup: VaccinePeriodGroup | undefined = extraRows.length
    ? {
        periodMonths: 10000,
        periodLabel: 'Sem conferência no catálogo',
        rows: extraRows.sort((a, b) => b.periodMonths - a.periodMonths),
      }
    : undefined

  let multiSourceConfirmations = 0
  for (const data of slotMap.values()) {
    const n = data.sources?.length ?? (data.source ? 1 : 0)
    if (n > 1) multiSourceConfirmations++
  }

  return {
    groups,
    extraGroup,
    counts,
    conferredSlots: slotMap.size,
    totalCatalogSlots: catalogSlots.length,
    multiSourceConfirmations,
  }
}

function linkSeriesAcrossPeriods(groups: VaccinePeriodGroup[]): void {
  let prevSeries: string | null = null
  let prevDose = 0
  for (const group of groups) {
    for (const row of group.rows) {
      if (prevSeries === row.seriesKey && row.doseNumber > prevDose) {
        row.linkFromAbove = true
      }
      prevSeries = row.seriesKey
      prevDose = row.doseNumber
    }
  }
}

function allCatalogRows(view: VaccinePeriodView): VaccineDoseRow[] {
  const rows: VaccineDoseRow[] = []
  for (const group of view.groups) rows.push(...group.rows)
  return rows
}

export function buildAlphabeticalGroups(view: VaccinePeriodView): VaccineAlphabeticalGroup[] {
  const map = new Map<string, VaccineAlphabeticalGroup>()

  for (const row of allCatalogRows(view)) {
    const key = row.catalogId
    if (!map.has(key)) {
      map.set(key, {
        vaccineName: row.displayName,
        catalogId: row.catalogId,
        rows: [],
        isExtra: false,
      })
    }
    map.get(key)!.rows.push(row)
  }

  if (view.extraGroup) {
    for (const row of view.extraGroup.rows) {
      const key = `extra:${row.displayName}`
      if (!map.has(key)) {
        map.set(key, {
          vaccineName: row.displayName,
          catalogId: row.catalogId,
          rows: [],
          isExtra: true,
        })
      }
      map.get(key)!.rows.push(row)
    }
  }

  return Array.from(map.values())
    .map((g) => ({
      ...g,
      rows: g.rows.sort((a, b) => a.doseNumber - b.doseNumber || a.periodMonths - b.periodMonths),
    }))
    .sort((a, b) => {
      if (a.isExtra !== b.isExtra) return a.isExtra ? 1 : -1
      return a.vaccineName.localeCompare(b.vaccineName, 'pt-BR')
    })
}

/** Adultos: histórico aplicado e vacinas fora do calendário — sem slots futuros do PNI infantil. */
export function buildAlphabeticalGroupsForAdult(view: VaccinePeriodView): VaccineAlphabeticalGroup[] {
  return buildAlphabeticalGroups(view)
    .map((g) => ({
      ...g,
      rows: g.rows.filter((r) => g.isExtra || r.visualStatus === 'applied'),
    }))
    .filter((g) => g.rows.length > 0)
}

export function buildTimelineView(
  view: VaccinePeriodView,
  birthDate?: string | null,
): VaccineTimelineView {
  const childAgeMonths = birthDate ? patientAgeMonths(birthDate) : 0
  const catalogMax = allCatalogRows(view).reduce((m, r) => Math.max(m, r.periodMonths), 0)
  const horizonMonths = Math.max(
    catalogMax,
    childAgeMonths + TIMELINE_FORWARD_MONTHS,
    TIMELINE_FORWARD_MONTHS,
  )

  const ageSet = new Set<number>()
  for (const row of allCatalogRows(view)) {
    if (row.periodMonths <= horizonMonths) ageSet.add(row.periodMonths)
  }
  if (view.extraGroup) {
    for (const row of view.extraGroup.rows) {
      if (row.periodMonths < 9999 && row.periodMonths <= horizonMonths) ageSet.add(row.periodMonths)
    }
  }
  for (let y = 1; y * 12 <= horizonMonths; y++) ageSet.add(y * 12)
  if (childAgeMonths > 0 && childAgeMonths <= horizonMonths) ageSet.add(childAgeMonths)
  ageSet.add(0)

  const ages = Array.from(ageSet).sort((a, b) => a - b)

  const catalogByAge = new Map<number, VaccineDoseRow[]>()
  for (const row of allCatalogRows(view)) {
    if (row.periodMonths > horizonMonths) continue
    if (!catalogByAge.has(row.periodMonths)) catalogByAge.set(row.periodMonths, [])
    catalogByAge.get(row.periodMonths)!.push(row)
  }

  const extraByAge = new Map<number, VaccineDoseRow[]>()
  if (view.extraGroup) {
    for (const row of view.extraGroup.rows) {
      if (row.periodMonths >= 9999) continue
      if (row.periodMonths > horizonMonths) continue
      if (!extraByAge.has(row.periodMonths)) extraByAge.set(row.periodMonths, [])
      extraByAge.get(row.periodMonths)!.push(row)
    }
  }

  const columns: TimelineColumn[] = ages.map((ageMonths) => ({
    ageMonths,
    periodLabel: formatPeriodLabel(ageMonths),
    catalogRows: (catalogByAge.get(ageMonths) ?? []).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'pt-BR'),
    ),
    extraRows: (extraByAge.get(ageMonths) ?? []).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'pt-BR'),
    ),
  }))

  return { columns, childAgeMonths, horizonMonths }
}

export function prefersChildVaccineView(birthDate?: string | null): boolean {
  if (!birthDate) return true
  return patientAgeMonths(birthDate) < CHILD_VACCINE_VIEW_MAX_MONTHS
}
