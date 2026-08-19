import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { DocumentRepository } from '../../domain/document/document.repository.js'
import type { ExamOrderRepository } from '../../domain/exam-order/exam-order.repository.js'
import type { MeasurementRepository } from '../../domain/measurement/measurement.repository.js'
import { MeasurementObservation } from '../../domain/measurement/measurement-observation.entity.js'
import { isGlucoseExamLabel, parseGlucoseMgDl } from '../../domain/measurement/who-growth-reference.js'
import { buildExamOcrCorpus, buildExamOcrCorpusContext } from '../exam/exam-ocr-text.js'
import { isExamHygieneDuplicate } from '../../domain/hygiene/exam-canonical.js'

export type GlucoseImportResult = {
  imported: number
  skipped: number
  examIds: string[]
}

export class GlucoseExamImportService {
  constructor(
    private readonly exams: ExamRepository,
    private readonly measurements: MeasurementRepository,
    private readonly documents?: DocumentRepository,
    private readonly examOrders?: ExamOrderRepository,
  ) {}

  async importForPatient(patientId: string): Promise<GlucoseImportResult> {
    const allExams = await this.exams.findAll({ patientId })
    const ocrCtx = this.documents && this.examOrders
      ? await buildExamOcrCorpusContext(allExams, this.documents, this.examOrders)
      : { documentTextById: new Map<string, string>(), orderTextByOrderId: new Map<string, string>() }

    const existing = await this.measurements.findObservations({ patientId, typeCodes: ['glucose'] })
    const existingRefs = new Set(
      existing.map((o) => o.sourceRef).filter((r): r is string => r?.startsWith('exam:')),
    )

    let imported = 0
    let skipped = 0
    const examIds: string[] = []

    for (const exam of allExams) {
      if (isExamHygieneDuplicate(exam)) {
        skipped++
        continue
      }

      const sourceRef = `exam:${exam.id}`
      if (existingRefs.has(sourceRef)) {
        skipped++
        continue
      }

      const labelParts = buildExamOcrCorpus(exam, ocrCtx)

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
