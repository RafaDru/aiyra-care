import type { Exam } from './api.types.js'
import {
  examDocumentIdFromNotes,
  examImageDocumentIdsFromNotes,
} from './exam-notes.js'

export interface DocumentLinkInfo {
  examId: string
  examType: string
  examDate: string
  source: string
  role: 'report' | 'slice'
  sliceIndex?: number
  sliceTotal?: number
}

/** Mapa documentId → exame de origem (importação de portal). */
export function buildDocumentLinkIndex(exams: Exam[]): Map<string, DocumentLinkInfo> {
  const map = new Map<string, DocumentLinkInfo>()
  for (const exam of exams) {
    const source = exam.source || 'manual'
    const sliceIds = examImageDocumentIdsFromNotes(exam.notes)
    const reportId = examDocumentIdFromNotes(exam.notes)
    if (reportId) {
      map.set(reportId, {
        examId: exam.id,
        examType: exam.examType,
        examDate: exam.examDate,
        source,
        role: 'report',
        sliceTotal: sliceIds.length > 0 ? sliceIds.length : undefined,
      })
    }
    sliceIds.forEach((id, i) => {
      map.set(id, {
        examId: exam.id,
        examType: exam.examType,
        examDate: exam.examDate,
        source,
        role: 'slice',
        sliceIndex: i + 1,
        sliceTotal: sliceIds.length,
      })
    })
  }
  return map
}

export interface PortalExamGroup {
  examId: string
  examType: string
  examDate: string
  source: string
  report?: { documentId: string; doc: import('./api.types.js').Document_ }
  slices: Array<{ documentId: string; doc: import('./api.types.js').Document_ }>
}

export function groupPortalDocuments(
  docs: import('./api.types.js').Document_[],
  linkIndex: Map<string, DocumentLinkInfo>,
): PortalExamGroup[] {
  const byExam = new Map<string, PortalExamGroup>()
  for (const doc of docs) {
    const link = linkIndex.get(doc.id)
    if (!link) continue
    let group = byExam.get(link.examId)
    if (!group) {
      group = {
        examId: link.examId,
        examType: link.examType,
        examDate: link.examDate,
        source: link.source,
        slices: [],
      }
      byExam.set(link.examId, group)
    }
    if (link.role === 'report') {
      group.report = { documentId: doc.id, doc }
    } else {
      group.slices.push({ documentId: doc.id, doc })
    }
  }
  return [...byExam.values()].sort(
    (a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime(),
  )
}
