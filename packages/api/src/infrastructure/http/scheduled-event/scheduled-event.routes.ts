import type { FastifyInstance } from 'fastify'
import { ScheduledEventController } from './scheduled-event.controller.js'
import { ScheduledEventService } from '../../../application/scheduled-event/scheduled-event.service.js'
import { ScheduledEventPgRepository } from '../../persistence/scheduled-event.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function scheduledEventRoutes(app: FastifyInstance) {
  const controller = new ScheduledEventController(
    new ScheduledEventService(new ScheduledEventPgRepository(pgPool)),
  )
  app.post('/scheduled-events', controller.create.bind(controller))
  app.post('/scheduled-events/import/ics', controller.importIcs.bind(controller))
  app.get('/scheduled-events', controller.findAll.bind(controller))
  app.get('/scheduled-events/:id', controller.findById.bind(controller))
  app.patch('/scheduled-events/:id', controller.update.bind(controller))
  app.delete('/scheduled-events/:id', controller.delete.bind(controller))
  app.get('/scheduled-events/export/ics', controller.exportIcs.bind(controller))
}
