import type { FastifyReply } from 'fastify'
import type { FamilySupportService } from '../../../application/family-support/family-support.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { familySupportParamsSchema, familySupportQuerySchema } from './family-support.schema.js'

export class FamilySupportController {
  constructor(private readonly service: FamilySupportService) {}

  async getInsights(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = familySupportParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.id)) return

    const query = familySupportQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })

    const bundle = await this.service.buildInsights(params.data.id, {
      medicationName: query.data.medicationName,
      healthThreadId: query.data.healthThreadId,
    })
    return reply.send(bundle)
  }
}
