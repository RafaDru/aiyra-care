import type { ScrapedVaccineScheduleItem } from '../../domain/scraper/scraper-types.js'
import type { ExternalDataAdapter } from '../../domain/import-lineage/external-data-adapter.js'
import type { NormalizationMeta } from '../../domain/import-lineage/normalization-meta.js'
import { normalizationFromVaccineConference } from '../../domain/import-lineage/normalization-meta.js'
import { conferVaccineRecord } from '../vaccine/vaccine-conference.service.js'

export interface VaccineScheduleInternal {
  vaccineCode: string | null
  vaccineName: string
  doseLabel: string | null
  doseNumber: number
  status: ScrapedVaccineScheduleItem['status']
  expectedAgeMonths: number | null
  expectedDate: string | null
  applicationDate: string | null
  nextDoseDate: string | null
  batch: string | null
  appliedBy: string | null
  clinic: string | null
  notes: string | null
  externalKey: string
  rawJson: Record<string, unknown>
  catalogSlotKey: string | null
  matchMethod: string | null
  matchScore: number | null
}

export const cadernetaVaccineScheduleAdapter: ExternalDataAdapter<
  ScrapedVaccineScheduleItem,
  VaccineScheduleInternal
> = {
  source: 'caderneta',
  portal: 'caderneta',
  recordType: 'vaccine_schedule',

  externalKey(item) {
    return item.externalKey ?? `${item.vaccineCode ?? ''}:${item.doseLabel ?? item.vaccineName}`
  },

  rawPayload(item) {
    return (item.rawJson ?? item) as Record<string, unknown>
  },

  normalize(item, ctx) {
    const conference = conferVaccineRecord({
      vaccineName: item.vaccineName,
      vaccineCode: item.vaccineCode,
      doseLabel: item.doseLabel,
      doseNumber: item.doseNumber,
      applicationDate: item.applicationDate,
      birthDate: ctx.birthDate,
    })
    return normalizationFromVaccineConference(conference)
  },

  toInternal(item, _ctx, normalization) {
    const conference = conferVaccineRecord({
      vaccineName: item.vaccineName,
      vaccineCode: item.vaccineCode,
      doseLabel: item.doseLabel,
      doseNumber: item.doseNumber,
      applicationDate: item.applicationDate,
      birthDate: _ctx.birthDate,
    })
    const displayName = normalization?.displayName ?? conference.displayName
    const doseNumber = normalization?.catalogSlotKey
      ? Number.parseInt(normalization.catalogSlotKey.split(':')[1] ?? '', 10)
      : conference.doseNumber
    const externalKey = item.externalKey ?? `${item.vaccineCode ?? ''}:${item.doseLabel ?? item.vaccineName}`
    const rawJson = (item.rawJson ?? item) as Record<string, unknown>
    return {
      vaccineCode: item.vaccineCode ?? null,
      vaccineName: displayName,
      doseLabel: item.doseLabel ?? null,
      doseNumber: Number.isFinite(doseNumber) ? doseNumber : conference.doseNumber,
      status: item.status,
      expectedAgeMonths: item.expectedAgeMonths ?? null,
      expectedDate: item.expectedDate ?? null,
      applicationDate: item.applicationDate ?? null,
      nextDoseDate: item.nextDoseDate ?? null,
      batch: item.batch ?? null,
      appliedBy: item.appliedBy ?? null,
      clinic: item.clinic ?? null,
      notes: item.notes ?? null,
      externalKey,
      rawJson,
      catalogSlotKey: normalization?.catalogSlotKey ?? conference.catalogSlotKey,
      matchMethod: normalization?.method ?? conference.method,
      matchScore: normalization?.score ?? conference.score,
    }
  },
}
