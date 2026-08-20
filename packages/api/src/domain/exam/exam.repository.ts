import type { Exam } from './exam.entity.js'

export type ExamFilter = { patientId?: string | string[] }

export interface ExamRepository {
  findById(id: string): Promise<Exam | null>
  findAll(filter?: ExamFilter): Promise<Exam[]>
  save(exam: Exam): Promise<Exam>
  update(exam: Exam): Promise<Exam>
  delete(id: string): Promise<void>
}
