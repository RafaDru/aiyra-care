import type { FastifyReply } from 'fastify'
import type { GrowthRecordService } from '../../../application/growth-record/growth-record.service.js'
import { createGrowthRecordSchema, updateGrowthRecordSchema, growthRecordParamsSchema, growthRecordQuerySchema } from './growth-record.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class GrowthRecordController {
  constructor(private readonly service: GrowthRecordService) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createGrowthRecordSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const record = await this.service.create(parsed.data)
    return reply.status(201).send(record.toJSON())
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = growthRecordParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const record = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, record)) return
      return reply.send(record.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = growthRecordQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const records = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, records, (r) => r.patientId).map((r) => r.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = growthRecordParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateGrowthRecordSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const record = await this.service.update(params.data.id, body.data)
      return reply.send(record.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = growthRecordParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }
}
