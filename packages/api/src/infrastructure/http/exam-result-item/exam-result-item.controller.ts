import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ExamResultItemService } from '../../../application/exam-result-item/exam-result-item.service.js'

export class ExamResultItemController {
  constructor(private readonly service: ExamResultItemService) {}

  async listByPatient(req: FastifyRequest, reply: FastifyReply) {
    const { patientId, markerName } = req.query as { patientId: string; markerName?: string }
    const items = await this.service.listByPatient(patientId, markerName)
    return reply.send(items.map((i) => i.toJSON()))
  }

  async getMarkerTrends(req: FastifyRequest, reply: FastifyReply) {
    const { patientId } = req.params as { patientId: string }
    const trends = await this.service.getMarkerTrends(patientId)
    return reply.send(trends)
  }

  async listByExam(req: FastifyRequest, reply: FastifyReply) {
    const { examId } = req.params as { examId: string }
    const items = await this.service.listByExam(examId)
    return reply.send(items.map((i) => i.toJSON()))
  }

  async createBatch(req: FastifyRequest, reply: FastifyReply) {
    const body = req.body as { items: Parameters<ExamResultItemService['createBatch']>[0] }
    const created = await this.service.createBatch(body.items)
    return reply.status(201).send(created.map((i) => i.toJSON()))
  }
}
