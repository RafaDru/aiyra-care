import type { FastifyRequest, FastifyReply } from 'fastify'
import type { DiagnosisService } from '../../../application/diagnosis/diagnosis.service.js'
import { createDiagnosisSchema, updateDiagnosisSchema, diagnosisParamsSchema, diagnosisQuerySchema } from './diagnosis.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class DiagnosisController {
  constructor(private readonly service: DiagnosisService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createDiagnosisSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const diag = await this.service.create(parsed.data)
    return reply.status(201).send(diag.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = diagnosisParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { const d = await this.service.findById(parsed.data.id); return reply.send(d.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = diagnosisQuerySchema.safeParse(req.query)
    const items = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(items.map(i => i.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = diagnosisParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateDiagnosisSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try { const d = await this.service.update(params.data.id, body.data); return reply.send(d.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = diagnosisParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { await this.service.delete(parsed.data.id); return reply.status(204).send() }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
