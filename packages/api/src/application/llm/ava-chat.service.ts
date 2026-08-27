import type { FamilySupportService } from '../family-support/family-support.service.js'
import type { AvaOrchestratorService } from './ava-orchestrator.service.js'
import type { AvaPatientContextService } from './ava-patient-context.service.js'
import type { AvaEntityContextService } from './ava-entity-context.service.js'
import type { AvaEntityPin } from './ava-entity-context.service.js'
import type { AvaOperationalContextService } from './ava-operational-context.service.js'
import type { AvaConversationService } from './ava-conversation.service.js'
import type { AvaDocumentContextService } from './ava-document-context.service.js'
import type { AvaSessionContextService } from './ava-session-context.service.js'
import type { AvaProposedActionService } from './ava-proposed-action.service.js'
import type { AppAccountRepository } from '../../domain/auth/app-account.repository.js'
import { caregiverFirstName } from '../../domain/llm/ava-personalization.js'
import type { AvaActivityEmitter } from '../../domain/llm/ava-activity.js'
import { emitAvaActivity } from '../../domain/llm/ava-activity.js'
import { runAvaContextTools } from '../../domain/llm/ava-tools.js'

export class AvaChatService {
  constructor(
    private readonly familySupport: FamilySupportService,
    private readonly patientContext: AvaPatientContextService,
    private readonly orchestrator: AvaOrchestratorService,
    private readonly entityContext?: AvaEntityContextService,
    private readonly operationalContext?: AvaOperationalContextService,
    private readonly accounts?: AppAccountRepository,
    private readonly conversations?: AvaConversationService,
    private readonly documentContext?: AvaDocumentContextService,
    private readonly sessionContext?: AvaSessionContextService,
    private readonly proposedActions?: AvaProposedActionService,
  ) {}

  async chat(
    input: {
      scopeId: string
      accountId?: string
      patientId: string
      message: string
      healthThreadId?: string
      conversationId?: string
      attachmentDocumentId?: string
      tier?: import('../../domain/llm/llm.types.js').LlmTier
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
      allowLlmDataSharing?: boolean
      entityPin?: AvaEntityPin
    },
    activityEmitter?: AvaActivityEmitter,
  ) {
    let conversationId = input.conversationId
    let serverHistory = input.history

    if (input.accountId && this.conversations) {
      const conv = await this.conversations.ensureConversation(input.accountId, {
        patientId: input.patientId,
        conversationId: input.conversationId,
        healthThreadId: input.healthThreadId,
        firstMessage: input.message,
      })
      conversationId = conv.id
      const loaded = await this.conversations.getMessages(input.accountId, conv.id)
      if (loaded) {
        serverHistory = loaded.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.content }))
      }
    }

    if (conversationId && input.entityPin && this.sessionContext) {
      await this.sessionContext.pin(conversationId, {
        pin: input.entityPin,
        patientId: input.patientId,
        source: 'accelerator',
      })
    }

    let compactPrompt = false
    if (conversationId && this.sessionContext) {
      const activePins = await this.sessionContext.listActive(conversationId)
      compactPrompt = activePins.length > 0
    }

    let attachmentBlock = ''
    if (input.attachmentDocumentId && this.documentContext) {
      emitAvaActivity(activityEmitter, 'context.attachment', 'context', 'start')
      try {
        attachmentBlock = await this.documentContext.buildAttachmentBlock(
          input.patientId,
          input.attachmentDocumentId,
        )
        emitAvaActivity(activityEmitter, 'context.attachment', 'context', 'done')
      } catch {
        emitAvaActivity(activityEmitter, 'context.attachment', 'context', 'skip')
        throw new Error('AVA_ATTACHMENT_INVALID')
      }
    }

    const { result: gathered, trace: contextTrace } = await runAvaContextTools(
      {
        loadPatientContext: async (patientId) => {
          const row = compactPrompt
            ? await this.patientContext.buildMinimalContextBlock(patientId)
            : await this.patientContext.buildContextBlock(patientId, { userMessage: input.message })
          return {
            block: row.block,
            clinicianLabel: row.clinicianLabel,
            ageCategory: row.ageCategory,
          }
        },
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

    let entityPinBlock = gathered.entityPinBlock
    if (conversationId && this.sessionContext) {
      const sessionBlock = await this.sessionContext.buildSessionPinsBlock(input.patientId, conversationId)
      if (sessionBlock) {
        entityPinBlock = [sessionBlock, entityPinBlock].filter(Boolean).join('\n\n')
      }
    }

    const orchestratorResult = await this.orchestrator.chat({
      ...input,
      history: serverHistory,
      conversationId,
      attachmentBlock,
      bundle: gathered.bundle,
      patientContextBlock: gathered.patientContextBlock,
      clinicianLabel: gathered.clinicianLabel,
      ageCategory: gathered.ageCategory,
      entityPinBlock,
      operationalBlock: gathered.operationalBlock,
      caregiverFirstName: caregiverFirst,
      quotaContext: { email: quotaEmail },
    }, activityEmitter)

    if (input.accountId && conversationId && this.conversations) {
      await this.conversations.persistTurn(input.accountId, {
        conversationId,
        userMessage: input.message,
        assistantMessage: orchestratorResult.reply,
        attachmentDocumentId: input.attachmentDocumentId,
        reflection: {
          revised: orchestratorResult.reflection.revised,
          satisfactory: orchestratorResult.reflection.satisfactory,
          severity: orchestratorResult.reflection.severity,
        },
      })
    }

    let proposedActions: import('../../domain/llm/ava-proposed-action.js').AvaProposedAction[] = []
    if (input.accountId && this.proposedActions) {
      const lastAssistant = serverHistory
        ?.filter((m) => m.role === 'assistant')
        .slice(-1)[0]?.content
      proposedActions = await this.proposedActions.detectProposals(
        input.accountId,
        input.patientId,
        input.message,
        { recentAssistantText: lastAssistant },
      )
    }

    return {
      ...orchestratorResult,
      conversationId,
      activityTrace: [...contextTrace, ...orchestratorResult.activityTrace],
      proposedActions,
    }
  }
}
