import type { FastifyReply } from 'fastify'
import { z } from 'zod'
import type { PatientContextService } from '../../../application/patient/patient-context.service.js'
import type { ClinicalExportShareService } from '../../../application/patient/clinical-export-share.service.js'
import type { PatientService } from '../../../application/patient/patient.service.js'
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

const shareTokenSchema = z.object({ token: z.string().min(16) })

export class ClinicalExportController {
  constructor(
    private readonly contextService: PatientContextService,
    private readonly shareService: ClinicalExportShareService,
    private readonly patientService: PatientService,
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

    const body = shareBodySchema.safeParse(req.body ?? {})
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const ttlMs = (body.data.ttlHours ?? 48) * 60 * 60 * 1000
    const share = await this.shareService.createShare({
      patientId: parsed.data.id,
      mode: body.data.mode,
      createdBy: req.accountId,
      ttlMs,
    })
    return reply.status(201).send(share)
  }

  async getSharedExport(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = shareTokenSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const resolved = await this.shareService.resolveToken(parsed.data.token)
    if (!resolved) return reply.status(404).send({ message: 'Link expirado ou inválido' })

    return reply.send(resolved.export)
  }
}
