import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthorizationRepository } from '../../../domain/authorization/authorization.repository.js'
import { Authorization } from '../../../domain/authorization/authorization.entity.js'
import { createAuthorizationSchema, updateAuthorizationSchema, authorizationParamsSchema, authorizationQuerySchema } from './authorization.schema.js'

export class AuthorizationController {
  constructor(private readonly repo: AuthorizationRepository) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createAuthorizationSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const auth = Authorization.create(parsed.data)
    const saved = await this.repo.save(auth)
    return reply.status(201).send(saved.toJSON())
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = authorizationQuerySchema.safeParse(req.query)
    const items = await this.repo.findAll(query.success ? query.data : undefined)
    return reply.send(items.map(v => v.toJSON()))
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = authorizationParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const item = await this.repo.findById(parsed.data.id)
    if (!item) return reply.status(404).send({ message: 'Authorization not found' })
    return reply.send(item.toJSON())
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = authorizationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateAuthorizationSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const existing = await this.repo.findById(params.data.id)
    if (!existing) return reply.status(404).send({ message: 'Authorization not found' })
    const data = existing.toJSON()
    const updated = Authorization.restore({ ...data, ...body.data, createdAt: data.createdAt })
    const saved = await this.repo.update(updated)
    return reply.send(saved.toJSON())
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = authorizationParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const existing = await this.repo.findById(parsed.data.id)
    if (!existing) return reply.status(404).send({ message: 'Authorization not found' })
    await this.repo.delete(parsed.data.id)
    return reply.status(204).send()
  }
}
