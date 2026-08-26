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
import { ExamResultItemPgRepository } from '../../persistence/exam-result-item.pg.repository.js'
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
import { LlmInternalBudgetPgRepository } from '../../persistence/llm-internal-budget.pg.repository.js'
import { LlmInternalCostService } from '../../../application/llm/llm-internal-cost.service.js'
import { AvaOperationalContextService } from '../../../application/llm/ava-operational-context.service.js'
import { AvaEntityContextService } from '../../../application/llm/ava-entity-context.service.js'
import { AvaConversationService } from '../../../application/llm/ava-conversation.service.js'
import { AvaDocumentContextService } from '../../../application/llm/ava-document-context.service.js'
import { AppAccountPgRepository } from '../../persistence/app-account.pg.repository.js'
import { IntegrationLinkPgRepository } from '../../persistence/integration-link.pg.repository.js'
import { ExamOrderPgRepository } from '../../persistence/exam-order.pg.repository.js'
import { AvaConversationPgRepository } from '../../persistence/ava-conversation.pg.repository.js'
import { DocumentPgRepository } from '../../persistence/document.pg.repository.js'
import { AvaController } from './ava.controller.js'
import { AvaConversationController } from './ava-conversation.controller.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { resolveHandwritingScopeId } from '../handwriting/handwriting-scope.js'

export async function avaRoutes(app: FastifyInstance) {
  const creditsRepo = new HandwritingCreditsPgRepository(pgPool)
  const handwritingCredits = new HandwritingCreditsService(creditsRepo)
  const llmQuota = new LlmQuotaService(
    new LlmUsagePgRepository(pgPool),
    creditsRepo,
    handwritingCredits,
    new AppAccountPgRepository(pgPool),
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
    new ExamResultItemPgRepository(pgPool),
  )
  const entityContext = new AvaEntityContextService(
    new ExamPgRepository(pgPool),
    new ExamOrderPgRepository(pgPool),
    new ExamResultItemPgRepository(pgPool),
  )
  const operationalContext = new AvaOperationalContextService(
    new IntegrationLinkPgRepository(pgPool),
    new ExamPgRepository(pgPool),
  )
  const conversationRepo = new AvaConversationPgRepository(pgPool)
  const conversations = new AvaConversationService(conversationRepo)
  const documentContext = new AvaDocumentContextService(
    new DocumentPgRepository(pgPool),
    pgPool,
  )
  const avaChat = new AvaChatService(
    familySupport,
    patientContext,
    orchestrator,
    entityContext,
    operationalContext,
    new AppAccountPgRepository(pgPool),
    conversations,
    documentContext,
  )
  const controller = new AvaController(avaChat)
  const conversationController = new AvaConversationController(conversations)

  app.get('/ava/conversations', conversationController.list.bind(conversationController))
  app.post('/ava/conversations', conversationController.create.bind(conversationController))
  app.get('/ava/conversations/:conversationId', conversationController.get.bind(conversationController))
  app.get('/ava/conversations/:conversationId/messages', conversationController.messages.bind(conversationController))

  app.post('/patients/:id/ava/chat', controller.chat.bind(controller))

  app.get('/llm/usage/quota', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const scopeId = resolveHandwritingScopeId(req)
    const quota = await llmQuota.getQuota(scopeId)
    return reply.send(quota)
  })

  // Observabilidade operacional INTERNA (custo nosso, não do cliente). Protegida por chave de ops.
  app.get('/llm/usage/internal', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const opsKey = process.env.LLM_INTERNAL_OBSERVABILITY_KEY?.trim()
    if (opsKey && req.headers['x-internal-ops-key'] !== opsKey) {
      return reply.code(403).send({ error: 'ops key required' })
    }
    const costService = new LlmInternalCostService(
      new LlmUsagePgRepository(pgPool),
      new LlmInternalBudgetPgRepository(pgPool),
    )
    const indicators = await costService.getIndicators()
    return reply.send(indicators)
  })
}
