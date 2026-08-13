import type { FastifyInstance } from 'fastify'
import { ClinicalExportShareService } from '../../../application/patient/clinical-export-share.service.js'
import { PatientContextService } from '../../../application/patient/patient-context.service.js'
import { PatientService } from '../../../application/patient/patient.service.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { AllergyPgRepository } from '../../persistence/allergy.pg.repository.js'
import { MedicationPgRepository } from '../../persistence/medication.pg.repository.js'
import { MedicalRecordPgRepository } from '../../persistence/medical-record.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { DocumentPgRepository } from '../../persistence/document.pg.repository.js'
import { AuthorizationPgRepository } from '../../persistence/authorization.pg.repository.js'
import { IntegrationLinkPgRepository } from '../../persistence/integration-link.pg.repository.js'
import { InsurancePlanService } from '../../../application/insurance-plan/insurance-plan.service.js'
import { InsurancePlanPgRepository } from '../../persistence/insurance-plan.pg.repository.js'
import { PlanMembershipPgRepository } from '../../persistence/plan-membership.pg.repository.js'
import { HealthThreadPgRepository } from '../../persistence/health-thread.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { ClinicalExportController } from './clinical-export.controller.js'

export async function clinicalExportRoutes(app: FastifyInstance) {
  const contextService = new PatientContextService(
    pgPool,
    new PatientPgRepository(pgPool),
    new AllergyPgRepository(pgPool),
    new MedicationPgRepository(pgPool),
    new MedicalRecordPgRepository(pgPool),
    new ExamPgRepository(pgPool),
    new VaccinePgRepository(pgPool),
    new DocumentPgRepository(pgPool),
    new AuthorizationPgRepository(pgPool),
    new IntegrationLinkPgRepository(pgPool),
    new InsurancePlanService(
      new InsurancePlanPgRepository(pgPool),
      new PlanMembershipPgRepository(pgPool),
    ),
    new HealthThreadPgRepository(pgPool),
  )
  const shareService = new ClinicalExportShareService(pgPool, contextService)
  const patientService = new PatientService(new PatientPgRepository(pgPool))
  const memberships = new PatientMembershipPgRepository(pgPool)
  const controller = new ClinicalExportController(contextService, shareService, patientService, memberships)

  app.get('/clinical-export/share/:token', controller.getSharedExport.bind(controller))
  app.get('/patients/:id/clinical-export', controller.getExport.bind(controller))
  app.post('/patients/:id/clinical-export/shares', controller.createShare.bind(controller))
}
