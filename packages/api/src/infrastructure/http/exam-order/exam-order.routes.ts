import type { FastifyInstance } from 'fastify'
import { ExamOrderController } from './exam-order.controller.js'
import { ExamOrderService } from '../../../application/exam-order/exam-order.service.js'
import { ExamOrderPgRepository } from '../../persistence/exam-order.pg.repository.js'
import { GcsFileStorage } from '../../storage/gcs.storage.js'
import { pgPool } from '../../../db/postgres.js'

export async function examOrderRoutes(app: FastifyInstance) {
  const controller = new ExamOrderController(
    new ExamOrderService(new ExamOrderPgRepository(pgPool), new GcsFileStorage()),
  )
  app.get('/exam-orders', controller.findAll.bind(controller))
  app.get('/exam-orders/:id/result-file', controller.downloadResultFile.bind(controller))
}
