import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { MeasurementRepository } from '../../domain/measurement/measurement.repository.js'
import { MeasurementObservation } from '../../domain/measurement/measurement-observation.entity.js'
import { isGlucoseExamLabel, parseGlucoseMgDl } from '../../domain/measurement/who-growth-reference.js'

export type GlucoseImportResult = {
  imported: number
  skipped: number
  examIds: string[]
}

export class GlucoseExamImportService {
  constructor(
    private readonly exams: ExamRepository,
    private readonly measurements: MeasurementRepository,
  ) {}

  async importForPatient(patientId: string): Promise<GlucoseImportResult> {
    const allExams = await this.exams.findAll({ patientId })
    const existing = await this.measurements.findObservations({ patientId, typeCodes: ['glucose'] })
    const existingRefs = new Set(
      existing.map((o) => o.sourceRef).filter((r): r is string => r?.startsWith('exam:')),
    )

    let imported = 0
    let skipped = 0
    const examIds: string[] = []

    for (const exam of allExams) {
      const sourceRef = `exam:${exam.id}`
      if (existingRefs.has(sourceRef)) {
        skipped++
        continue
      }

      const labelParts = [
        exam.examType,
        exam.laboratory,
        exam.resultSummary,
        exam.notes,
      ].filter(Boolean).join(' ')

      if (!isGlucoseExamLabel(labelParts)) {
        skipped++
        continue
      }

      const value = parseGlucoseMgDl(labelParts)
      if (value == null) {
        skipped++
        continue
      }

      const observedAt = exam.examDate instanceof Date ? exam.examDate : new Date(exam.examDate)
      const obs = MeasurementObservation.create({
        patientId,
        typeCode: 'glucose',
        observedAt,
        valueNumeric: value,
        unit: 'mg/dL',
        source: 'import',
        sourceRef,
        context: { examType: exam.examType, laboratory: exam.laboratory },
        notes: exam.resultSummary?.slice(0, 500) ?? null,
      })

      await this.measurements.saveObservation(obs)
      existingRefs.add(sourceRef)
      imported++
      examIds.push(exam.id)
    }

    return { imported, skipped, examIds }
  }
}
