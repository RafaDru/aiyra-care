import type { ExamOrder } from './exam-order.entity.js'

export type ExamOrderFilter = { patientId?: string }

export interface ExamOrderRepository {
  findById(id: string): Promise<ExamOrder | null>
  findByPatientAndExternalKey(patientId: string, externalKey: string): Promise<ExamOrder | null>
  findAll(filter?: ExamOrderFilter): Promise<ExamOrder[]>
  save(order: ExamOrder): Promise<ExamOrder>
  update(order: ExamOrder): Promise<ExamOrder>
}
