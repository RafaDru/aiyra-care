import type { FastifyInstance } from 'fastify'
import { PatientController } from './patient.controller.js'
import { PatientService } from '../../../application/patient/patient.service.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function patientRoutes(app: FastifyInstance) {
  const repo = new PatientPgRepository(pgPool)
  const service = new PatientService(repo)
  const controller = new PatientController(service)

  app.post('/patients', controller.create.bind(controller))
  app.get('/patients', controller.findAll.bind(controller))
  app.get('/patients/:id', controller.findById.bind(controller))
  app.patch('/patients/:id', controller.update.bind(controller))
  app.delete('/patients/:id', controller.delete.bind(controller))
}
