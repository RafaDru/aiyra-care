import type { FastifyReply } from 'fastify'
import type { CareCircleService } from '../../../application/care-circle/care-circle.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  addCircleMemberSchema,
  careCircleParamsSchema,
  circleMemberParamsSchema,
  createCareCircleSchema,
  linkPatientSchema,
  patientLinkParamsSchema,
  updateCareCircleSchema,
} from './care-circle.schema.js'
import type { CareCircleData, CareCircleDetail, CareCircleListItem } from '../../../domain/care-circle/care-circle.types.js'

function mapError(err: unknown, reply: FastifyReply) {
  const code = err instanceof Error ? err.message : ''
  const table: Record<string, [number, string]> = {
    CARE_CIRCLE_NOT_FOUND: [404, 'Família não encontrada'],
    CARE_CIRCLE_FORBIDDEN: [403, 'Sem permissão nesta família'],
    CARE_CIRCLE_MEMBER_NOT_FOUND: [404, 'Membro não encontrado'],
    CARE_CIRCLE_ADMIN_LIMIT: [409, 'Limite de administradores atingido (máx. 2)'],
    CARE_CIRCLE_CANNOT_REMOVE_OWNER: [409, 'Não é possível remover o titular'],
    CARE_CIRCLE_INVALID_ROLE: [400, 'Papel inválido'],
    CARE_CIRCLE_PATIENT_NOT_FOUND: [404, 'Perfil não encontrado no círculo'],
    CARE_CIRCLE_PATIENT_NOT_OWNED: [403, 'Perfil não pertence ao titular desta família'],
    CARE_CIRCLE_NAME_REQUIRED: [400, 'Informe um nome'],
  }
  const hit = table[code]
  if (hit) return reply.status(hit[0]).send({ message: hit[1] })
  throw err
}

function serializeCircle(c: CareCircleData, memberRole?: string) {
  return {
    id: c.id,
    name: c.name,
    billingOwnerAccountId: c.billingOwnerAccountId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    ...(memberRole ? { memberRole } : {}),
  }
}

function serializeDetail(d: CareCircleDetail) {
  return {
    ...serializeCircle(d.circle),
    memberRole: d.memberRole,
    members: d.members.map((m) => ({
      id: m.id,
      accountId: m.accountId,
      role: m.role,
      email: m.email ?? null,
      displayName: m.displayName ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
    patients: d.patients.map((p) => ({
      patientId: p.patientId,
      patientName: p.patientName,
      linkKind: p.linkKind ?? 'primary',
    })),
  }
}

export class CareCircleController {
  constructor(private readonly service: CareCircleService) {}

  async list(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const rows = await this.service.listForAccount(req.accountId)
    return reply.send(rows.map((c: CareCircleListItem) => serializeCircle(c, c.memberRole)))
  }

  async dashboard(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const groups = await this.service.dashboardGroups(req.accountId)
    return reply.send(groups)
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const body = createCareCircleSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const circle = await this.service.create(req.accountId, body.data.name)
      return reply.status(201).send(serializeCircle(circle))
    } catch (err) {
      return mapError(err, reply)
    }
  }

  async get(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = careCircleParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const detail = await this.service.getDetail(params.data.id, req.accountId)
      return reply.send(serializeDetail(detail))
    } catch (err) {
      return mapError(err, reply)
    }
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = careCircleParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateCareCircleSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const updated = await this.service.updateName(params.data.id, req.accountId, body.data.name)
      return reply.send(serializeCircle(updated))
    } catch (err) {
      return mapError(err, reply)
    }
  }

  async listMembers(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = careCircleParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const members = await this.service.listMembers(params.data.id, req.accountId)
      return reply.send(members)
    } catch (err) {
      return mapError(err, reply)
    }
  }

  async addMember(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = careCircleParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = addCircleMemberSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const member = await this.service.addMember(
        params.data.id,
        req.accountId,
        body.data.accountId,
        body.data.role,
      )
      return reply.status(201).send(member)
    } catch (err) {
      return mapError(err, reply)
    }
  }

  async removeMember(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = circleMemberParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      await this.service.removeMember(params.data.id, req.accountId, params.data.memberId)
      return reply.status(204).send()
    } catch (err) {
      return mapError(err, reply)
    }
  }

  async linkPatient(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = careCircleParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = linkPatientSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      await this.service.linkPatient(params.data.id, req.accountId, body.data.patientId)
      return reply.status(204).send()
    } catch (err) {
      return mapError(err, reply)
    }
  }

  async unlinkPatient(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = patientLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      await this.service.unlinkPatient(params.data.id, req.accountId, params.data.patientId)
      return reply.status(204).send()
    } catch (err) {
      return mapError(err, reply)
    }
  }

  async listLinkablePatients(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = careCircleParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const rows = await this.service.listLinkablePatients(params.data.id, req.accountId)
      return reply.send(rows)
    } catch (err) {
      return mapError(err, reply)
    }
  }
}
