import type { FastifyReply } from 'fastify'
import type { ExamService } from '../../../application/exam/exam.service.js'
import type { CarePlaceService } from '../../../application/care-place/care-place.service.js'
import { scheduleCanonicalEntityProjection } from '../../graph/canonical-entity-graph.js'
import { createExamSchema, updateExamSchema, examParamsSchema, examQuerySchema } from './exam.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class ExamController {
  constructor(
    private readonly service: ExamService,
    private readonly carePlaces?: CarePlaceService,
    private readonly hygieneDetector?: import('../../../application/hygiene/hygiene-detector.service.js').HygieneDetectorService,
  ) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createExamSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const exam = await this.service.create(parsed.data)
    await this.carePlaces?.recordUsage(parsed.data.laboratory)
    void this.hygieneDetector?.scanAfterExamUpsert(exam).catch(() => undefined)
    const json = exam.toJSON()
    scheduleCanonicalEntityProjection({
      patientId: json.patientId,
      entityType: 'exam',
      entityId: json.id,
      title: json.examType,
      date: json.examDate.toISOString(),
      source: json.source,
    })
    return reply.status(201).send(json)
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = examParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const e = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, e)) return
      return reply.send(e.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = examQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const items = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, items, (i) => i.patientId).map((i) => i.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = examParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateExamSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const e = await this.service.update(params.data.id, body.data)
      await this.carePlaces?.recordUsage(body.data.laboratory)
      return reply.send(e.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = examParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async downloadResultFile(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = examParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const exam = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, exam)) return
      const path = exam.resultFileUrl
      if (!path) return reply.status(404).send({ message: 'Exame sem arquivo de resultado' })
      const file = await this.service.readResultFile(path)
      const name = `${exam.examType.replace(/[^\w\s.-]/g, '_').slice(0, 60) || 'laudo'}.pdf`
      return reply
        .header('Content-Type', file.contentType ?? 'application/pdf')
        .header('Content-Disposition', `inline; filename="${name}"`)
        .send(file.buffer)
    } catch (err) {
      return err instanceof NotFoundError
        ? reply.status(404).send({ message: err.message })
        : reply.status(500).send({ message: err instanceof Error ? err.message : 'Erro ao baixar laudo' })
    }
  }
}
