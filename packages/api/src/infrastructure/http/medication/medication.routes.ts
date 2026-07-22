import type { FastifyInstance } from 'fastify'
import { MedicationController } from './medication.controller.js'
import { MedicationService } from '../../../application/medication/medication.service.js'
import { MedicationPgRepository } from '../../persistence/medication.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function medicationRoutes(app: FastifyInstance) {
  const controller = new MedicationController(new MedicationService(new MedicationPgRepository(pgPool)))
  app.post('/medications', controller.create.bind(controller))
  app.get('/medications', controller.findAll.bind(controller))
  app.get('/medications/:id', controller.findById.bind(controller))
  app.patch('/medications/:id', controller.update.bind(controller))
  app.delete('/medications/:id', controller.delete.bind(controller))
}
