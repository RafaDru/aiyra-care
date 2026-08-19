import type { Exam } from '../../domain/exam/exam.entity.js'
import { examDocumentIdFromNotes } from '../../domain/exam/exam-notes.js'
import type { DocumentRepository } from '../../domain/document/document.repository.js'
import type { ExamOrderRepository } from '../../domain/exam-order/exam-order.repository.js'

export type ExamOcrCorpusContext = {
  documentTextById: Map<string, string>
  orderTextByOrderId: Map<string, string>
}

/**
 * Monta o corpus de texto para parsing de medidas: campos do exame + OCR do laudo
 * (documento do exame ou PDF consolidado do pedido).
 */
export function buildExamOcrCorpus(
  exam: Exam,
  ctx: ExamOcrCorpusContext,
): string {
  const parts: string[] = [
    exam.examType,
    exam.laboratory ?? '',
    exam.resultSummary ?? '',
  ]

  const docId = examDocumentIdFromNotes(exam.notes)
  if (docId) {
    const docText = ctx.documentTextById.get(docId)
    if (docText) parts.push(docText)
  }

  if (exam.examOrderId) {
    const orderText = ctx.orderTextByOrderId.get(exam.examOrderId)
    if (orderText) parts.push(orderText)
  }

  return parts.filter((p) => p.trim().length > 0).join('\n')
}

export async function buildExamOcrCorpusContext(
  exams: Exam[],
  documents: DocumentRepository,
  examOrders: ExamOrderRepository,
): Promise<ExamOcrCorpusContext> {
  const documentIds = new Set<string>()
  const orderIds = new Set<string>()

  for (const exam of exams) {
    const docId = examDocumentIdFromNotes(exam.notes)
    if (docId) documentIds.add(docId)
    if (exam.examOrderId) orderIds.add(exam.examOrderId)
  }

  const orders = []
  for (const orderId of orderIds) {
    const order = await examOrders.findById(orderId)
    if (order?.documentId) documentIds.add(order.documentId)
    if (order) orders.push(order)
  }

  const documentTextById = new Map<string, string>()
  for (const id of documentIds) {
    const doc = await documents.findById(id)
    const text = doc?.extractedText?.trim()
    if (text) documentTextById.set(id, text)
  }

  const orderTextByOrderId = new Map<string, string>()
  for (const order of orders) {
    if (!order.documentId) continue
    const text = documentTextById.get(order.documentId)
    if (text) orderTextByOrderId.set(order.id, text)
  }

  return { documentTextById, orderTextByOrderId }
}
