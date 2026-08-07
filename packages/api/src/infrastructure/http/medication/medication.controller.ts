import type { FastifyReply } from 'fastify'
import type { MedicationService } from '../../../application/medication/medication.service.js'
import { createMedicationSchema, updateMedicationSchema, medicationParamsSchema, medicationQuerySchema } from './medication.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class MedicationController {
  constructor(private readonly service: MedicationService) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createMedicationSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const medication = await this.service.create(parsed.data)
    return reply.status(201).send(medication.toJSON())
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = medicationParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const medication = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, medication)) return
      return reply.send(medication.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = medicationQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const medications = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, medications, (m) => m.patientId).map((m) => m.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = medicationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateMedicationSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const medication = await this.service.update(params.data.id, body.data)
      return reply.send(medication.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = medicationParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
