import type { FastifyInstance, FastifyReply } from 'fastify'
import { AvaChatService } from '../../../application/llm/ava-chat.service.js'
import { AvaOrchestratorService } from '../../../application/llm/ava-orchestrator.service.js'
import { AvaPatientContextService } from '../../../application/llm/ava-patient-context.service.js'
import { LlmQuotaService } from '../../../application/llm/llm-quota.service.js'
import { FamilySupportService } from '../../../application/family-support/family-support.service.js'
import { HandwritingCreditsService } from '../../../application/handwriting/handwriting-credits.service.js'
import { LlmRouter } from '../../llm/llm-router.js'
import { LlmUsagePgRepository } from '../../persistence/llm-usage.pg.repository.js'
import { HandwritingCreditsPgRepository } from '../../persistence/handwriting-credits.pg.repository.js'
import { MeasurementPgRepository } from '../../persistence/measurement.pg.repository.js'
import { AllergyPgRepository } from '../../persistence/allergy.pg.repository.js'
import { MedicationPgRepository } from '../../persistence/medication.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { MedicalRecordPgRepository } from '../../persistence/medical-record.pg.repository.js'
import { DiagnosisPgRepository } from '../../persistence/diagnosis.pg.repository.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { AuthorizationPgRepository } from '../../persistence/authorization.pg.repository.js'
import { HealthThreadPgRepository } from '../../persistence/health-thread.pg.repository.js'
import { CareReminderPgRepository } from '../../persistence/care-reminder.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { AvaController } from './ava.controller.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { resolveHandwritingScopeId } from '../handwriting/handwriting-scope.js'

export async function avaRoutes(app: FastifyInstance) {
  const creditsRepo = new HandwritingCreditsPgRepository(pgPool)
  const handwritingCredits = new HandwritingCreditsService(creditsRepo)
  const llmQuota = new LlmQuotaService(
    new LlmUsagePgRepository(pgPool),
    creditsRepo,
    handwritingCredits,
  )
  const familySupport = new FamilySupportService(
    new MeasurementPgRepository(pgPool),
    new AllergyPgRepository(pgPool),
    new MedicationPgRepository(pgPool),
  )
  const router = new LlmRouter()
  const orchestrator = new AvaOrchestratorService(llmQuota, router)
  const patientContext = new AvaPatientContextService(
    new PatientPgRepository(pgPool),
    new ExamPgRepository(pgPool),
    new AllergyPgRepository(pgPool),
    new MedicationPgRepository(pgPool),
    new MedicalRecordPgRepository(pgPool),
    new DiagnosisPgRepository(pgPool),
    new VaccinePgRepository(pgPool),
    new AuthorizationPgRepository(pgPool),
    new HealthThreadPgRepository(pgPool),
    new CareReminderPgRepository(pgPool),
    new MeasurementPgRepository(pgPool),
  )
  const avaChat = new AvaChatService(familySupport, patientContext, orchestrator)
  const controller = new AvaController(avaChat)

  app.post('/patients/:id/ava/chat', controller.chat.bind(controller))

  app.get('/llm/usage/quota', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const scopeId = resolveHandwritingScopeId(req)
    const quota = await llmQuota.getQuota(scopeId)
    return reply.send(quota)
  })
}
