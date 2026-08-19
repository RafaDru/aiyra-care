import type { FastifyInstance } from 'fastify'
import { HygieneController } from './hygiene.controller.js'
import { HygieneService } from '../../../application/hygiene/hygiene.service.js'
import { HygienePgRepository } from '../../persistence/hygiene.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function hygieneRoutes(app: FastifyInstance) {
  const hygieneRepo = new HygienePgRepository(pgPool)
  const service = new HygieneService(
    hygieneRepo,
    new ExamPgRepository(pgPool),
    new VaccinePgRepository(pgPool),
  )
  const controller = new HygieneController(service)

  app.get('/hygiene/candidates', controller.listPending.bind(controller))
  app.post('/hygiene/candidates/:id/resolve', controller.resolve.bind(controller))
}
