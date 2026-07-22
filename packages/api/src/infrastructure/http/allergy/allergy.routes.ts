import type { FastifyInstance } from 'fastify'
import { AllergyController } from './allergy.controller.js'
import { AllergyService } from '../../../application/allergy/allergy.service.js'
import { AllergyPgRepository } from '../../persistence/allergy.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function allergyRoutes(app: FastifyInstance) {
  const controller = new AllergyController(new AllergyService(new AllergyPgRepository(pgPool)))
  app.post('/allergies', controller.create.bind(controller))
  app.get('/allergies', controller.findAll.bind(controller))
  app.get('/allergies/:id', controller.findById.bind(controller))
  app.patch('/allergies/:id', controller.update.bind(controller))
  app.delete('/allergies/:id', controller.delete.bind(controller))
}
