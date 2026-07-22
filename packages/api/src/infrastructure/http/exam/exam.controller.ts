import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ExamService } from '../../../application/exam/exam.service.js'
import { createExamSchema, updateExamSchema, examParamsSchema, examQuerySchema } from './exam.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class ExamController {
  constructor(private readonly service: ExamService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createExamSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const exam = await this.service.create(parsed.data)
    return reply.status(201).send(exam.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = examParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { const e = await this.service.findById(parsed.data.id); return reply.send(e.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = examQuerySchema.safeParse(req.query)
    const items = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(items.map(i => i.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = examParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateExamSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try { const e = await this.service.update(params.data.id, body.data); return reply.send(e.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = examParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { await this.service.delete(parsed.data.id); return reply.status(204).send() }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
