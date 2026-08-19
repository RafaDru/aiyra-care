import type { Exam } from '../../domain/exam/exam.entity.js'
import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { Vaccine } from '../../domain/vaccine/vaccine.entity.js'
import type { VaccineRepository } from '../../domain/vaccine/vaccine.repository.js'
import { findExamDuplicateCandidates } from '../../domain/hygiene/exam-duplicate-detector.js'
import { findVaccineDuplicateCandidates } from '../../domain/hygiene/vaccine-duplicate-detector.js'
import type { HygieneRepository, PatientAccountResolver } from '../../domain/hygiene/hygiene.repository.js'

export class HygieneDetectorService {
  constructor(
    private readonly exams: ExamRepository,
    private readonly vaccines: VaccineRepository,
    private readonly hygiene: HygieneRepository,
    private readonly accounts: PatientAccountResolver,
    private readonly birthDates: PatientBirthDateResolver,
  ) {}

  async scanPatient(patientId: string, minScore = 75): Promise<number> {
    const exams = await this.scanPatientExams(patientId, minScore)
    const vaccines = await this.scanPatientVaccines(patientId, minScore)
    return exams + vaccines
  }

  /** Após insert/update de exame ou varredura batch — detecta pares e grava candidatos. */
  async scanPatientExams(patientId: string, minScore = 75): Promise<number> {
    const accountId = await this.accounts.resolveAccountIdForPatient(patientId)
    if (!accountId) return 0

    const exams = await this.exams.findAll({ patientId })
    const candidates = findExamDuplicateCandidates(exams, minScore)
    return this.upsertCandidates(accountId, patientId, 'exam', candidates.map((c) => ({
      entityIdA: c.examA.id,
      entityIdB: c.examB.id,
      detector: c.detector,
      score: c.score,
      evidence: c.evidence,
    })))
  }

  async scanPatientVaccines(patientId: string, minScore = 75): Promise<number> {
    const accountId = await this.accounts.resolveAccountIdForPatient(patientId)
    if (!accountId) return 0

    const birthDate = await this.birthDates.resolveBirthDateForPatient(patientId)
    const vaccines = await this.vaccines.findAll({ patientId })
    const candidates = findVaccineDuplicateCandidates(vaccines, birthDate, minScore)
    return this.upsertCandidates(accountId, patientId, 'vaccine', candidates.map((c) => ({
      entityIdA: c.vaccineA.id,
      entityIdB: c.vaccineB.id,
      detector: c.detector,
      score: c.score,
      evidence: c.evidence,
    })))
  }

  private async upsertCandidates(
    accountId: string,
    patientId: string,
    entityType: 'exam' | 'vaccine',
    pairs: Array<{
      entityIdA: string
      entityIdB: string
      detector: string
      score: number
      evidence: Record<string, unknown>
    }>,
  ): Promise<number> {
    let created = 0
    for (const c of pairs) {
      const row = await this.hygiene.upsertCandidate({
        accountId,
        patientId,
        entityType,
        entityIdA: c.entityIdA,
        entityIdB: c.entityIdB,
        detector: c.detector,
        score: c.score,
        evidence: c.evidence,
      })
      if (row) created++
    }
    return created
  }

  async scanAfterExamUpsert(exam: Exam): Promise<void> {
    await this.scanPatientExams(exam.patientId)
  }

  async scanAfterVaccineUpsert(vaccine: Vaccine): Promise<void> {
    await this.scanPatientVaccines(vaccine.patientId)
  }
}

export interface PatientBirthDateResolver {
  resolveBirthDateForPatient(patientId: string): Promise<string | null>
}
