import type { FastifyReply, FastifyRequest } from 'fastify'
import type { SupportReportService } from '../../../application/support-report/support-report.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { createSupportReportBodySchema } from './support-report.schema.js'

function toPublicJson(record: Awaited<ReturnType<SupportReportService['create']>>) {
  return {
    id: record.id,
    status: record.status,
    category: record.category,
    description: record.description,
    route: record.route,
    patientId: record.patientId,
    consentTechnical: record.consentTechnical,
    consentScreenshot: record.consentScreenshot,
    consentProfileAccess: record.consentProfileAccess,
    profileAccessUntil: record.profileAccessUntil?.toISOString() ?? null,
    hasScreenshot: record.hasScreenshot,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
  }
}

export class SupportReportController {
  constructor(private readonly service: SupportReportService) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })

    const body = createSupportReportBodySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    if (body.data.patientId && !assertPatientAccess(req, reply, body.data.patientId)) return

    try {
      const record = await this.service.create(req.accountId, body.data)
      return reply.status(201).send(toPublicJson(record))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UNKNOWN'
      if (message === 'INVALID_CATEGORY' || message === 'INVALID_SCREENSHOT') {
        return reply.status(400).send({ message })
      }
      throw err
    }
  }

  async list(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const records = await this.service.listForAccount(req.accountId)
    return reply.send(records.map(toPublicJson))
  }

  async getById(req: AuthenticatedRequest & FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const record = await this.service.getForAccount(req.accountId, req.params.id)
    if (!record) return reply.status(404).send({ message: 'Chamado não encontrado' })
    return reply.send(toPublicJson(record))
  }
}
