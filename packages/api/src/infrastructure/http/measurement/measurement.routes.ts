import type { FastifyInstance } from 'fastify'
import { MeasurementController } from './measurement.controller.js'
import { MeasurementService } from '../../../application/measurement/measurement.service.js'
import { MeasurementPgRepository } from '../../persistence/measurement.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function measurementRoutes(app: FastifyInstance) {
  const controller = new MeasurementController(
    new MeasurementService(new MeasurementPgRepository(pgPool)),
  )

  app.get('/measurement-types', controller.listTypes.bind(controller))
  app.get('/measurements', controller.listObservations.bind(controller))
  app.post('/measurements', controller.createObservation.bind(controller))
  app.post('/measurements/batch', controller.createBatch.bind(controller))
  app.delete('/measurements/:id', controller.deleteObservation.bind(controller))
  app.get('/measurements/chart-series', controller.chartSeries.bind(controller))
  app.get('/measurements/timeline', controller.timeline.bind(controller))

  app.get('/medication-administrations', controller.listAdministrations.bind(controller))
  app.post('/medication-administrations', controller.createAdministration.bind(controller))
  app.delete('/medication-administrations/:id', controller.deleteAdministration.bind(controller))
}
