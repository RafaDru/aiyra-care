import type { ScraperResult } from '../../domain/scraper/scraper-types.js'
import type { PatientService } from '../patient/patient.service.js'
import type { VaccineService } from '../vaccine/vaccine.service.js'
import type { ExamService } from '../exam/exam.service.js'

export type ConecteSUSImportResult = {
  importedVaccines: number
  importedExams: number
  skipped: number
}

export class ConecteSUSImportService {
  constructor(
    private readonly patients: PatientService,
    private readonly vaccines: VaccineService,
    private readonly exams: ExamService,
  ) {}

  async importForPatient(patientId: string, data: ScraperResult): Promise<ConecteSUSImportResult> {
    const patient = await this.patients.findById(patientId)

    let importedVaccines = 0
    let importedExams = 0
    let skipped = 0

    const existingVaccines = await this.vaccines.findAll({ patientId })
    const existingExams = await this.exams.findAll({ patientId })

    for (const v of data.vaccines) {
      const appDate = v.applicationDate?.slice(0, 10)
      const dup = existingVaccines.some(
        (x) => x.vaccineName === v.vaccineName && x.applicationDate?.toISOString().slice(0, 10) === appDate,
      )
      if (dup) {
        skipped++
        continue
      }
      await this.vaccines.create({
        patientId,
        vaccineName: v.vaccineName,
        doseNumber: Number(String(v.dose ?? '').replace(/\D/g, '')) || undefined,
        applicationDate: new Date(v.applicationDate),
        batchNumber: v.batch ?? undefined,
        appliedBy: v.appliedBy ?? undefined,
        clinic: v.clinic ?? undefined,
        source: 'conectesus',
      })
      importedVaccines++
    }

    for (const e of data.exams) {
      const examDate = e.examDate?.slice(0, 10)
      const dup = existingExams.some(
        (x) => x.examType === e.examType && x.examDate?.toISOString().slice(0, 10) === examDate,
      )
      if (dup) {
        skipped++
        continue
      }
      await this.exams.create({
        patientId,
        examType: e.examType,
        examDate: new Date(e.examDate),
        resultSummary: e.results ?? undefined,
        source: 'conectesus',
      })
      importedExams++
    }

    if (data.patientCpf || data.patientCns) {
      await this.patients.update(patientId, {
        cpf: data.patientCpf ?? patient.cpf ?? undefined,
        cns: data.patientCns ?? patient.cns ?? undefined,
      })
    }

    return { importedVaccines, importedExams, skipped }
  }
}
