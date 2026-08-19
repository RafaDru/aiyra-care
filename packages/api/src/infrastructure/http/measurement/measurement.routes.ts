import type { FastifyInstance } from 'fastify'
import { MeasurementController } from './measurement.controller.js'
import { MeasurementService } from '../../../application/measurement/measurement.service.js'
import { WhoGrowthService } from '../../../application/measurement/who-growth.service.js'
import { GlucoseExamImportService } from '../../../application/measurement/glucose-exam-import.service.js'
import { MeasurementPgRepository } from '../../persistence/measurement.pg.repository.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { DocumentPgRepository } from '../../persistence/document.pg.repository.js'
import { ExamOrderPgRepository } from '../../persistence/exam-order.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function measurementRoutes(app: FastifyInstance) {
  const measurementRepo = new MeasurementPgRepository(pgPool)
  const patientRepo = new PatientPgRepository(pgPool)
  const whoGrowth = new WhoGrowthService(patientRepo, measurementRepo)
  const glucoseImport = new GlucoseExamImportService(
    new ExamPgRepository(pgPool),
    measurementRepo,
    new DocumentPgRepository(pgPool),
    new ExamOrderPgRepository(pgPool),
  )
  const service = new MeasurementService(measurementRepo, whoGrowth)
  const controller = new MeasurementController(service, whoGrowth, glucoseImport)

  app.get('/measurement-types', controller.listTypes.bind(controller))
  app.get('/measurements', controller.listObservations.bind(controller))
  app.post('/measurements', controller.createObservation.bind(controller))
  app.post('/measurements/batch', controller.createBatch.bind(controller))
  app.post('/measurements/import-glucose', controller.importGlucose.bind(controller))
  app.delete('/measurements/:id', controller.deleteObservation.bind(controller))
  app.get('/measurements/chart-series', controller.chartSeries.bind(controller))
  app.get('/measurements/timeline', controller.timeline.bind(controller))
  app.get('/measurements/who-growth', controller.whoGrowth.bind(controller))

  app.get('/medication-administrations', controller.listAdministrations.bind(controller))
  app.post('/medication-administrations', controller.createAdministration.bind(controller))
  app.delete('/medication-administrations/:id', controller.deleteAdministration.bind(controller))
}
