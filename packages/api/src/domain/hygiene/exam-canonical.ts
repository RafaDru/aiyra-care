import type { Exam } from '../exam/exam.entity.js'
import { parseExamNotes } from '../exam/exam-notes.js'

/** ID canônico após decisão same_entity em higienização. */
export function hygieneCanonicalIdFromNotes(notes: string | null | undefined): string | null {
  const { meta } = parseExamNotes(notes)
  return typeof meta.hygieneCanonicalId === 'string' ? meta.hygieneCanonicalId : null
}

/** Exame marcado como duplicata — não importar medidas nem re-OCR neste registro. */
export function isExamHygieneDuplicate(exam: Exam): boolean {
  return hygieneCanonicalIdFromNotes(exam.notes) != null
}
