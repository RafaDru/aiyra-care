import type { Pool } from 'pg'
import { GlucoseExamImportService } from './glucose-exam-import.service.js'
import { ExamPgRepository } from '../../infrastructure/persistence/exam.pg.repository.js'
import { MeasurementPgRepository } from '../../infrastructure/persistence/measurement.pg.repository.js'
import { DocumentPgRepository } from '../../infrastructure/persistence/document.pg.repository.js'
import { ExamOrderPgRepository } from '../../infrastructure/persistence/exam-order.pg.repository.js'

export type ExamMeasurementImportResult = {
  glucose: Awaited<ReturnType<GlucoseExamImportService['importForPatient']>>
}

/** Após sync/import de exames com OCR de laudo — extrai medidas pontuais (glicemia, etc.). */
export async function runExamMeasurementImport(pool: Pool, patientId: string): Promise<ExamMeasurementImportResult> {
  const glucoseImport = new GlucoseExamImportService(
    new ExamPgRepository(pool),
    new MeasurementPgRepository(pool),
    new DocumentPgRepository(pool),
    new ExamOrderPgRepository(pool),
  )
  const glucose = await glucoseImport.importForPatient(patientId)
  return { glucose }
}
