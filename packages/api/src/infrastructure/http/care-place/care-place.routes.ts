import type { FastifyInstance } from 'fastify'
import { CarePlaceController } from './care-place.controller.js'
import { CarePlaceService } from '../../../application/care-place/care-place.service.js'
import { CarePlacePgRepository } from '../../persistence/care-place.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export const carePlaceService = new CarePlaceService(new CarePlacePgRepository(pgPool))

export async function carePlaceRoutes(app: FastifyInstance) {
  const controller = new CarePlaceController(carePlaceService)
  app.get('/care-places', controller.search.bind(controller))
}
