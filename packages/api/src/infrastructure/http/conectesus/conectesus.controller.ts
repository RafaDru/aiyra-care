import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ConecteSUSSyncService } from '../../../application/conectesus/conectesus-sync.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'

export class ConecteSUSController {
  constructor(private readonly syncService: ConecteSUSSyncService) {}

  async sync(req: FastifyRequest, reply: FastifyReply) {
    const authReq = req as AuthenticatedRequest
    const patientId = (req.params as { patientId: string }).patientId
    if (!authReq.accountId) return reply.status(401).send({ message: 'Não autenticado' })

    if (!assertPatientAccess(authReq, reply, patientId)) return

    const silent = (req.query as { silent?: string }).silent === '1'
    const result = await this.syncService.sync(authReq.accountId, patientId, { silent })
    return reply.send(result)
  }
}
