import type { FastifyInstance } from 'fastify'
import { FamilySupportController } from './family-support.controller.js'
import { FamilySupportService } from '../../../application/family-support/family-support.service.js'
import { MeasurementPgRepository } from '../../persistence/measurement.pg.repository.js'
import { AllergyPgRepository } from '../../persistence/allergy.pg.repository.js'
import { MedicationPgRepository } from '../../persistence/medication.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function familySupportRoutes(app: FastifyInstance) {
  const service = new FamilySupportService(
    new MeasurementPgRepository(pgPool),
    new AllergyPgRepository(pgPool),
    new MedicationPgRepository(pgPool),
  )
  const controller = new FamilySupportController(service)

  app.get('/patients/:id/family-support/insights', controller.getInsights.bind(controller))
}
