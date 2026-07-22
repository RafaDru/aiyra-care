import type { FastifyRequest, FastifyReply } from 'fastify'
import type { MedicalRecordService } from '../../../application/medical-record/medical-record.service.js'
import { createMedicalRecordSchema, updateMedicalRecordSchema, medicalRecordParamsSchema, medicalRecordQuerySchema } from './medical-record.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class MedicalRecordController {
  constructor(private readonly service: MedicalRecordService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createMedicalRecordSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const record = await this.service.create(parsed.data)
    return reply.status(201).send(record.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = medicalRecordParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { const r = await this.service.findById(parsed.data.id); return reply.send(r.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = medicalRecordQuerySchema.safeParse(req.query)
    const items = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(items.map(i => i.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = medicalRecordParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateMedicalRecordSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try { const r = await this.service.update(params.data.id, body.data); return reply.send(r.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = medicalRecordParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { await this.service.delete(parsed.data.id); return reply.status(204).send() }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
