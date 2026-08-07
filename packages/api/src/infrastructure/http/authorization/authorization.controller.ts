import type { FastifyReply } from 'fastify'
import type { AuthorizationRepository } from '../../../domain/authorization/authorization.repository.js'
import { Authorization } from '../../../domain/authorization/authorization.entity.js'
import { createAuthorizationSchema, updateAuthorizationSchema, authorizationParamsSchema, authorizationQuerySchema } from './authorization.schema.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class AuthorizationController {
  constructor(private readonly repo: AuthorizationRepository) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createAuthorizationSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const auth = Authorization.create(parsed.data)
    const saved = await this.repo.save(auth)
    return reply.status(201).send(saved.toJSON())
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = authorizationQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const items = await this.repo.findAll(filter)
    return reply.send(filterByPatientAccess(req, items, (v) => v.patientId).map((v) => v.toJSON()))
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = authorizationParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const item = await this.repo.findById(parsed.data.id)
    if (!guardPatientEntity(req, reply, item, 'Authorization not found')) return
    return reply.send(item!.toJSON())
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = authorizationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateAuthorizationSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const existing = await this.repo.findById(params.data.id)
    if (!guardPatientEntity(req, reply, existing, 'Authorization not found')) return
    const data = existing!.toJSON()
    const updated = Authorization.restore({ ...data, ...body.data, createdAt: data.createdAt })
    const saved = await this.repo.update(updated)
    return reply.send(saved.toJSON())
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = authorizationParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const existing = await this.repo.findById(parsed.data.id)
    if (!guardPatientEntity(req, reply, existing, 'Authorization not found')) return
    await this.repo.delete(parsed.data.id)
    return reply.status(204).send()
  }
}
