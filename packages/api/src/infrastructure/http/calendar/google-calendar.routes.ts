import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { GoogleCalendarService } from '../../../application/calendar/google-calendar.service.js'
import { CalendarConnectionPgRepository } from '../../persistence/calendar-connection.pg.repository.js'
import { ScheduledEventService } from '../../../application/scheduled-event/scheduled-event.service.js'
import { ScheduledEventPgRepository } from '../../persistence/scheduled-event.pg.repository.js'
import { GoogleCalendarController } from './google-calendar.controller.js'

export async function googleCalendarRoutes(app: FastifyInstance) {
  const scheduledRepo = new ScheduledEventPgRepository(pgPool)
  const scheduledEvents = new ScheduledEventService(scheduledRepo)
  const service = new GoogleCalendarService(
    new CalendarConnectionPgRepository(pgPool),
    scheduledEvents,
    scheduledRepo,
  )
  const controller = new GoogleCalendarController(service)

  app.get('/calendar/google/oauth/start', controller.oauthStart.bind(controller))
  app.get('/calendar/google/oauth/callback', controller.oauthCallback.bind(controller))
  app.get('/calendar/google/status', controller.status.bind(controller))
  app.post('/calendar/google/sync', controller.sync.bind(controller))
  app.post('/calendar/google/disconnect', controller.disconnect.bind(controller))
}
