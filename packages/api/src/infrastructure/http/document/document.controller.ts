import type { FastifyRequest, FastifyReply } from 'fastify'
import type { DocumentService } from '../../../application/document/document.service.js'
import { createDocumentSchema, updateDocumentSchema, documentParamsSchema, documentQuerySchema } from './document.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createDocumentSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const doc = await this.service.create(parsed.data)
    return reply.status(201).send(doc.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { const d = await this.service.findById(parsed.data.id); return reply.send(d.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = documentQuerySchema.safeParse(req.query)
    const items = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(items.map(i => i.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = documentParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateDocumentSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try { const d = await this.service.update(params.data.id, body.data); return reply.send(d.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { await this.service.delete(parsed.data.id); return reply.status(204).send() }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
