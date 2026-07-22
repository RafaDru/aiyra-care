import type { FastifyInstance } from 'fastify'
import { MedicalRecordController } from './medical-record.controller.js'
import { MedicalRecordService } from '../../../application/medical-record/medical-record.service.js'
import { MedicalRecordPgRepository } from '../../persistence/medical-record.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function medicalRecordRoutes(app: FastifyInstance) {
  const controller = new MedicalRecordController(new MedicalRecordService(new MedicalRecordPgRepository(pgPool)))
  app.post('/medical-records', controller.create.bind(controller))
  app.get('/medical-records', controller.findAll.bind(controller))
  app.get('/medical-records/:id', controller.findById.bind(controller))
  app.patch('/medical-records/:id', controller.update.bind(controller))
  app.delete('/medical-records/:id', controller.delete.bind(controller))
}
