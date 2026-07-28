import type { Pool } from 'pg'
import type { ExamRepository, ExamFilter } from '../../domain/exam/exam.repository.js'
import { Exam } from '../../domain/exam/exam.entity.js'
import type { ExamData } from '../../domain/exam/exam.entity.js'

const COLUMNS = 'id, patient_id, medical_record_id, exam_type, exam_date, result_summary, result_file_url, laboratory, notes, source, created_at'

function rowToEntity(row: Record<string, unknown>): Exam {
  return Exam.restore({
    id: row.id as string, patientId: row.patient_id as string, medicalRecordId: row.medical_record_id as string | null,
    examType: row.exam_type as string, examDate: row.exam_date as Date,
    resultSummary: row.result_summary as string | null, resultFileUrl: row.result_file_url as string | null,
    laboratory: row.laboratory as string | null, notes: row.notes as string | null,
    source: row.source as string, createdAt: row.created_at as Date,
  })
}

export class ExamPgRepository implements ExamRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM exams WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: ExamFilter) {
    const conditions: string[] = []; const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + (params.push(filter.patientId)))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM exams ${where} ORDER BY exam_date DESC`, params)
    return rows.map(rowToEntity)
  }

  async save(exam: Exam) {
    const { rows } = await this.pool.query(
      `INSERT INTO exams (id, patient_id, medical_record_id, exam_type, exam_date, result_summary, result_file_url, laboratory, notes, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${COLUMNS}`,
      [exam.id, exam.patientId, exam.medicalRecordId, exam.examType, exam.examDate, exam.resultSummary, exam.resultFileUrl, exam.laboratory, exam.notes, exam.source]
    )
    return rowToEntity(rows[0])
  }

  async update(exam: Exam) {
    const { rows } = await this.pool.query(
      `UPDATE exams SET exam_type=$1, exam_date=$2, result_summary=$3, result_file_url=$4, laboratory=$5, notes=$6 WHERE id=$7 RETURNING ${COLUMNS}`,
      [exam.examType, exam.examDate, exam.resultSummary, exam.resultFileUrl, exam.laboratory, exam.notes, exam.id]
    )
    if (!rows.length) throw new Error('Exam ' + exam.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM exams WHERE id = $1', [id]) }
}
