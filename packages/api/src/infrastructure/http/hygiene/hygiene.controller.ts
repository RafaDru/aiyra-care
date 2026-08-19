import type { FastifyReply } from 'fastify'
import type { HygieneService } from '../../../application/hygiene/hygiene.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  hygieneCandidateParamsSchema,
  hygieneListQuerySchema,
  hygieneResolveBodySchema,
} from './hygiene.schema.js'

export class HygieneController {
  constructor(private readonly hygiene: HygieneService) {}

  async listPending(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const query = hygieneListQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    const items = await this.hygiene.listPendingForAccount(req.accountId, query.data.patientId)
    const pendingCount = await this.hygiene.pendingCount(req.accountId)
    return reply.send({ pendingCount, items })
  }

  async resolve(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const params = hygieneCandidateParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = hygieneResolveBodySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const item = await this.hygiene.resolve(
        req.accountId,
        params.data.id,
        body.data.decision,
        req.accountId,
      )
      return reply.send(item)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'HYGIENE_CANDIDATE_NOT_FOUND') {
        return reply.status(404).send({ message: 'Candidato não encontrado', code: msg })
      }
      return reply.status(500).send({ message: msg })
    }
  }
}
