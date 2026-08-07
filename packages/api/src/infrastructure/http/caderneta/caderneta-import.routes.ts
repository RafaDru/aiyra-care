import type { FastifyInstance } from 'fastify'
import { CadernetaImportController } from './caderneta-import.controller.js'
import { CadernetaImportService } from '../../../application/caderneta/caderneta-import.service.js'
import { ImportLineageService } from '../../../application/import-lineage/import-lineage.service.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { ImportLineagePgRepository } from '../../persistence/import-lineage.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function cadernetaImportRoutes(app: FastifyInstance) {
  const lineage = new ImportLineageService(new ImportLineagePgRepository(pgPool))
  const service = new CadernetaImportService(
    pgPool,
    new PatientPgRepository(pgPool),
    new VaccinePgRepository(pgPool),
    lineage,
  )
  const controller = new CadernetaImportController(service)

  app.post('/patients/:patientId/import-caderneta', controller.import.bind(controller))
  app.post('/patients/:patientId/caderneta-family-plan', controller.planFamily.bind(controller))
  app.post('/patients/:patientId/import-caderneta-family', controller.importFamily.bind(controller))
  app.get('/patients/:patientId/vaccine-schedule', controller.listSchedule.bind(controller))
  app.get('/patients/:patientId/development-milestones', controller.listMilestones.bind(controller))
}
