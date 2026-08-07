import type { Pool } from 'pg'
import type { ScrapedChildImportBundle, ScraperResult } from '../../domain/scraper/scraper-types.js'
import {
  planCadernetaFamilyImport,
  type CadernetaFamilyImportPlan,
} from './caderneta-family-match.js'
import { NotFoundError } from '../../domain/errors.js'
import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import { Patient } from '../../domain/patient/patient.entity.js'
import type { VaccineRepository } from '../../domain/vaccine/vaccine.repository.js'
import { Vaccine } from '../../domain/vaccine/vaccine.entity.js'
import { conferVaccineRecord } from '../vaccine/vaccine-conference.service.js'
import type { ImportLineageService } from '../import-lineage/import-lineage.service.js'
import { ingestExternalRecord } from '../import-lineage/external-import.pipeline.js'
import { cadernetaVaccineScheduleAdapter } from './caderneta-vaccine-schedule.adapter.js'
import { normalizationFromVaccineConference } from '../../domain/import-lineage/normalization-meta.js'

export type CadernetaImportPayload = Pick<
  ScraperResult,
  'vaccines' | 'vaccineSchedule' | 'developmentMilestones' | 'clinicalHistory' | 'patientCpf' | 'patientCns'
>

export type CadernetaFamilyImportResult = {
  plan: CadernetaFamilyImportPlan
  byPatient: Array<{ patientId: string; patientName: string; result: CadernetaImportResult }>
  totals: CadernetaImportResult
}

export type CadernetaImportResult = {
  importedVaccines: number
  importedSchedule: number
  importedMilestones: number
  importedClinical: number
  skipped: number
}

export class CadernetaImportService {
  constructor(
    private readonly pool: Pool,
    private readonly patients: PatientRepository,
    private readonly vaccines: VaccineRepository,
    private readonly lineage: ImportLineageService,
  ) {}

  async listSchedule(patientId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM vaccine_schedule_items WHERE patient_id = $1 ORDER BY expected_age_months NULLS LAST, vaccine_name`,
      [patientId],
    )
    return rows
  }

  async listMilestones(patientId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM development_milestones WHERE patient_id = $1 ORDER BY expected_age_months NULLS LAST, title`,
      [patientId],
    )
    return rows
  }

  async importForPatient(patientId: string, data: CadernetaImportPayload): Promise<CadernetaImportResult> {
    const patient = await this.patients.findById(patientId)
    if (!patient) throw new NotFoundError('Patient', patientId)

    let importedVaccines = 0
    let importedSchedule = 0
    let importedMilestones = 0
    let importedClinical = 0
    let skipped = 0

    const birthDate = patient.birthDate instanceof Date
      ? patient.birthDate.toISOString().slice(0, 10)
      : null

    const batchId = await this.lineage.startBatch({
      patientId,
      source: 'caderneta',
      portal: 'caderneta',
    })

    const adapterCtx = { patientId, birthDate, batchId }

    const existingVaccines = await this.vaccines.findAll({ patientId })

    for (const v of data.vaccines ?? []) {
      if (!v.vaccineName || !v.applicationDate) {
        skipped++
        continue
      }
      const exists = existingVaccines.some(
        (x) => x.vaccineName === v.vaccineName
          && x.applicationDate.toISOString().slice(0, 10) === v.applicationDate.slice(0, 10),
      )
      if (exists) {
        skipped++
        continue
      }
      const doseNum = v.dose ? Number.parseInt(v.dose.replace(/\D/g, ''), 10) : undefined
      const conference = conferVaccineRecord({
        vaccineName: v.vaccineName,
        doseLabel: v.dose,
        doseNumber: doseNum,
        applicationDate: v.applicationDate,
        birthDate,
      })
      const rawJson: Record<string, unknown> = { ...v, source: 'caderneta_applied' }
      const saved = await this.vaccines.save(
        Vaccine.create({
          patientId,
          vaccineName: conference.displayName,
          doseNumber: conference.doseNumber,
          batchNumber: v.batch,
          applicationDate: new Date(v.applicationDate),
          nextDoseDate: v.nextDoseDate ? new Date(v.nextDoseDate) : undefined,
          appliedBy: v.appliedBy,
          clinic: v.clinic,
          source: 'caderneta',
        }),
      )
      const rawId = await this.lineage.recordRaw({
        batchId,
        patientId,
        source: 'caderneta',
        recordType: 'vaccine_applied',
        externalKey: `${v.vaccineName}:${v.applicationDate}`,
        rawJson,
        normalization: normalizationFromVaccineConference(conference),
        processed: { table: 'vaccines', id: saved.id },
      })
      await this.pool.query(
        `UPDATE vaccines SET vaccine_code = $2, catalog_slot_key = $3, import_raw_id = $4, external_key = $5
         WHERE id = $1`,
        [
          saved.id,
          null,
          conference.catalogSlotKey,
          rawId,
          `${v.vaccineName}:${v.applicationDate}`,
        ],
      )
      importedVaccines++
    }

    for (const item of data.vaccineSchedule ?? []) {
      let scheduleRowId = ''
      const { rawId } = await ingestExternalRecord(
        this.lineage,
        cadernetaVaccineScheduleAdapter,
        item,
        adapterCtx,
        {
          persist: async (row) => {
            const res = await this.pool.query(
              `INSERT INTO vaccine_schedule_items (
                patient_id, vaccine_code, vaccine_name, dose_label, dose_number, status,
                expected_age_months, expected_date, application_date, next_dose_date,
                batch_number, applied_by, clinic, notes, source, external_key, raw_json,
                catalog_slot_key, match_method, match_score, import_raw_id
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'caderneta',$15,$16::jsonb,$17,$18,$19,NULL)
              ON CONFLICT (patient_id, source, external_key) WHERE external_key IS NOT NULL
              DO UPDATE SET
                vaccine_code = EXCLUDED.vaccine_code,
                vaccine_name = EXCLUDED.vaccine_name,
                dose_label = EXCLUDED.dose_label,
                dose_number = EXCLUDED.dose_number,
                status = EXCLUDED.status,
                expected_age_months = EXCLUDED.expected_age_months,
                expected_date = EXCLUDED.expected_date,
                application_date = EXCLUDED.application_date,
                next_dose_date = EXCLUDED.next_dose_date,
                batch_number = EXCLUDED.batch_number,
                applied_by = EXCLUDED.applied_by,
                clinic = EXCLUDED.clinic,
                notes = EXCLUDED.notes,
                raw_json = EXCLUDED.raw_json,
                catalog_slot_key = EXCLUDED.catalog_slot_key,
                match_method = EXCLUDED.match_method,
                match_score = EXCLUDED.match_score,
                updated_at = NOW()
              RETURNING id, (xmax = 0) AS inserted`,
              [
                patientId,
                row.vaccineCode,
                row.vaccineName,
                row.doseLabel,
                row.doseNumber,
                row.status,
                row.expectedAgeMonths,
                row.expectedDate,
                row.applicationDate,
                row.nextDoseDate,
                row.batch,
                row.appliedBy,
                row.clinic,
                row.notes,
                row.externalKey,
                JSON.stringify(row.rawJson),
                row.catalogSlotKey,
                row.matchMethod,
                row.matchScore,
              ],
            )
            scheduleRowId = res.rows[0].id as string
            if (res.rows[0]?.inserted) importedSchedule++
            else skipped++
            return { table: 'vaccine_schedule_items', id: scheduleRowId }
          },
        },
      )
      await this.pool.query(
        `UPDATE vaccine_schedule_items SET import_raw_id = $2 WHERE id = $1`,
        [scheduleRowId, rawId],
      )
    }

    for (const m of data.developmentMilestones ?? []) {
      if (!m.title) {
        skipped++
        continue
      }
      const externalKey = m.externalKey ?? m.title
      const rawJson = (m.rawJson ?? m) as Record<string, unknown>
      const rawId = await this.lineage.recordRaw({
        batchId,
        patientId,
        source: 'caderneta',
        recordType: 'development_milestone',
        externalKey,
        rawJson,
      })
      const res = await this.pool.query(
        `INSERT INTO development_milestones (
          patient_id, title, category, status, expected_age_months, achieved_date, notes,
          source, external_key, raw_json, import_raw_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'caderneta',$8,$9::jsonb,$10)
        ON CONFLICT (patient_id, source, external_key) WHERE external_key IS NOT NULL
        DO UPDATE SET
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          expected_age_months = EXCLUDED.expected_age_months,
          achieved_date = EXCLUDED.achieved_date,
          notes = EXCLUDED.notes,
          raw_json = EXCLUDED.raw_json,
          import_raw_id = EXCLUDED.import_raw_id,
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS inserted`,
        [
          patientId,
          m.title,
          m.category ?? null,
          m.status,
          m.expectedAgeMonths ?? null,
          m.achievedDate ?? null,
          m.notes ?? null,
          externalKey,
          JSON.stringify(rawJson),
          rawId,
        ],
      )
      const milestoneId = res.rows[0].id as string
      await this.lineage.linkProcessed(rawId, { table: 'development_milestones', id: milestoneId })
      if (res.rows[0]?.inserted) importedMilestones++
      else skipped++
    }

    for (const c of data.clinicalHistory ?? []) {
      if (!c.title) {
        skipped++
        continue
      }
      const recordDate = c.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
      const rawJson = { ...c, source: 'caderneta_clinical' } as Record<string, unknown>
      const rawId = await this.lineage.recordRaw({
        batchId,
        patientId,
        source: 'caderneta',
        recordType: 'clinical_record',
        externalKey: `${c.title}:${recordDate}`,
        rawJson,
      })
      const { rows } = await this.pool.query(
        `INSERT INTO medical_records (patient_id, record_date, record_type, description, notes)
         VALUES ($1, $2, 'clinical_history', $3, $4)
         RETURNING id`,
        [
          patientId,
          recordDate,
          c.title,
          [c.description, c.category].filter(Boolean).join(' · ') || null,
        ],
      )
      await this.lineage.linkProcessed(rawId, { table: 'medical_records', id: rows[0].id as string })
      importedClinical++
    }

    if (data.patientCpf || data.patientCns) {
      const existing = await this.patients.findById(patientId)
      if (existing) {
        const updated = Patient.restore({
          ...existing.toJSON(),
          cpf: data.patientCpf?.replace(/\D/g, '') || existing.cpf,
          cns: data.patientCns || existing.cns,
          updatedAt: new Date(),
        })
        await this.patients.update(updated)
      }
    }

    await this.lineage.completeBatch(batchId, {
      importedVaccines,
      importedSchedule,
      importedMilestones,
      importedClinical,
      skipped,
    })

    return { importedVaccines, importedSchedule, importedMilestones, importedClinical, skipped }
  }

  async planFamilyImport(
    anchorPatientId: string,
    childBundles: ScrapedChildImportBundle[],
    responsibleCpf?: string,
  ): Promise<CadernetaFamilyImportPlan> {
    const anchor = await this.patients.findById(anchorPatientId)
    if (!anchor) throw new NotFoundError('Patient', anchorPatientId)
    const allPatients = await this.patients.findAll()
    return planCadernetaFamilyImport(anchorPatientId, anchor, allPatients, childBundles, responsibleCpf)
  }

  async importFamilyForAnchor(
    anchorPatientId: string,
    childBundles: ScrapedChildImportBundle[],
    responsibleCpf?: string,
  ): Promise<CadernetaFamilyImportResult> {
    const plan = await this.planFamilyImport(anchorPatientId, childBundles, responsibleCpf)
    const byPatient: CadernetaFamilyImportResult['byPatient'] = []
    const totals: CadernetaImportResult = {
      importedVaccines: 0,
      importedSchedule: 0,
      importedMilestones: 0,
      importedClinical: 0,
      skipped: 0,
    }

    for (const match of plan.matches) {
      const member = match.bundle.member
      const result = await this.importForPatient(match.patientId, {
        vaccines: match.bundle.vaccines,
        vaccineSchedule: match.bundle.vaccineSchedule,
        developmentMilestones: match.bundle.developmentMilestones,
        clinicalHistory: match.bundle.clinicalHistory,
        patientCpf: member.cpf,
        patientCns: member.cns,
      })
      byPatient.push({ patientId: match.patientId, patientName: match.patientName, result })
      totals.importedVaccines += result.importedVaccines
      totals.importedSchedule += result.importedSchedule
      totals.importedMilestones += result.importedMilestones
      totals.importedClinical += result.importedClinical
      totals.skipped += result.skipped
    }

    return { plan, byPatient, totals }
  }
}
