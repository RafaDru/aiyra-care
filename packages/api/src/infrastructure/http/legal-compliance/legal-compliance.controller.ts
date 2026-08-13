import type { FastifyReply } from 'fastify'
import type { LegalComplianceService } from '../../../application/legal-compliance/legal-compliance.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { acceptComplianceSchema, legalKindParamSchema } from './legal-compliance.schema.js'

export class LegalComplianceController {
  constructor(private readonly service: LegalComplianceService) {}

  async listDocuments(_req: AuthenticatedRequest, reply: FastifyReply) {
    const documents = await this.service.listCurrentDocuments()
    return reply.send({ documents })
  }

  async getCurrent(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = legalKindParamSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const doc = await this.service.getCurrentDocument(parsed.data.kind)
    if (!doc) return reply.status(404).send({ message: 'Documento não publicado' })
    return reply.send(doc)
  }

  async status(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const status = await this.service.getStatus(req.accountId)
    return reply.send(status)
  }

  async accept(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = acceptComplianceSchema.safeParse(req.body ?? {})
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const status = await this.service.acceptDocuments({
      accountId: req.accountId,
      kinds: parsed.data.kinds,
      documentIds: parsed.data.documentIds,
      acceptanceIp: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return reply.send(status)
  }

  async contact(_req: AuthenticatedRequest, reply: FastifyReply) {
    return reply.send(this.service.getContactInfo())
  }

  async goLiveStatus(_req: AuthenticatedRequest, reply: FastifyReply) {
    const status = await this.service.getGoLiveStatus()
    return reply.send(status)
  }
}
