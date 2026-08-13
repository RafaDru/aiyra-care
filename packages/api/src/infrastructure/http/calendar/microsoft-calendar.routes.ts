import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { MicrosoftCalendarService } from '../../../application/calendar/microsoft-calendar.service.js'
import { CalendarConnectionPgRepository } from '../../persistence/calendar-connection.pg.repository.js'
import { ScheduledEventService } from '../../../application/scheduled-event/scheduled-event.service.js'
import { ScheduledEventPgRepository } from '../../persistence/scheduled-event.pg.repository.js'
import { MicrosoftCalendarController } from './microsoft-calendar.controller.js'

export async function microsoftCalendarRoutes(app: FastifyInstance) {
  const scheduledRepo = new ScheduledEventPgRepository(pgPool)
  const scheduledEvents = new ScheduledEventService(scheduledRepo)
  const service = new MicrosoftCalendarService(
    new CalendarConnectionPgRepository(pgPool),
    scheduledEvents,
    scheduledRepo,
  )
  const controller = new MicrosoftCalendarController(service)

  app.get('/calendar/microsoft/oauth/start', controller.oauthStart.bind(controller))
  app.get('/calendar/microsoft/oauth/callback', controller.oauthCallback.bind(controller))
  app.get('/calendar/microsoft/status', controller.status.bind(controller))
  app.post('/calendar/microsoft/sync', controller.sync.bind(controller))
  app.post('/calendar/microsoft/disconnect', controller.disconnect.bind(controller))
}
