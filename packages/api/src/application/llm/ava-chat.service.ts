import type { FamilySupportService } from '../family-support/family-support.service.js'
import type { AvaOrchestratorService } from './ava-orchestrator.service.js'
import type { AvaPatientContextService } from './ava-patient-context.service.js'
import type { AvaEntityContextService } from './ava-entity-context.service.js'
import type { AvaEntityPin } from './ava-entity-context.service.js'
import type { AvaOperationalContextService } from './ava-operational-context.service.js'
import type { AppAccountRepository } from '../../domain/auth/app-account.repository.js'
import { caregiverFirstName } from '../../domain/llm/ava-personalization.js'
import type { AvaActivityEmitter } from '../../domain/llm/ava-activity.js'
import { runAvaContextTools } from '../../domain/llm/ava-tools.js'

export class AvaChatService {
  constructor(
    private readonly familySupport: FamilySupportService,
    private readonly patientContext: AvaPatientContextService,
    private readonly orchestrator: AvaOrchestratorService,
    private readonly entityContext?: AvaEntityContextService,
    private readonly operationalContext?: AvaOperationalContextService,
    private readonly accounts?: AppAccountRepository,
  ) {}

  async chat(
    input: {
      scopeId: string
      accountId?: string
      patientId: string
      message: string
      healthThreadId?: string
      tier?: import('../../domain/llm/llm.types.js').LlmTier
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
      allowLlmDataSharing?: boolean
      entityPin?: AvaEntityPin
    },
    activityEmitter?: AvaActivityEmitter,
  ) {
    const { result: gathered, trace: contextTrace } = await runAvaContextTools(
      {
        loadPatientContext: (patientId) => this.patientContext.buildContextBlock(patientId),
        loadFamilyInsights: (patientId, healthThreadId) =>
          this.familySupport.buildInsights(patientId, { healthThreadId }),
        loadOperationalBlock: (patientId) =>
          this.operationalContext
            ? this.operationalContext.buildOperationalBlock(patientId)
            : Promise.resolve(''),
        loadEntityPinBlock: (patientId, pin) =>
          this.entityContext
            ? this.entityContext.buildPinBlock(patientId, pin)
            : Promise.reject(new Error('entity_context_unavailable')),
      },
      {
        patientId: input.patientId,
        healthThreadId: input.healthThreadId,
        message: input.message,
        entityPin: input.entityPin,
      },
      activityEmitter,
    )

    let caregiverFirst: string | null = null
    let quotaEmail: string | null = null
    if (input.accountId && this.accounts) {
      const account = await this.accounts.findById(input.accountId)
      caregiverFirst = caregiverFirstName(account?.displayName, account?.email)
      quotaEmail = account?.email ?? null
    }

    const orchestratorResult = await this.orchestrator.chat({
      ...input,
      bundle: gathered.bundle,
      patientContextBlock: gathered.patientContextBlock,
      clinicianLabel: gathered.clinicianLabel,
      ageCategory: gathered.ageCategory,
      entityPinBlock: gathered.entityPinBlock,
      operationalBlock: gathered.operationalBlock,
      caregiverFirstName: caregiverFirst,
      quotaContext: { email: quotaEmail },
    }, activityEmitter)

    return {
      ...orchestratorResult,
      activityTrace: [...contextTrace, ...orchestratorResult.activityTrace],
    }
  }
}
