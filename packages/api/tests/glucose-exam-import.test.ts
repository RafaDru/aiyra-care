import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GlucoseExamImportService } from '../src/application/measurement/glucose-exam-import.service.js'
import { Exam } from '../src/domain/exam/exam.entity.js'
import { buildExamNotes } from '../src/domain/exam/exam-notes.js'
import type { MeasurementObservation } from '../src/domain/measurement/measurement-observation.entity.js'
import { Document } from '../src/domain/document/document.entity.js'

function makeExam(id: string, patientId: string, summary: string | null, examType = 'Glicemia', notes: string | null = null) {
  return Exam.restore({
    id,
    patientId,
    medicalRecordId: null,
    examOrderId: null,
    examType,
    examDate: new Date('2026-06-15T10:00:00Z'),
    resultSummary: summary,
    resultFileUrl: null,
    laboratory: 'Lab',
    notes,
    source: 'manual',
    createdAt: new Date('2026-06-15T10:00:00Z'),
  })
}

describe('GlucoseExamImportService', () => {
  const observations: MeasurementObservation[] = []
  const exams = {
    findAll: vi.fn(),
  }
  const measurements = {
    findObservations: vi.fn(async () => observations),
    saveObservation: vi.fn(async (o: MeasurementObservation) => {
      observations.push(o)
      return o
    }),
  }
  const documents = {
    findById: vi.fn(),
  }
  const examOrders = {
    findById: vi.fn(),
  }
  let service: GlucoseExamImportService

  beforeEach(() => {
    observations.length = 0
    documents.findById = vi.fn()
    examOrders.findById = vi.fn()
    exams.findAll = vi.fn(async () => [
      makeExam('exam-1', 'p1', '98 mg/dL'),
      makeExam('exam-2', 'p1', 'Hemograma normal'),
    ])
    service = new GlucoseExamImportService(
      exams as never,
      measurements as never,
      documents as never,
      examOrders as never,
    )
  })

  it('imports glucose from matching exams', async () => {
    const result = await service.importForPatient('p1')
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
    expect(observations[0].typeCode).toBe('glucose')
    expect(observations[0].valueNumeric).toBe(98)
    expect(observations[0].sourceRef).toBe('exam:exam-1')
  })

  it('skips already imported exams', async () => {
    await service.importForPatient('p1')
    const second = await service.importForPatient('p1')
    expect(second.imported).toBe(0)
    expect(second.skipped).toBe(2)
  })

  it('skips hygiene duplicate exams', async () => {
    const dupNotes = buildExamNotes('dup', { hygieneCanonicalId: 'exam-canonical' })
    exams.findAll = vi.fn(async () => [
      makeExam('exam-dup', 'p1', '120 mg/dL', 'Glicemia', dupNotes),
    ])
    const result = await service.importForPatient('p1')
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(1)
    expect(observations.length).toBe(0)
  })

  it('imports glucose from document OCR when summary is empty', async () => {
    const notes = buildExamNotes('hermes:1:2', { documentId: 'doc-g' })
    exams.findAll = vi.fn(async () => [
      makeExam('exam-3', 'p1', null, 'Glicemia', notes),
    ])
    documents.findById = vi.fn(async (id: string) => {
      if (id !== 'doc-g') return null
      return Document.restore({
        id: 'doc-g',
        patientId: 'p1',
        documentType: 'report',
        originalFilename: 'laudo.pdf',
        storagePath: 'path',
        fileSizeBytes: 100,
        mimeType: 'application/pdf',
        extractedText: 'Glicemia em jejum: 105 mg/dL',
        ocrProcessed: true,
        ocrProvider: 'cascade:report',
        ocrQualityScore: null,
        ocrUsedPaid: false,
        ocrParseOk: null,
        ocrFieldsFound: null,
        ocrFieldsExpected: null,
        ocrLayout: null,
        uploadedAt: new Date(),
      })
    })

    const result = await service.importForPatient('p1')
    expect(result.imported).toBe(1)
    expect(observations[0].valueNumeric).toBe(105)
  })
})
