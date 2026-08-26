import type { FastifyReply } from 'fastify'
import type { ProductEventService } from '../../../application/telemetry/product-event.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { telemetryIngestBodySchema } from './telemetry.schema.js'

export class TelemetryController {
  constructor(private readonly productEvents: ProductEventService) {}

  async ingest(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })

    const body = telemetryIngestBodySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    for (const event of body.data.events) {
      if (event.patientId && !assertPatientAccess(req, reply, event.patientId)) return
    }

    const result = await this.productEvents.ingest(
      req.accountId,
      body.data.events.map((e) => ({
        eventName: e.eventName as import('../../../domain/telemetry/product-event.js').ProductEventName,
        sessionId: e.sessionId,
        route: e.route,
        patientId: e.patientId,
        properties: e.properties,
      })),
    )

    return reply.status(202).send(result)
  }
}
