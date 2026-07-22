import type { FastifyInstance } from 'fastify'
import { GrowthRecordController } from './growth-record.controller.js'
import { GrowthRecordService } from '../../../application/growth-record/growth-record.service.js'
import { GrowthRecordPgRepository } from '../../persistence/growth-record.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function growthRecordRoutes(app: FastifyInstance) {
  const controller = new GrowthRecordController(new GrowthRecordService(new GrowthRecordPgRepository(pgPool)))
  app.post('/growth-records', controller.create.bind(controller))
  app.get('/growth-records', controller.findAll.bind(controller))
  app.get('/growth-records/:id', controller.findById.bind(controller))
  app.patch('/growth-records/:id', controller.update.bind(controller))
  app.delete('/growth-records/:id', controller.delete.bind(controller))
}
