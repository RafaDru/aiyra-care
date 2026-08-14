import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GlucoseExamImportService } from '../src/application/measurement/glucose-exam-import.service.js'
import { Exam } from '../src/domain/exam/exam.entity.js'
import type { MeasurementObservation } from '../src/domain/measurement/measurement-observation.entity.js'

function makeExam(id: string, patientId: string, summary: string, examType = 'Glicemia') {
  return Exam.restore({
    id,
    patientId,
    medicalRecordId: null,
    examType,
    examDate: new Date('2026-06-15T10:00:00Z'),
    resultSummary: summary,
    resultFileUrl: null,
    laboratory: 'Lab',
    notes: null,
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
  let service: GlucoseExamImportService

  beforeEach(() => {
    observations.length = 0
    exams.findAll = vi.fn(async () => [
      makeExam('exam-1', 'p1', '98 mg/dL'),
      makeExam('exam-2', 'p1', 'Hemograma normal'),
    ])
    service = new GlucoseExamImportService(exams as never, measurements as never)
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
})
