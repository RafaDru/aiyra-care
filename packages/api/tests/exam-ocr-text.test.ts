import { describe, it, expect } from 'vitest'
import { Exam } from '../src/domain/exam/exam.entity.js'
import { buildExamNotes } from '../src/domain/exam/exam-notes.js'
import { buildExamOcrCorpus } from '../src/application/exam/exam-ocr-text.js'

function makeExam(id: string, notes: string | null, examOrderId: string | null = null) {
  return Exam.restore({
    id,
    patientId: 'p1',
    medicalRecordId: null,
    examOrderId,
    examType: 'Glicemia',
    examDate: new Date('2026-06-15'),
    resultSummary: null,
    resultFileUrl: null,
    laboratory: 'Lab',
    notes,
    source: 'hermes_pardini',
    createdAt: new Date('2026-06-15'),
  })
}

describe('buildExamOcrCorpus', () => {
  it('includes document and order OCR text', () => {
    const notes = buildExamNotes('hermes:1:2', { documentId: 'doc-1' })
    const exam = makeExam('e1', notes, 'order-1')
    const corpus = buildExamOcrCorpus(exam, {
      documentTextById: new Map([['doc-1', 'Resultado glicemia 112 mg/dL']]),
      orderTextByOrderId: new Map([['order-1', 'Paciente: Luis']]),
    })
    expect(corpus).toContain('Glicemia')
    expect(corpus).toContain('112 mg/dL')
    expect(corpus).toContain('Paciente: Luis')
  })
})
