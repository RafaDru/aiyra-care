import type { FastifyReply } from 'fastify'
import type { DiagnosisService } from '../../../application/diagnosis/diagnosis.service.js'
import { createDiagnosisSchema, updateDiagnosisSchema, diagnosisParamsSchema, diagnosisQuerySchema } from './diagnosis.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class DiagnosisController {
  constructor(private readonly service: DiagnosisService) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createDiagnosisSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const diag = await this.service.create(parsed.data)
    return reply.status(201).send(diag.toJSON())
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = diagnosisParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const d = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, d)) return
      return reply.send(d.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = diagnosisQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const items = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, items, (i) => i.patientId).map((i) => i.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = diagnosisParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateDiagnosisSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const d = await this.service.update(params.data.id, body.data)
      return reply.send(d.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = diagnosisParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
