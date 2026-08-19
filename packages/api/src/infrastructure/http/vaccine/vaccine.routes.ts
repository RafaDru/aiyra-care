import type { FastifyInstance } from 'fastify'
import { VaccineController } from './vaccine.controller.js'
import { VaccineService } from '../../../application/vaccine/vaccine.service.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { carePlaceService } from '../care-place/care-place.routes.js'
import { HygieneDetectorService } from '../../../application/hygiene/hygiene-detector.service.js'
import {
  HygienePgRepository,
  PatientAccountPgResolver,
  PatientBirthDatePgResolver,
} from '../../persistence/hygiene.pg.repository.js'

export async function vaccineRoutes(app: FastifyInstance) {
  const vaccineRepo = new VaccinePgRepository(pgPool)
  const birthDates = new PatientBirthDatePgResolver(pgPool)
  const hygieneDetector = new HygieneDetectorService(
    new ExamPgRepository(pgPool),
    vaccineRepo,
    new HygienePgRepository(pgPool),
    new PatientAccountPgResolver(pgPool),
    birthDates,
  )
  const controller = new VaccineController(
    new VaccineService(vaccineRepo, birthDates),
    carePlaceService,
    hygieneDetector,
  )
  app.post('/vaccines', controller.create.bind(controller))
  app.get('/vaccines', controller.findAll.bind(controller))
  app.get('/vaccines/:id', controller.findById.bind(controller))
  app.patch('/vaccines/:id', controller.update.bind(controller))
  app.delete('/vaccines/:id', controller.delete.bind(controller))
}
