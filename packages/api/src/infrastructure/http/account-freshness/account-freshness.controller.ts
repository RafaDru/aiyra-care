import type { FastifyReply } from 'fastify'
import type { DataGenerationService } from '../../../application/data-generation/data-generation.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

export class AccountFreshnessController {
  constructor(private readonly dataGen: DataGenerationService) {}

  async getFreshness(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const view = await this.dataGen.getAccountFreshness(req.accountId)
    return reply.send(view)
  }
}
