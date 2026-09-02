import type { FastifyReply } from 'fastify'
import type { ExamResultItemService } from '../../../application/exam-result-item/exam-result-item.service.js'
import type { ExamService } from '../../../application/exam/exam.service.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import {
  createExamResultItemBatchSchema,
  examMarkersParamsSchema,
  patientMarkersParamsSchema,
  patientMarkersQuerySchema,
} from './exam-result-item.schema.js'

export class ExamResultItemController {
  constructor(
    private readonly service: ExamResultItemService,
    private readonly exams: ExamService,
  ) {}

  async listByPatient(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientMarkersQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const items = await this.service.listByPatient(parsed.data.patientId, parsed.data.markerName)
    return reply.send(items.map((i) => i.toJSON()))
  }

  async getMarkerTrends(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientMarkersParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const trends = await this.service.getMarkerTrends(parsed.data.patientId)
    return reply.send(trends)
  }

  async listByExam(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = examMarkersParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const exam = await this.exams.findById(parsed.data.examId)
      if (!assertPatientAccess(req, reply, exam.patientId)) return
      const items = await this.service.listByExam(parsed.data.examId)
      return reply.send(items.map((i) => i.toJSON()))
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async createBatch(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createExamResultItemBatchSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const patientIds = [...new Set(parsed.data.items.map((item) => item.patientId))]
    for (const patientId of patientIds) {
      if (!assertPatientAccess(req, reply, patientId)) return
    }

    for (const item of parsed.data.items) {
      try {
        const exam = await this.exams.findById(item.examId)
        if (exam.patientId !== item.patientId) {
          return reply.status(400).send({ message: 'examId não pertence ao paciente informado' })
        }
      } catch (err) {
        if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
        throw err
      }
    }

    const created = await this.service.createBatch(parsed.data.items)
    return reply.status(201).send(created.map((i) => i.toJSON()))
  }
}
