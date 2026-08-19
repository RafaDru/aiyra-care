import { describe, it, expect } from 'vitest'
import { Exam } from '../src/domain/exam/exam.entity.js'
import {
  detectExamDuplicatePair,
  findExamDuplicateCandidates,
} from '../src/domain/hygiene/exam-duplicate-detector.js'

function exam(
  id: string,
  patientId: string,
  type: string,
  date: string,
  lab?: string,
  notes?: string,
  resultSummary?: string | null,
  source = 'manual',
) {
  return Exam.restore({
    id,
    patientId,
    medicalRecordId: null,
    examOrderId: null,
    examType: type,
    examDate: new Date(date),
    resultSummary: resultSummary ?? null,
    resultFileUrl: null,
    laboratory: lab ?? null,
    notes: notes ?? null,
    source,
    createdAt: new Date(),
  })
}

describe('exam-duplicate-detector', () => {
  it('detects same dedup key in notes', () => {
    const a = exam('a', 'p1', 'Hemograma', '2026-01-10', 'Lab', 'hermes:abc\n{}')
    const b = exam('b', 'p1', 'Hemograma', '2026-01-10', 'Outro', 'hermes:abc\n{}')
    const hit = detectExamDuplicatePair(a, b)
    expect(hit?.detector).toBe('exam_dedup_key')
    expect(hit?.score).toBe(100)
  })

  it('detects same date type and lab', () => {
    const a = exam('a', 'p1', 'Glicemia', '2026-02-01', 'Hermes')
    const b = exam('b', 'p1', 'Glicemia', '2026-02-01', 'Hermes')
    const hit = detectExamDuplicatePair(a, b)
    expect(hit?.detector).toBe('exam_date_type_lab')
  })

  it('detects covid same date and result', () => {
    const type =
      'SARS Coronavírus 2, [presença de] anticorpo IgG e IgM em soro ou plasma por imunoensaio'
    const a = exam('a', 'p1', type, '2021-04-11', undefined, undefined, 'Não Detectável', 'manual')
    const b = exam('b', 'p1', type, '2021-04-11', undefined, undefined, 'Não Detectável', 'conectesus')
    const hit = detectExamDuplicatePair(a, b)
    expect(hit?.detector).toBe('exam_date_type')
    expect(hit?.score).toBe(78)
  })

  it('ignores different patients', () => {
    const a = exam('a', 'p1', 'Glicemia', '2026-02-01', 'Hermes')
    const b = exam('b', 'p2', 'Glicemia', '2026-02-01', 'Hermes')
    expect(detectExamDuplicatePair(a, b)).toBeNull()
  })

  it('finds multiple candidates', () => {
    const exams = [
      exam('1', 'p1', 'Hb', '2026-03-01', 'L1'),
      exam('2', 'p1', 'Hb', '2026-03-01', 'L1'),
      exam('3', 'p1', 'Urina', '2026-03-02', 'L1'),
    ]
    const hits = findExamDuplicateCandidates(exams)
    expect(hits.length).toBe(1)
    expect(hits[0].examA.id).toBe('1')
    expect(hits[0].examB.id).toBe('2')
  })
})
