import type { FastifyInstance } from 'fastify'
import { ProductEventService } from '../../../application/telemetry/product-event.service.js'
import { ProductEventPgRepository } from '../../persistence/product-event.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { TelemetryController } from './telemetry.controller.js'

export async function telemetryRoutes(app: FastifyInstance) {
  const service = new ProductEventService(new ProductEventPgRepository(pgPool))
  const controller = new TelemetryController(service)
  app.post('/telemetry/events', controller.ingest.bind(controller))
  app.post('/telemetry/public-events', controller.ingestPublic.bind(controller))
}
