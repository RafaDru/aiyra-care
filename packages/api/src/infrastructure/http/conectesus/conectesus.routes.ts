import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { ConecteSUSSyncService } from '../../../application/conectesus/conectesus-sync.service.js'
import { ConecteSUSImportService } from '../../../application/conectesus/conectesus-import.service.js'
import { PatientService } from '../../../application/patient/patient.service.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { VaccineService } from '../../../application/vaccine/vaccine.service.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { ExamService } from '../../../application/exam/exam.service.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { PatientBirthDatePgResolver } from '../../persistence/hygiene.pg.repository.js'
import { CareReminderService } from '../../../application/care-reminder/care-reminder.service.js'
import { CareReminderPgRepository } from '../../persistence/care-reminder.pg.repository.js'
import { ConecteSUSController } from './conectesus.controller.js'

export async function conectesusRoutes(app: FastifyInstance) {
  const patients = new PatientService(new PatientPgRepository(pgPool))
  const birthDates = new PatientBirthDatePgResolver(pgPool)
  const vaccines = new VaccineService(new VaccinePgRepository(pgPool), birthDates)
  const exams = new ExamService(new ExamPgRepository(pgPool))
  const importService = new ConecteSUSImportService(patients, vaccines, exams)
  const careReminders = new CareReminderService(new CareReminderPgRepository(pgPool))
  const syncService = new ConecteSUSSyncService(pgPool, patients, importService, careReminders)
  const controller = new ConecteSUSController(syncService)

  app.post('/patients/:patientId/conectesus/sync', controller.sync.bind(controller))
}
