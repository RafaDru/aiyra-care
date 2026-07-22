import type { FastifyInstance } from 'fastify'
import { DiagnosisController } from './diagnosis.controller.js'
import { DiagnosisService } from '../../../application/diagnosis/diagnosis.service.js'
import { DiagnosisPgRepository } from '../../persistence/diagnosis.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function diagnosisRoutes(app: FastifyInstance) {
  const controller = new DiagnosisController(new DiagnosisService(new DiagnosisPgRepository(pgPool)))
  app.post('/diagnoses', controller.create.bind(controller))
  app.get('/diagnoses', controller.findAll.bind(controller))
  app.get('/diagnoses/:id', controller.findById.bind(controller))
  app.patch('/diagnoses/:id', controller.update.bind(controller))
  app.delete('/diagnoses/:id', controller.delete.bind(controller))
}
