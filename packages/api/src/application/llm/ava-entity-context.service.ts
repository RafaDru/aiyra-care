import type { AuthorizationRepository } from '../../domain/authorization/authorization.repository.js'
import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { ExamOrderRepository } from '../../domain/exam-order/exam-order.repository.js'
import type { ExamResultItemRepository } from '../../domain/exam-result-item/exam-result-item.repository.js'
import type { MedicalRecordRepository } from '../../domain/medical-record/medical-record.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export type AvaEntityPin =
  | { entityType: 'exam'; entityId: string }
  | { entityType: 'exam_order'; entityId: string }
  | { entityType: 'exam_result_item'; entityId: string }
  | { entityType: 'exam_marker'; markerName: string }
  | { entityType: 'authorization'; entityId: string }
  | { entityType: 'medical_record'; entityId: string }

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const iso = d instanceof Date ? d.toISOString() : String(d)
  return iso.slice(0, 10)
}

export class AvaEntityContextService {
  constructor(
    private readonly exams: ExamRepository,
    private readonly examOrders: ExamOrderRepository,
    private readonly examResultItems: ExamResultItemRepository,
    private readonly authorizations?: AuthorizationRepository,
    private readonly medicalRecords?: MedicalRecordRepository,
  ) {}

  async buildPinBlock(patientId: string, pin: AvaEntityPin): Promise<string> {
    switch (pin.entityType) {
      case 'exam':
        return this.formatExamPin(patientId, pin.entityId)
      case 'exam_order':
        return this.formatExamOrderPin(patientId, pin.entityId)
      case 'exam_result_item':
        return this.formatResultItemPin(patientId, pin.entityId)
      case 'exam_marker':
        return this.formatMarkerPin(patientId, pin.markerName)
      case 'authorization':
        return this.formatAuthorizationPin(patientId, pin.entityId)
      case 'medical_record':
        return this.formatMedicalRecordPin(patientId, pin.entityId)
      default:
        return ''
    }
  }

  private async formatExamPin(patientId: string, examId: string): Promise<string> {
    const exam = await this.exams.findById(examId)
    if (!exam || exam.patientId !== patientId) {
      throw new NotFoundError('Exame', examId)
    }
    const lines = [
      `Tipo: exame`,
      `ID: ${exam.id}`,
      `Nome/tipo: ${exam.examType}`,
      `Data: ${formatDate(exam.examDate)}`,
      `Laboratório: ${exam.laboratory ?? '—'}`,
      `Fonte: ${exam.source ?? '—'}`,
      `Resumo/resultado: ${exam.resultSummary?.trim() || '—'}`,
    ]
    if (exam.notes?.trim()) lines.push(`Notas: ${exam.notes.trim().slice(0, 400)}`)
    return lines.join('\n')
  }

  private async formatExamOrderPin(patientId: string, orderId: string): Promise<string> {
    const order = await this.examOrders.findById(orderId)
    if (!order || order.patientId !== patientId) {
      throw new NotFoundError('Pedido de exame', orderId)
    }
    return [
      `Tipo: pedido de exame`,
      `ID: ${order.id}`,
      `Data pedido: ${formatDate(order.orderDate)}`,
      `Laboratório: ${order.laboratory ?? '—'}`,
      `Fonte: ${order.source ?? '—'}`,
      order.portalOrderId ? `ID portal: ${order.portalOrderId}` : '',
    ].filter(Boolean).join('\n')
  }

  private async formatResultItemPin(patientId: string, itemId: string): Promise<string> {
    const item = await this.examResultItems.findById(itemId)
    if (!item || item.patientId !== patientId) {
      throw new NotFoundError('Marcador', itemId)
    }
    return [
      `Tipo: marcador laboratorial`,
      `ID: ${item.id}`,
      `Analito: ${item.markerName}`,
      item.technicalName ? `Nome técnico: ${item.technicalName}` : '',
      `Valor: ${item.displayValue}${item.unit ? ' ' + item.unit : ''}`,
      `Referência: ${item.referenceRange ?? '—'}`,
      `Status: ${item.status}`,
      `Coleta: ${formatDate(item.collectedAt)}`,
      item.sourceDocumentId ? `Documento origem: ${item.sourceDocumentId}` : '',
      `Exame vinculado: ${item.examId}`,
    ].filter(Boolean).join('\n')
  }

  private async formatAuthorizationPin(patientId: string, authId: string): Promise<string> {
    if (!this.authorizations) return ''
    const auth = await this.authorizations.findById(authId)
    if (!auth || auth.patientId !== patientId) {
      throw new NotFoundError('Autorização', authId)
    }
    const title =
      auth.classification?.trim() ||
      auth.procedureDescription?.trim() ||
      auth.solicitationNumber?.trim() ||
      auth.guideNumber?.trim() ||
      '—'
    return [
      'Tipo: autorização de convênio',
      `ID: ${auth.id}`,
      `Título/resumo: ${title}`,
      auth.status ? `Status: ${auth.status}` : '',
      `Data autorização: ${formatDate(auth.authorizationDate)}`,
      auth.validityDate ? `Validade: ${formatDate(auth.validityDate)}` : '',
      auth.doctorName ? `Profissional: ${auth.doctorName}` : '',
      auth.specialty ? `Especialidade: ${auth.specialty}` : '',
      auth.guideNumber ? `Guia: ${auth.guideNumber}` : '',
      auth.source ? `Fonte: ${auth.source}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  private async formatMedicalRecordPin(patientId: string, recordId: string): Promise<string> {
    if (!this.medicalRecords) return ''
    const record = await this.medicalRecords.findById(recordId)
    if (!record || record.patientId !== patientId) {
      throw new NotFoundError('Atendimento', recordId)
    }
    return [
      'Tipo: atendimento / prontuário',
      `ID: ${record.id}`,
      `Tipo registro: ${record.recordType}`,
      `Data: ${formatDate(record.recordDate)}`,
      record.description?.trim() ? `Descrição: ${record.description.trim().slice(0, 400)}` : '',
      record.doctorName ? `Profissional: ${record.doctorName}` : '',
      record.specialty ? `Especialidade: ${record.specialty}` : '',
      record.clinicName ? `Local: ${record.clinicName}` : '',
      record.source ? `Fonte: ${record.source}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  private async formatMarkerPin(patientId: string, markerName: string): Promise<string> {
    const items = await this.examResultItems.findAll({ patientId, markerName })
    if (!items.length) {
      return `Tipo: marcador laboratorial (série)\nAnalito: ${markerName}\nSem registros no prontuário.`
    }
    const sorted = [...items].sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime())
    const latest = sorted[0]!
    const history = sorted.slice(0, 4).map((it) =>
      `${formatDate(it.collectedAt)}: ${it.displayValue}${it.unit ? ' ' + it.unit : ''} (${it.status})`,
    )
    return [
      `Tipo: marcador laboratorial (série)`,
      `Analito: ${markerName}`,
      latest.technicalName ? `Nome técnico: ${latest.technicalName}` : '',
      `Último valor: ${latest.displayValue}${latest.unit ? ' ' + latest.unit : ''}`,
      `Referência: ${latest.referenceRange ?? '—'}`,
      `Status atual: ${latest.status}`,
      `Histórico recente:\n${history.join('\n')}`,
    ].filter(Boolean).join('\n')
  }
}
