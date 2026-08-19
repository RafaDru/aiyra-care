import type { FamilySupportService } from '../family-support/family-support.service.js'
import type { AvaOrchestratorService } from './ava-orchestrator.service.js'
import type { AvaPatientContextService } from './ava-patient-context.service.js'

export class AvaChatService {
  constructor(
    private readonly familySupport: FamilySupportService,
    private readonly patientContext: AvaPatientContextService,
    private readonly orchestrator: AvaOrchestratorService,
  ) {}

  async chat(input: {
    scopeId: string
    accountId?: string
    patientId: string
    message: string
    healthThreadId?: string
    tier?: import('../../domain/llm/llm.types.js').LlmTier
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    allowLlmDataSharing?: boolean
  }) {
    const bundle = await this.familySupport.buildInsights(input.patientId, {
      healthThreadId: input.healthThreadId,
    })
    const ctx = await this.patientContext.buildContextBlock(input.patientId)
    return this.orchestrator.chat({
      ...input,
      bundle,
      patientContextBlock: ctx.block,
      clinicianLabel: ctx.clinicianLabel,
      ageCategory: ctx.ageCategory,
    })
  }
}
