import type { FastifyReply } from 'fastify'
import type { InsurancePlanService } from '../../../application/insurance-plan/insurance-plan.service.js'
import { planMembershipQuerySchema } from './insurance-plan.schema.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'

export class InsurancePlanController {
  constructor(private readonly service: InsurancePlanService) {}

  async findMembershipsByPatient(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = planMembershipQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    if (!assertPatientAccess(req, reply, query.data.patientId)) return
    const items = await this.service.findMembershipsByPatient(query.data.patientId)
    return reply.send(items)
  }
}
