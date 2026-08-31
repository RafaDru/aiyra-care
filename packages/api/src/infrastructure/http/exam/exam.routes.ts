import type { FastifyInstance } from 'fastify'
import { ExamController } from './exam.controller.js'
import { ExamService } from '../../../application/exam/exam.service.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { GcsFileStorage } from '../../storage/gcs.storage.js'
import { pgPool } from '../../../db/postgres.js'
import { carePlaceService } from '../care-place/care-place.routes.js'
import { getDataGenerationService } from '../account-freshness/account-freshness.routes.js'
import { HygieneDetectorService } from '../../../application/hygiene/hygiene-detector.service.js'
import {
  HygienePgRepository,
  PatientAccountPgResolver,
  PatientBirthDatePgResolver,
} from '../../persistence/hygiene.pg.repository.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'

export async function examRoutes(app: FastifyInstance) {
  const examRepo = new ExamPgRepository(pgPool)
  const hygieneDetector = new HygieneDetectorService(
    examRepo,
    new VaccinePgRepository(pgPool),
    new HygienePgRepository(pgPool),
    new PatientAccountPgResolver(pgPool),
    new PatientBirthDatePgResolver(pgPool),
  )
  const controller = new ExamController(
    new ExamService(examRepo, new GcsFileStorage()),
    carePlaceService,
    hygieneDetector,
    getDataGenerationService(),
  )
  app.post('/exams', controller.create.bind(controller))
  app.get('/exams', controller.findAll.bind(controller))
  app.get('/exams/:id', controller.findById.bind(controller))
  app.get('/exams/:id/result-file', controller.downloadResultFile.bind(controller))
  app.patch('/exams/:id', controller.update.bind(controller))
  app.delete('/exams/:id', controller.delete.bind(controller))
}
