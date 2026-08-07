import type { FastifyInstance } from 'fastify'
import { VaccineController } from './vaccine.controller.js'
import { VaccineService } from '../../../application/vaccine/vaccine.service.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { carePlaceService } from '../care-place/care-place.routes.js'

export async function vaccineRoutes(app: FastifyInstance) {
  const controller = new VaccineController(
    new VaccineService(new VaccinePgRepository(pgPool)),
    carePlaceService,
  )
  app.post('/vaccines', controller.create.bind(controller))
  app.get('/vaccines', controller.findAll.bind(controller))
  app.get('/vaccines/:id', controller.findById.bind(controller))
  app.patch('/vaccines/:id', controller.update.bind(controller))
  app.delete('/vaccines/:id', controller.delete.bind(controller))
}
