import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { ExamResultItemPgRepository } from '../../persistence/exam-result-item.pg.repository.js'
import { ExamResultItemService } from '../../../application/exam-result-item/exam-result-item.service.js'
import { ExamResultItemController } from './exam-result-item.controller.js'

export async function examResultItemRoutes(app: FastifyInstance) {
  const pool = app.pgPool as Pool
  const repo = new ExamResultItemPgRepository(pool)
  const service = new ExamResultItemService(repo)
  const controller = new ExamResultItemController(service)

  app.get('/exam-markers', (req, reply) => controller.listByPatient(req, reply))
  app.get('/patients/:patientId/exam-markers/trends', (req, reply) => controller.getMarkerTrends(req, reply))
  app.get('/exams/:examId/markers', (req, reply) => controller.listByExam(req, reply))
  app.post('/exam-markers/batch', (req, reply) => controller.createBatch(req, reply))
}
