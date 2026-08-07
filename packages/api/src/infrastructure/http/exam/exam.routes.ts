import type { FastifyInstance } from 'fastify'
import { ExamController } from './exam.controller.js'
import { ExamService } from '../../../application/exam/exam.service.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { carePlaceService } from '../care-place/care-place.routes.js'

export async function examRoutes(app: FastifyInstance) {
  const controller = new ExamController(new ExamService(new ExamPgRepository(pgPool)), carePlaceService)
  app.post('/exams', controller.create.bind(controller))
  app.get('/exams', controller.findAll.bind(controller))
  app.get('/exams/:id', controller.findById.bind(controller))
  app.patch('/exams/:id', controller.update.bind(controller))
  app.delete('/exams/:id', controller.delete.bind(controller))
}
