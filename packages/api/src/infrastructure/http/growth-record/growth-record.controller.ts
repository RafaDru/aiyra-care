import type { FastifyRequest, FastifyReply } from 'fastify'
import type { GrowthRecordService } from '../../../application/growth-record/growth-record.service.js'
import { createGrowthRecordSchema, updateGrowthRecordSchema, growthRecordParamsSchema, growthRecordQuerySchema } from './growth-record.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class GrowthRecordController {
  constructor(private readonly service: GrowthRecordService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createGrowthRecordSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const record = await this.service.create(parsed.data)
    return reply.status(201).send(record.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = growthRecordParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const record = await this.service.findById(parsed.data.id)
      return reply.send(record.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = growthRecordQuerySchema.safeParse(req.query)
    const records = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(records.map(r => r.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = growthRecordParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateGrowthRecordSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const record = await this.service.update(params.data.id, body.data)
      return reply.send(record.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = growthRecordParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }
}
