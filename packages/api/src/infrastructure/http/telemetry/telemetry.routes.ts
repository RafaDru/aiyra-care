import type { FastifyInstance } from 'fastify'
import { ProductEventService } from '../../../application/telemetry/product-event.service.js'
import { ProductEventPgRepository } from '../../persistence/product-event.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { TelemetryController } from './telemetry.controller.js'
import { createClientErrorIngestStack } from './create-client-error-stack.js'

export async function telemetryRoutes(app: FastifyInstance) {
  const productEvents = new ProductEventService(new ProductEventPgRepository(pgPool))
  const { clientErrors } = createClientErrorIngestStack(pgPool)
  const controller = new TelemetryController(productEvents, clientErrors)
  app.post('/telemetry/events', controller.ingest.bind(controller))
  app.post('/telemetry/public-events', controller.ingestPublic.bind(controller))
  app.post('/telemetry/client-errors', controller.ingestClientErrors.bind(controller))
}
