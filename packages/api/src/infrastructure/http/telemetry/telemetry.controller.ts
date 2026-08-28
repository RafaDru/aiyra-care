import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ProductEventService } from '../../../application/telemetry/product-event.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { PUBLIC_LANDING_EVENT_NAMES, type ProductEventName } from '../../../domain/telemetry/product-event.js'
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

  async ingestPublic(req: FastifyRequest, reply: FastifyReply) {
    const body = telemetryIngestBodySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const filtered = body.data.events.filter((e) =>
      PUBLIC_LANDING_EVENT_NAMES.has(e.eventName as ProductEventName),
    )
    if (!filtered.length) {
      return reply.status(400).send({ message: 'Nenhum evento de landing válido' })
    }

    const result = await this.productEvents.ingest(
      null,
      filtered.map((e) => ({
        eventName: e.eventName as ProductEventName,
        sessionId: e.sessionId,
        route: e.route,
        properties: e.properties,
      })),
    )

    return reply.status(202).send(result)
  }
}
