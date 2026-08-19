import type { Pool } from 'pg'
import type { Exam } from '../../domain/exam/exam.entity.js'
import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import { examDocumentIdFromNotes } from '../../domain/exam/exam-notes.js'
import { isExamHygieneDuplicate } from '../../domain/hygiene/exam-canonical.js'
import {
  runExamMeasurementImport,
  type ExamMeasurementImportResult,
} from '../measurement/exam-measurement-import.helper.js'

export type ExamArtifactNormalizationResult = {
  measurements: ExamMeasurementImportResult
  canonicalExamsWithArtifacts: number
  skippedHygieneDuplicates: number
}

/** Exame com artefato (PDF/DOC/PPT/imagem) vinculado — laudo ou documento no pedido. */
export function examHasLinkedArtifact(exam: Exam): boolean {
  if (exam.resultFileUrl?.trim()) return true
  return examDocumentIdFromNotes(exam.notes) != null
}

/**
 * Motor de normalização: artefatos de laudo → modelo canônico (medidas, futuro: campos estruturados).
 * Depende de higienização: duplicatas resolvidas (hygieneCanonicalId) não são processadas.
 */
export class ExamArtifactNormalizationService {
  constructor(
    private readonly pool: Pool,
    private readonly exams: ExamRepository,
  ) {}

  async normalizeForPatient(patientId: string): Promise<ExamArtifactNormalizationResult> {
    const allExams = await this.exams.findAll({ patientId })
    let canonicalExamsWithArtifacts = 0
    let skippedHygieneDuplicates = 0

    for (const exam of allExams) {
      if (isExamHygieneDuplicate(exam)) {
        skippedHygieneDuplicates++
        continue
      }
      if (examHasLinkedArtifact(exam)) canonicalExamsWithArtifacts++
    }

    const measurements = await runExamMeasurementImport(this.pool, patientId)

    return {
      measurements,
      canonicalExamsWithArtifacts,
      skippedHygieneDuplicates,
    }
  }
}
