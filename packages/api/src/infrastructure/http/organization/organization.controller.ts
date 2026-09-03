import type { FastifyReply } from 'fastify'
import type { OrganizationService } from '../../../application/organization/organization.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  addMemberSchema,
  createOrganizationSchema,
  memberParamsSchema,
  organizationParamsSchema,
  updateMemberSchema,
  updateOrganizationSchema,
} from './organization.schema.js'

function mapOrgError(err: unknown, reply: FastifyReply) {
  const code = err instanceof Error ? err.message : ''
  if (code === 'ORGANIZATION_NOT_FOUND') return reply.status(404).send({ message: 'Organização não encontrada' })
  if (code === 'ORGANIZATION_FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão nesta organização' })
  if (code === 'ORGANIZATION_MEMBER_NOT_FOUND') return reply.status(404).send({ message: 'Membro não encontrado' })
  if (code === 'ORGANIZATION_LAST_ADMIN') return reply.status(409).send({ message: 'Não é possível remover o último administrador' })
  throw err
}

function serializeOrg(org: { id: string; name: string; kind: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: org.id,
    name: org.name,
    kind: org.kind,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  }
}

function serializeMember(m: { id: string; organizationId: string; accountId: string; role: string; createdAt: Date }) {
  return {
    id: m.id,
    organizationId: m.organizationId,
    accountId: m.accountId,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  }
}

export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  async list(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const rows = await this.service.listForAccount(req.accountId)
    return reply.send(rows.map(serializeOrg))
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = createOrganizationSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const org = await this.service.create(req.accountId, parsed.data.name, parsed.data.kind)
    return reply.status(201).send(serializeOrg(org))
  }

  async get(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = organizationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const { org, member } = await this.service.getForMember(params.data.id, req.accountId)
      return reply.send({ ...serializeOrg(org), member: serializeMember(member) })
    } catch (err) {
      return mapOrgError(err, reply)
    }
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = organizationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateOrganizationSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const updated = await this.service.update(params.data.id, req.accountId, body.data)
      return reply.send(serializeOrg(updated))
    } catch (err) {
      return mapOrgError(err, reply)
    }
  }

  async remove(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = organizationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      await this.service.delete(params.data.id, req.accountId)
      return reply.status(204).send()
    } catch (err) {
      return mapOrgError(err, reply)
    }
  }

  async listMembers(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = organizationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const members = await this.service.listMembers(params.data.id, req.accountId)
      return reply.send(members.map(serializeMember))
    } catch (err) {
      return mapOrgError(err, reply)
    }
  }

  async addMember(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = organizationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = addMemberSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const member = await this.service.addMember(
        params.data.id,
        req.accountId,
        body.data.accountId,
        body.data.role,
      )
      return reply.status(201).send(serializeMember(member))
    } catch (err) {
      return mapOrgError(err, reply)
    }
  }

  async updateMember(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = memberParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateMemberSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const member = await this.service.updateMemberRole(
        params.data.id,
        req.accountId,
        params.data.memberId,
        body.data.role,
      )
      return reply.send(serializeMember(member))
    } catch (err) {
      return mapOrgError(err, reply)
    }
  }

  async removeMember(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = memberParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      await this.service.removeMember(params.data.id, req.accountId, params.data.memberId)
      return reply.status(204).send()
    } catch (err) {
      return mapOrgError(err, reply)
    }
  }
}
