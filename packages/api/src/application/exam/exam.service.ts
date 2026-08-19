import { Exam, type ExamProps } from '../../domain/exam/exam.entity.js'
import type { ExamRepository, ExamFilter } from '../../domain/exam/exam.repository.js'
import { detectExamDuplicatePair } from '../../domain/hygiene/exam-duplicate-detector.js'
import { isExamHygieneDuplicate } from '../../domain/hygiene/exam-canonical.js'
import { NotFoundError } from '../../domain/errors.js'
import type { FileStorage } from '../../domain/document/file-storage.js'

const IMPORT_SKIP_SCORE = 88

export class ExamService {
  constructor(
    private readonly repo: ExamRepository,
    private readonly storage?: FileStorage,
  ) {}

  async create(data: ExamProps) {
    const existing = await this.repo.findAll({ patientId: data.patientId })
    const draft = Exam.create(data)
    for (const ex of existing) {
      if (isExamHygieneDuplicate(ex)) continue
      const hit = detectExamDuplicatePair(draft, ex)
      if (hit && hit.score >= IMPORT_SKIP_SCORE) return ex
    }
    return this.repo.save(draft)
  }

  async findById(id: string) {
    const exam = await this.repo.findById(id)
    if (!exam) throw new NotFoundError('Exam', id)
    return exam
  }

  async findAll(filter?: ExamFilter) {
    const rows = await this.repo.findAll(filter)
    return rows.filter((e) => !isExamHygieneDuplicate(e))
  }

  async update(id: string, data: Partial<ExamProps>) {
    const existing = await this.findById(id)
    const updated = Exam.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }

  async readResultFile(storagePath: string) {
    if (!this.storage) throw new Error('FileStorage não configurado')
    return this.storage.read(storagePath)
  }
}
