import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { ExamResultItemPgRepository } from '../../persistence/exam-result-item.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { ExamResultItemService } from '../../../application/exam-result-item/exam-result-item.service.js'
import { ExamService } from '../../../application/exam/exam.service.js'
import { ExamResultItemController } from './exam-result-item.controller.js'

export async function examResultItemRoutes(app: FastifyInstance) {
  const repo = new ExamResultItemPgRepository(pgPool)
  const service = new ExamResultItemService(repo)
  const exams = new ExamService(new ExamPgRepository(pgPool))
  const controller = new ExamResultItemController(service, exams)

  app.get('/exam-markers', controller.listByPatient.bind(controller))
  app.get('/patients/:patientId/exam-markers/trends', controller.getMarkerTrends.bind(controller))
  app.get('/exams/:examId/markers', controller.listByExam.bind(controller))
  app.post('/exam-markers/batch', controller.createBatch.bind(controller))
}
