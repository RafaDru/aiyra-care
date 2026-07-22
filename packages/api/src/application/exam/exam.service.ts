import { Exam, type ExamProps } from '../../domain/exam/exam.entity.js'
import type { ExamRepository, ExamFilter } from '../../domain/exam/exam.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class ExamService {
  constructor(private readonly repo: ExamRepository) {}

  async create(data: ExamProps) {
    const exam = Exam.create(data)
    return this.repo.save(exam)
  }

  async findById(id: string) {
    const exam = await this.repo.findById(id)
    if (!exam) throw new NotFoundError('Exam', id)
    return exam
  }

  async findAll(filter?: ExamFilter) { return this.repo.findAll(filter) }

  async update(id: string, data: Partial<ExamProps>) {
    const existing = await this.findById(id)
    const updated = Exam.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
