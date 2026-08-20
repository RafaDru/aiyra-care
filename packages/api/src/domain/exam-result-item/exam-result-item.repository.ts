import type { ExamResultItem } from './exam-result-item.entity.js'

export interface ExamResultItemFilter {
  patientId?: string
  examId?: string
  markerName?: string
}

export interface ExamResultItemRepository {
  findById(id: string): Promise<ExamResultItem | null>
  findAll(filter?: ExamResultItemFilter): Promise<ExamResultItem[]>
  save(item: ExamResultItem): Promise<ExamResultItem>
  saveBatch(items: ExamResultItem[]): Promise<ExamResultItem[]>
  delete(id: string): Promise<void>
  deleteByExamId(examId: string): Promise<void>
}
