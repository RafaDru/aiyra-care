import type { FastifyReply } from 'fastify'
import type { DataGenerationService } from '../../../application/data-generation/data-generation.service.js'
import type { RuntimeDegradedService } from '../../../application/ops/runtime-degraded.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

export class AccountFreshnessController {
  constructor(
    private readonly dataGen: DataGenerationService,
    private readonly runtimeDegraded?: RuntimeDegradedService,
  ) {}

  async getFreshness(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const view = await this.dataGen.getAccountFreshness(req.accountId)
    if (this.runtimeDegraded) {
      view.runtime = await this.runtimeDegraded.getPublicView()
    }
    return reply.send(view)
  }
}
