import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { ClinicalExportEmailService } from '../../../application/notifications/clinical-export-email.service.js'
import type { PatientContextService } from '../../../application/patient/patient-context.service.js'
import type { ClinicalExportShareService } from '../../../application/patient/clinical-export-share.service.js'
import type { PatientService } from '../../../application/patient/patient.service.js'
import type { ReferralCodeService } from '../../../application/referral/referral-code.service.js'
import type { ProductEventService } from '../../../application/telemetry/product-event.service.js'
import type { PatientMembershipRepository } from '../../../domain/auth/app-account.repository.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { patientParamsSchema } from '../patient/patient.schema.js'

const exportQuerySchema = z.object({
  mode: z.enum(['summary', 'full']).optional().default('summary'),
})

const shareBodySchema = z.object({
  mode: z.enum(['summary', 'full']).optional().default('summary'),
  ttlHours: z.number().int().min(1).max(168).optional(),
})

const shareEmailBodySchema = z.object({
  mode: z.enum(['summary', 'full']).optional().default('summary'),
  ttlHours: z.number().int().min(1).max(168).optional(),
  recipientEmail: z.string().email().max(320),
  doctorName: z.string().min(1).max(120).optional(),
})

const shareTokenSchema = z.object({ token: z.string().min(16) })

const sharedExportQuerySchema = z.object({
  ref: z.string().min(4).max(12).optional(),
})

export class ClinicalExportController {
  constructor(
    private readonly contextService: PatientContextService,
    private readonly shareService: ClinicalExportShareService,
    private readonly patientService: PatientService,
    private readonly referralCodes: ReferralCodeService,
    private readonly exportEmails: ClinicalExportEmailService,
    private readonly productEvents?: ProductEventService,
    private readonly memberships?: PatientMembershipRepository,
  ) {}

  async getExport(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return

    const query = exportQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })

    try {
      const exportData = await this.contextService.buildClinicalExport(parsed.data.id, query.data.mode)
      return reply.send(exportData)
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async createShare(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })

    const body = shareBodySchema.safeParse(req.body ?? {})
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const referralCode = await this.referralCodes.getOrCreate(req.accountId)
    const ttlMs = (body.data.ttlHours ?? 48) * 60 * 60 * 1000
    const share = await this.shareService.createShare({
      patientId: parsed.data.id,
      mode: body.data.mode,
      createdBy: req.accountId,
      ttlMs,
      referralCode,
    })

    if (this.productEvents) {
      await this.productEvents.ingest(req.accountId, [
        {
          eventName: 'referral_link_created',
          patientId: parsed.data.id,
          properties: { mode: body.data.mode, has_referral: true },
        },
      ])
    }

    return reply.status(201).send(share)
  }

  async emailShare(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })

    const body = shareEmailBodySchema.safeParse(req.body ?? {})
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const patient = await this.patientService.findById(parsed.data.id)
    if (!patient) return reply.status(404).send({ message: 'Paciente não encontrado' })

    const referralCode = await this.referralCodes.getOrCreate(req.accountId)
    const ttlMs = (body.data.ttlHours ?? 48) * 60 * 60 * 1000
    const share = await this.shareService.createShare({
      patientId: parsed.data.id,
      mode: body.data.mode,
      createdBy: req.accountId,
      ttlMs,
      referralCode,
      recipientEmail: body.data.recipientEmail,
    })

    const sendResult = await this.exportEmails.sendToDoctor({
      recipientEmail: body.data.recipientEmail,
      doctorName: body.data.doctorName,
      patientName: patient.name,
      shareUrl: share.shareUrl,
      expiresAt: share.expiresAt,
    })

    if (this.productEvents) {
      await this.productEvents.ingest(req.accountId, [
        {
          eventName: 'referral_link_created',
          patientId: parsed.data.id,
          properties: { mode: body.data.mode, channel: 'email', has_referral: true },
        },
        {
          eventName: 'consult_visit_email_sent',
          patientId: parsed.data.id,
          properties: { mode: body.data.mode, email_skipped: sendResult.skipped },
        },
      ])
    }

    return reply.status(202).send({
      ok: true,
      shareUrl: share.shareUrl,
      referralCode: share.referralCode,
      expiresAt: share.expiresAt,
      emailSent: !sendResult.skipped,
      emailSkipped: sendResult.skipped,
    })
  }

  async getSharedExport(req: FastifyRequest, reply: FastifyReply) {
    const parsed = shareTokenSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const query = sharedExportQuerySchema.safeParse(req.query ?? {})
    const referralRef = query.success ? query.data.ref : undefined

    const resolved = await this.shareService.resolveToken(parsed.data.token)
    if (!resolved) return reply.status(404).send({ message: 'Link expirado ou inválido' })

    await this.shareService.markOpened(parsed.data.token, referralRef)

    if (this.productEvents) {
      await this.productEvents.ingest(null, [
        {
          eventName: 'referral_link_opened',
          patientId: resolved.patientId,
          properties: {
            mode: resolved.mode,
            has_referral: Boolean(referralRef),
          },
        },
      ])
    }

    return reply.send(resolved.export)
  }
}
