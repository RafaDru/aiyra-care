import type { Exam } from '../exam/exam.entity.js'
import { parseExamNotes } from '../exam/exam-notes.js'

export interface ExamDuplicateCandidate {
  examA: Exam
  examB: Exam
  detector: string
  score: number
  evidence: Record<string, unknown>
}

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normType(examType: string): string {
  return norm(examType).replace(/[^\w\sáàâãéêíóôõúçüñ-]/gi, '')
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function orderedPair<T>(a: T, b: T): [T, T] {
  return a < b ? [a, b] : [b, a]
}

/** Compara dois exames do mesmo paciente; retorna candidato ou null. */
export function detectExamDuplicatePair(examA: Exam, examB: Exam): ExamDuplicateCandidate | null {
  if (examA.patientId !== examB.patientId) return null
  if (examA.id === examB.id) return null

  const notesA = parseExamNotes(examA.notes)
  const notesB = parseExamNotes(examB.notes)

  if (notesA.dedup && notesB.dedup && notesA.dedup === notesB.dedup) {
    return {
      examA,
      examB,
      detector: 'exam_dedup_key',
      score: 100,
      evidence: { dedupKey: notesA.dedup },
    }
  }

  const sameDate = dateKey(examA.examDate) === dateKey(examB.examDate)
  const sameType = normType(examA.examType) === normType(examB.examType)
  const labA = norm(examA.laboratory)
  const labB = norm(examB.laboratory)
  const sameLab = labA && labB && labA === labB

  if (sameDate && sameType && sameLab) {
    return {
      examA,
      examB,
      detector: 'exam_date_type_lab',
      score: 92,
      evidence: {
        examDate: dateKey(examA.examDate),
        examType: examA.examType,
        laboratory: examA.laboratory,
      },
    }
  }

  if (sameDate && sameType) {
    return {
      examA,
      examB,
      detector: 'exam_date_type',
      score: 78,
      evidence: {
        examDate: dateKey(examA.examDate),
        examType: examA.examType,
      },
    }
  }

  const pedidoA = typeof notesA.meta.pedidoId === 'string' ? notesA.meta.pedidoId : null
  const pedidoB = typeof notesB.meta.pedidoId === 'string' ? notesB.meta.pedidoId : null
  if (pedidoA && pedidoB && pedidoA === pedidoB && sameType) {
    return {
      examA,
      examB,
      detector: 'exam_pedido_type',
      score: 88,
      evidence: { pedidoId: pedidoA, examType: examA.examType },
    }
  }

  const summaryA = norm(examA.resultSummary)
  const summaryB = norm(examB.resultSummary)
  const sameSummary = summaryA.length >= 3 && summaryA === summaryB
  const typeA = normType(examA.examType)
  const typeB = normType(examB.examType)
  const covidLike = (t: string) =>
    /sars|covid|coronav|igg|igm|anticorpo/.test(t)

  if (sameDate && sameSummary && (typeA === typeB || (covidLike(typeA) && covidLike(typeB)))) {
    return {
      examA,
      examB,
      detector: 'exam_date_result',
      score: 88,
      evidence: {
        examDate: dateKey(examA.examDate),
        resultSummary: examA.resultSummary,
        examTypeA: examA.examType,
        examTypeB: examB.examType,
      },
    }
  }

  return null
}

/** Varre exames do paciente e retorna candidatos únicos (par ordenado por id). */
export function findExamDuplicateCandidates(exams: Exam[], minScore = 75): ExamDuplicateCandidate[] {
  const out: ExamDuplicateCandidate[] = []
  const seen = new Set<string>()

  for (let i = 0; i < exams.length; i++) {
    for (let j = i + 1; j < exams.length; j++) {
      const hit = detectExamDuplicatePair(exams[i], exams[j])
      if (!hit || hit.score < minScore) continue
      const [idA, idB] = orderedPair(hit.examA.id, hit.examB.id)
      const key = `${idA}:${idB}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(hit)
    }
  }

  return out.sort((a, b) => b.score - a.score)
}
