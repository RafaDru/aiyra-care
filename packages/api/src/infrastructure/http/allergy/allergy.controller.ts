import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AllergyService } from '../../../application/allergy/allergy.service.js'
import { createAllergySchema, updateAllergySchema, allergyParamsSchema, allergyQuerySchema } from './allergy.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class AllergyController {
  constructor(private readonly service: AllergyService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createAllergySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const allergy = await this.service.create(parsed.data)
    return reply.status(201).send(allergy.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = allergyParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { const a = await this.service.findById(parsed.data.id); return reply.send(a.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = allergyQuerySchema.safeParse(req.query)
    const items = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(items.map(i => i.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = allergyParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateAllergySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try { const a = await this.service.update(params.data.id, body.data); return reply.send(a.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = allergyParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { await this.service.delete(parsed.data.id); return reply.status(204).send() }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
