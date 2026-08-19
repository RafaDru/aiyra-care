import type { Pool } from 'pg'
import { HygieneDetectorService } from '../hygiene/hygiene-detector.service.js'
import { ExamPgRepository } from '../../infrastructure/persistence/exam.pg.repository.js'
import { VaccinePgRepository } from '../../infrastructure/persistence/vaccine.pg.repository.js'
import {
  HygienePgRepository,
  PatientAccountPgResolver,
  PatientBirthDatePgResolver,
} from '../../infrastructure/persistence/hygiene.pg.repository.js'

/** Varredura de higienização após sync ou job agendado. */
export async function runHygieneScanForPatient(pool: Pool, patientId: string): Promise<number> {
  const hygieneRepo = new HygienePgRepository(pool)
  const accounts = new PatientAccountPgResolver(pool)
  const birthDates = new PatientBirthDatePgResolver(pool)
  const exams = new ExamPgRepository(pool)
  const vaccines = new VaccinePgRepository(pool)
  const detector = new HygieneDetectorService(exams, vaccines, hygieneRepo, accounts, birthDates)
  return detector.scanPatient(patientId)
}

/** Varredura de todos os pacientes com owner_account_id ou membership. */
export async function runHygieneScanAll(pool: Pool): Promise<{ patients: number; candidates: number }> {
  const { rows } = await pool.query(
    `SELECT DISTINCT patient_id FROM (
       SELECT id AS patient_id FROM patients WHERE owner_account_id IS NOT NULL
       UNION
       SELECT patient_id FROM patient_memberships
     ) t`,
  )
  let candidates = 0
  for (const row of rows) {
    candidates += await runHygieneScanForPatient(pool, row.patient_id as string)
  }
  return { patients: rows.length, candidates }
}
