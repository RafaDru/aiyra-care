import type { FastifyInstance } from 'fastify'
import { PatientController } from './patient.controller.js'
import { PatientService } from '../../../application/patient/patient.service.js'
import { PatientContextService } from '../../../application/patient/patient-context.service.js'
import { InsurancePlanService } from '../../../application/insurance-plan/insurance-plan.service.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { AllergyPgRepository } from '../../persistence/allergy.pg.repository.js'
import { MedicationPgRepository } from '../../persistence/medication.pg.repository.js'
import { MedicalRecordPgRepository } from '../../persistence/medical-record.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { DocumentPgRepository } from '../../persistence/document.pg.repository.js'
import { AuthorizationPgRepository } from '../../persistence/authorization.pg.repository.js'
import { IntegrationLinkPgRepository } from '../../persistence/integration-link.pg.repository.js'
import { InsurancePlanPgRepository } from '../../persistence/insurance-plan.pg.repository.js'
import { PlanMembershipPgRepository } from '../../persistence/plan-membership.pg.repository.js'
import { HealthThreadPgRepository } from '../../persistence/health-thread.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { getLegalComplianceService } from '../legal-compliance/legal-compliance.routes.js'

export async function patientRoutes(app: FastifyInstance) {
  const repo = new PatientPgRepository(pgPool)
  const service = new PatientService(repo)
  const memberships = new PatientMembershipPgRepository(pgPool)
  const compliance = getLegalComplianceService()
  const contextService = new PatientContextService(
    pgPool,
    repo,
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
  const controller = new PatientController(service, memberships, contextService, compliance)

  app.post('/patients', controller.create.bind(controller))
  app.get('/patients', controller.findAll.bind(controller))
  app.get('/patients/:id/context', controller.getContext.bind(controller))
  app.get('/patients/:id/timeline', controller.getTimeline.bind(controller))
  app.get('/patients/:id/sync-completions/stream', controller.streamSyncCompletions.bind(controller))
  app.get('/patients/:id', controller.findById.bind(controller))
  app.patch('/patients/:id', controller.update.bind(controller))
  app.delete('/patients/:id', controller.delete.bind(controller))
}
