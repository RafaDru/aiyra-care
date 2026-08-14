import type { FastifyInstance } from 'fastify'
import { CareReminderController } from './care-reminder.controller.js'
import { CareReminderService } from '../../../application/care-reminder/care-reminder.service.js'
import { MeasurementService } from '../../../application/measurement/measurement.service.js'
import { CareReminderPgRepository } from '../../persistence/care-reminder.pg.repository.js'
import { MeasurementPgRepository } from '../../persistence/measurement.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function careReminderRoutes(app: FastifyInstance) {
  const measurements = new MeasurementService(new MeasurementPgRepository(pgPool))
  const controller = new CareReminderController(
    new CareReminderService(new CareReminderPgRepository(pgPool)),
    measurements,
  )

  app.get('/care-reminders', controller.list.bind(controller))
  app.get('/care-reminders/pending', controller.pending.bind(controller))
  app.post('/care-reminders', controller.create.bind(controller))
  app.post('/care-reminders/illness-pack', controller.createIllnessPack.bind(controller))
  app.post('/care-reminders/:id/complete', controller.complete.bind(controller))
  app.post('/care-reminders/:id/snooze', controller.snooze.bind(controller))
  app.post('/care-reminders/:id/deactivate', controller.deactivate.bind(controller))
  app.get('/monitoring-export', controller.monitoringExport.bind(controller))
}
