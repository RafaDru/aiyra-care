import type { FastifyReply } from 'fastify'
import type { PatientAccessService } from '../../../application/patient-access/patient-access.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import {
  createGrantSchema,
  grantParamsSchema,
  patientAccessParamsSchema,
} from './patient-access.schema.js'
import type { PatientAccessGrantData } from '../../../domain/patient-access/patient-access.types.js'

function mapGrantError(err: unknown, reply: FastifyReply) {
  const code = err instanceof Error ? err.message : ''
  if (code === 'PATIENT_ACCESS_FORBIDDEN') {
    return reply.status(403).send({ message: 'Sem permissão para gerenciar acesso a este perfil' })
  }
  if (code === 'PATIENT_ACCESS_GRANT_NOT_FOUND') {
    return reply.status(404).send({ message: 'Concessão de acesso não encontrada' })
  }
  if (code === 'PATIENT_ACCESS_ADMIN_LIMIT') {
    return reply.status(409).send({ message: 'Limite de cuidadores com acesso total atingido (máx. 2)' })
  }
  if (code === 'PATIENT_ACCESS_CANNOT_REVOKE_SELF' || code === 'PATIENT_ACCESS_CANNOT_REVOKE_OWNER') {
    return reply.status(409).send({ message: 'Não é possível revogar este acesso' })
  }
  if (code === 'PATIENT_ACCESS_SELF_GRANT' || code === 'PATIENT_ACCESS_INVALID_ROLE') {
    return reply.status(400).send({ message: 'Solicitação de acesso inválida' })
  }
  throw err
}

function serializeGrant(g: PatientAccessGrantData) {
  return {
    id: g.id,
    patientId: g.patientId,
    accountId: g.accountId,
    accessLevel: g.accessLevel,
    membershipRole: g.membershipRole,
    grantedBy: g.grantedBy,
    email: g.email ?? null,
    displayName: g.displayName ?? null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }
}

export class PatientAccessController {
  constructor(private readonly service: PatientAccessService) {}

  async list(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = patientAccessParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.id)) return
    try {
      const grants = await this.service.listGrants(params.data.id, req.accountId)
      return reply.send(grants.map(serializeGrant))
    } catch (err) {
      return mapGrantError(err, reply)
    }
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = patientAccessParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = createGrantSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.id)) return
    try {
      const grant = await this.service.grantAccess({
        patientId: params.data.id,
        actorAccountId: req.accountId,
        targetAccountId: body.data.accountId,
        accessLevel: body.data.accessLevel,
        membershipRole: body.data.membershipRole,
      })
      return reply.status(201).send(serializeGrant(grant))
    } catch (err) {
      return mapGrantError(err, reply)
    }
  }

  async revoke(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = grantParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.id)) return
    try {
      await this.service.revokeGrant(params.data.id, params.data.grantId, req.accountId)
      return reply.status(204).send()
    } catch (err) {
      return mapGrantError(err, reply)
    }
  }

  async listAudit(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = patientAccessParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.id)) return
    try {
      const rows = await this.service.listAudit(params.data.id, req.accountId)
      return reply.send(rows.map((row) => ({
        id: row.id,
        patientId: row.patientId,
        action: row.action,
        accessLevel: row.accessLevel,
        membershipRole: row.membershipRole,
        careCircleId: row.careCircleId,
        inviteId: row.inviteId,
        grantId: row.grantId,
        patientCount: row.patientCount,
        createdAt: row.createdAt.toISOString(),
        actor: {
          accountId: row.actorAccountId,
          displayName: row.actorDisplayName,
          email: row.actorEmail,
        },
        target: row.targetAccountId ? {
          accountId: row.targetAccountId,
          displayName: row.targetDisplayName,
          email: row.targetEmail,
        } : null,
      })))
    } catch (err) {
      return mapGrantError(err, reply)
    }
  }
}
