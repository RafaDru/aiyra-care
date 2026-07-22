import type { FastifyRequest, FastifyReply } from 'fastify'
import type { MedicationService } from '../../../application/medication/medication.service.js'
import { createMedicationSchema, updateMedicationSchema, medicationParamsSchema, medicationQuerySchema } from './medication.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class MedicationController {
  constructor(private readonly service: MedicationService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createMedicationSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const medication = await this.service.create(parsed.data)
    return reply.status(201).send(medication.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = medicationParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const medication = await this.service.findById(parsed.data.id)
      return reply.send(medication.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = medicationQuerySchema.safeParse(req.query)
    const medications = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(medications.map(m => m.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = medicationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateMedicationSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const medication = await this.service.update(params.data.id, body.data)
      return reply.send(medication.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = medicationParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { await this.service.delete(parsed.data.id); return reply.status(204).send() }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
