import type { FastifyReply } from 'fastify'
import type { AllergyService } from '../../../application/allergy/allergy.service.js'
import { createAllergySchema, updateAllergySchema, allergyParamsSchema, allergyQuerySchema } from './allergy.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class AllergyController {
  constructor(private readonly service: AllergyService) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createAllergySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const allergy = await this.service.create(parsed.data)
    return reply.status(201).send(allergy.toJSON())
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = allergyParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const a = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, a)) return
      return reply.send(a.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = allergyQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const items = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, items, (i) => i.patientId).map((i) => i.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = allergyParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateAllergySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const a = await this.service.update(params.data.id, body.data)
      return reply.send(a.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = allergyParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
