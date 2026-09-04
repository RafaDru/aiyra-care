import type { FastifyReply } from 'fastify'
import type { Pool } from 'pg'
import type { PatientProfileShareService } from '../../../application/patient-access/patient-profile-share.service.js'
import type { PatientProfileShareInvite } from '../../../domain/patient-access/patient-profile-share.types.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  acceptProfileShareSchema,
  acceptProfileShareByIdSchema,
  createProfileShareSchema,
  profileShareParamsSchema,
  profileShareTokenParamsSchema,
} from './patient-profile-share.schema.js'

function mapShareError(err: unknown, reply: FastifyReply) {
  const code = err instanceof Error ? err.message : ''
  const map: Record<string, [number, string]> = {
    PATIENT_ACCESS_FORBIDDEN: [403, 'Sem permissão para compartilhar este perfil'],
    PROFILE_SHARE_NOT_FOUND: [404, 'Compartilhamento não encontrado'],
    PROFILE_SHARE_NOT_PENDING: [409, 'Compartilhamento não está mais pendente'],
    PROFILE_SHARE_EXPIRED: [410, 'Convite de compartilhamento expirado'],
    PROFILE_SHARE_EMAIL_MISMATCH: [403, 'Faça login com o e-mail convidado'],
    PROFILE_SHARE_SELF: [400, 'Não é possível compartilhar com você mesmo'],
    PROFILE_SHARE_LEGITIMACY_REQUIRED: [400, 'Confirme a legitimidade do compartilhamento'],
    PROFILE_SHARE_INVALID_EMAIL: [400, 'E-mail inválido'],
    PROFILE_SHARE_ALREADY_PENDING: [409, 'Já existe convite pendente para este e-mail'],
    CARE_CIRCLE_FORBIDDEN: [403, 'Sem permissão nesta família'],
  }
  const hit = map[code]
  if (hit) return reply.status(hit[0]).send({ message: hit[1] })
  throw err
}

function serializeShare(i: PatientProfileShareInvite) {
  return {
    id: i.id,
    patientId: i.patientId,
    patientName: i.patientName,
    ownerDisplayName: i.ownerDisplayName,
    targetAccountEmail: i.targetAccountEmail,
    targetCircleId: i.targetCircleId,
    targetCircleName: i.targetCircleName,
    status: i.status,
    expiresAt: i.expiresAt.toISOString(),
    acceptedAt: i.acceptedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  }
}

export class PatientProfileShareController {
  constructor(
    private readonly service: PatientProfileShareService,
    private readonly pool: Pool,
  ) {}

  async listSent(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const rows = await this.service.listSent(req.accountId)
    return reply.send(rows.map(serializeShare))
  }

  async listIncoming(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const email = await this.getAccountEmail(req.accountId)
    const rows = await this.service.listIncoming(req.accountId, email)
    return reply.send(rows.map(serializeShare))
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const body = createProfileShareSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const invite = await this.service.create({
        ownerAccountId: req.accountId,
        ...body.data,
      })
      return reply.status(201).send(serializeShare(invite))
    } catch (err) {
      return mapShareError(err, reply)
    }
  }

  async preview(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = profileShareTokenParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const preview = await this.service.preview(params.data.token)
    if (!preview) return reply.status(404).send({ message: 'Convite não encontrado' })
    return reply.send(preview)
  }

  async accept(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const body = acceptProfileShareSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const email = await this.getAccountEmail(req.accountId)
    try {
      const invite = await this.service.accept({
        accountId: req.accountId,
        accountEmail: email,
        ...body.data,
      })
      return reply.send(serializeShare(invite))
    } catch (err) {
      return mapShareError(err, reply)
    }
  }

  async acceptById(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = profileShareParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = acceptProfileShareByIdSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const email = await this.getAccountEmail(req.accountId)
    try {
      const invite = await this.service.acceptById(
        params.data.id,
        req.accountId,
        email,
        body.data.circleId,
      )
      return reply.send(serializeShare(invite))
    } catch (err) {
      return mapShareError(err, reply)
    }
  }

  async decline(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = profileShareParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const email = await this.getAccountEmail(req.accountId)
    try {
      await this.service.decline(req.accountId, email, params.data.id)
      return reply.status(204).send()
    } catch (err) {
      return mapShareError(err, reply)
    }
  }

  async revoke(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = profileShareParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      await this.service.revoke(req.accountId, params.data.id)
      return reply.status(204).send()
    } catch (err) {
      return mapShareError(err, reply)
    }
  }

  private async getAccountEmail(accountId: string) {
    const { rows } = await this.pool.query(`SELECT email FROM app_accounts WHERE id = $1`, [accountId])
    return (rows[0]?.email as string | null) ?? null
  }
}
