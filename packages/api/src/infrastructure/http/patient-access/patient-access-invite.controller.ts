import type { FastifyReply } from 'fastify'
import type { Pool } from 'pg'
import type { PatientAccessInviteService } from '../../../application/patient-access/patient-access-invite.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import type { PatientAccessInviteData } from '../../../domain/patient-access/patient-access-invite.types.js'
import {
  acceptInviteSchema,
  createInviteSchema,
  inviteParamsSchema,
  inviteTokenParamsSchema,
} from './patient-access-invite.schema.js'

function mapInviteError(err: unknown, reply: FastifyReply) {
  const code = err instanceof Error ? err.message : ''
  const map: Record<string, [number, string]> = {
    PATIENT_ACCESS_FORBIDDEN: [403, 'Sem permissão para convidar neste perfil'],
    PATIENT_ACCESS_INVITE_NOT_FOUND: [404, 'Convite não encontrado'],
    PATIENT_ACCESS_INVITE_NOT_PENDING: [409, 'Convite não está mais pendente'],
    PATIENT_ACCESS_INVITE_EXPIRED: [410, 'Convite expirado'],
    PATIENT_ACCESS_INVITE_EMAIL_MISMATCH: [403, 'Faça login com o e-mail convidado'],
    PATIENT_ACCESS_INVITE_SELF: [400, 'Não é possível aceitar o próprio convite'],
    PATIENT_ACCESS_INVITE_LEGITIMACY_REQUIRED: [400, 'Confirme a legitimidade do convite'],
    PATIENT_ACCESS_INVITE_INVALID_EMAIL: [400, 'E-mail inválido'],
    PATIENT_ACCESS_INVITE_NO_PATIENTS: [400, 'Selecione ao menos um perfil de saúde'],
    PATIENT_ACCESS_ADMIN_LIMIT: [409, 'Limite de cuidadores com acesso total atingido'],
    CARE_CIRCLE_FORBIDDEN: [403, 'Sem permissão nesta família'],
    CARE_CIRCLE_PATIENT_NOT_FOUND: [400, 'Perfil não pertence à família selecionada'],
    CARE_CIRCLE_ADMIN_LIMIT: [409, 'Limite de administradores da família atingido'],
  }
  const hit = map[code]
  if (hit) return reply.status(hit[0]).send({ message: hit[1] })
  throw err
}

function serializeInvite(i: PatientAccessInviteData) {
  return {
    id: i.id,
    inviteeEmail: i.inviteeEmail,
    patientIds: i.patientIds,
    accessLevel: i.accessLevel,
    membershipRole: i.membershipRole,
    careCircleId: i.careCircleId,
    circleRole: i.circleRole,
    status: i.status,
    expiresAt: i.expiresAt.toISOString(),
    acceptedAt: i.acceptedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  }
}

export class PatientAccessInviteController {
  constructor(
    private readonly service: PatientAccessInviteService,
    private readonly pool: Pool,
  ) {}

  async list(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const rows = await this.service.listSent(req.accountId)
    return reply.send(rows.map(serializeInvite))
  }

  async listOwnedPatients(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const circleId = typeof req.query === 'object' && req.query && 'careCircleId' in req.query
      ? String((req.query as { careCircleId?: string }).careCircleId ?? '')
      : undefined
    try {
      const rows = await this.service.listOwnedPatients(
        req.accountId,
        circleId && circleId.length > 0 ? circleId : undefined,
      )
      return reply.send(rows)
    } catch (err) {
      return mapInviteError(err, reply)
    }
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const body = createInviteSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const { invite, acceptUrl } = await this.service.createInvite({
        inviterAccountId: req.accountId,
        ...body.data,
      })
      return reply.status(201).send({ ...serializeInvite(invite), acceptUrl })
    } catch (err) {
      return mapInviteError(err, reply)
    }
  }

  async revoke(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = inviteParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      await this.service.revoke(req.accountId, params.data.id)
      return reply.status(204).send()
    } catch (err) {
      return mapInviteError(err, reply)
    }
  }

  async preview(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = inviteTokenParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const preview = await this.service.getPreview(params.data.token)
    if (!preview) return reply.status(404).send({ message: 'Convite não encontrado' })
    return reply.send({
      ...preview,
      expiresAt: preview.expiresAt.toISOString(),
    })
  }

  async accept(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const body = acceptInviteSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const { rows } = await this.pool.query(`SELECT email FROM app_accounts WHERE id = $1`, [req.accountId])
    const email = (rows[0]?.email as string | null) ?? null
    try {
      const invite = await this.service.accept({
        token: body.data.token,
        accountId: req.accountId,
        accountEmail: email,
      })
      return reply.send(serializeInvite(invite))
    } catch (err) {
      return mapInviteError(err, reply)
    }
  }
}
