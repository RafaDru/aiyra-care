import type { FastifyRequest, FastifyReply } from 'fastify'
import type { VaccineService } from '../../../application/vaccine/vaccine.service.js'
import { createVaccineSchema, updateVaccineSchema, vaccineParamsSchema, vaccineQuerySchema } from './vaccine.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class VaccineController {
  constructor(private readonly service: VaccineService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createVaccineSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const vaccine = await this.service.create(parsed.data)
    return reply.status(201).send(vaccine.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = vaccineParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const vaccine = await this.service.findById(parsed.data.id)
      return reply.send(vaccine.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = vaccineQuerySchema.safeParse(req.query)
    const vaccines = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(vaccines.map(v => v.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = vaccineParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateVaccineSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const vaccine = await this.service.update(params.data.id, body.data)
      return reply.send(vaccine.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = vaccineParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { await this.service.delete(parsed.data.id); return reply.status(204).send() }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
