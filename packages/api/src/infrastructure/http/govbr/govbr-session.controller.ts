import type { FastifyReply } from 'fastify'
import type { Pool } from 'pg'
import { GovBrSessionService } from '../../../application/govbr/govbr-session.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

export class GovBrSessionController {
  private readonly service: GovBrSessionService

  constructor(pool: Pool) {
    this.service = new GovBrSessionService(pool)
  }

  async getSession(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const view = await this.service.getView(req.accountId)
    return reply.send(view)
  }
}
