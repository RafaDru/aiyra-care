import type { ProductEventService } from '../telemetry/product-event.service.js'
import { trackServerProductEvent } from '../telemetry/server-product-event.js'
import { classifyAvaIntentBucket, normalizeAvaErrorCode } from '../../domain/llm/ava-intent-bucket.js'
import { reflectionNeedsFullContext, type AvaReflectionOutcome } from '../../domain/llm/ava-reflection.js'

export interface AvaTurnTelemetryResult {
  conversationId?: string
  proposedActions?: { type: string }[]
  provider: string
  tier: string
  insightsIncluded: number
  usage?: { tokensTotal: number } | null
  reflection: {
    satisfactory: boolean
    revised: boolean
    severity: string
    issues?: string[]
    attempts?: number
    steps?: string[]
  }
}

function asReflectionOutcome(
  reflection: AvaTurnTelemetryResult['reflection'],
): AvaReflectionOutcome {
  return {
    satisfactory: reflection.satisfactory,
    revised: reflection.revised,
    severity: reflection.severity === 'critical' || reflection.severity === 'minor'
      ? reflection.severity
      : 'ok',
    issues: reflection.issues ?? [],
    attempts: reflection.attempts ?? 0,
    steps: reflection.steps ?? [],
  }
}

export async function trackAvaTurnRecorded(
  productEvents: ProductEventService | undefined,
  input: {
    accountId: string | null
    patientId: string
    userMessage: string
    conversationId?: string
    proposedActionCount: number
    hasAttachment: boolean
    hasEntityPin: boolean
  },
  result: AvaTurnTelemetryResult,
): Promise<void> {
  await trackServerProductEvent(productEvents, input.accountId, {
    eventName: 'ava_turn_recorded',
    patientId: input.patientId,
    properties: {
      conversation_id: input.conversationId,
      intent_bucket: classifyAvaIntentBucket(input.userMessage),
      reflection_satisfactory: result.reflection.satisfactory,
      reflection_revised: result.reflection.revised,
      reflection_severity: result.reflection.severity,
      needs_full_context: reflectionNeedsFullContext(asReflectionOutcome(result.reflection)),
      proposed_action_count: input.proposedActionCount,
      insights_included: result.insightsIncluded,
      tokens_total: result.usage?.tokensTotal ?? 0,
      provider: result.provider,
      tier: result.tier,
      has_attachment: input.hasAttachment,
      has_entity_pin: input.hasEntityPin,
    },
  })
}

export async function trackAvaTurnFailed(
  productEvents: ProductEventService | undefined,
  input: {
    accountId: string | null
    patientId: string
    userMessage: string
    conversationId?: string
    errorMessage: string
  },
): Promise<void> {
  const code = normalizeAvaErrorCode(input.errorMessage)
  const eventName = code === 'LLM_QUOTA_EXCEEDED' ? 'ava_quota_blocked' : 'ava_chat_failed'
  await trackServerProductEvent(productEvents, input.accountId, {
    eventName,
    patientId: input.patientId,
    properties: {
      conversation_id: input.conversationId,
      intent_bucket: classifyAvaIntentBucket(input.userMessage),
      error_code: code,
      source: 'server',
    },
  })
}
