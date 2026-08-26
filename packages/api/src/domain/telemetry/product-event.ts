export const PRODUCT_EVENT_NAMES = [
  'ava_chat_started',
  'ava_chat_completed',
  'ava_chat_failed',
  'ava_quota_blocked',
  'ava_context_pin',
  'ava_context_unpin',
  'ava_patient_switch_hook',
  'ava_proposed_action_executed',
  'sync_job_terminal',
  'billing_checkout_started',
  'billing_checkout_completed',
  'hygiene_prompt_shown',
  'hygiene_resolved',
  'onboarding_step',
] as const

export type ProductEventName = typeof PRODUCT_EVENT_NAMES[number]

export const PRODUCT_EVENT_NAME_SET = new Set<string>(PRODUCT_EVENT_NAMES)

/** Chaves permitidas em properties — sem texto clínico ou credenciais. */
export const PRODUCT_EVENT_PROPERTY_KEYS = new Set([
  'hook',
  'accepted',
  'duration_ms',
  'error_code',
  'conversation_id',
  'portal_type',
  'job_id',
  'status',
  'mode',
  'action_type',
  'pin_type',
  'source',
  'entity_type',
  'skipped',
  'reason',
  'tier',
  'provider',
  'tokens_total',
  'step',
  'decision',
  'event_count',
])

const FORBIDDEN_PROPERTY_KEY = /message|text|content|password|token|ocr|reply|body|prompt|credential|secret/i

export interface ProductEventInput {
  eventName: ProductEventName
  sessionId?: string
  route?: string
  patientId?: string
  properties?: Record<string, unknown>
}

export interface ProductEventRecord {
  id: string
  accountId: string | null
  sessionId: string | null
  eventName: ProductEventName
  route: string | null
  patientId: string | null
  properties: Record<string, unknown>
  createdAt: Date
}

export function sanitizeProductEventProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!properties) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (FORBIDDEN_PROPERTY_KEY.test(key)) continue
    if (!PRODUCT_EVENT_PROPERTY_KEYS.has(key)) continue
    if (value === null || value === undefined) continue
    if (typeof value === 'string') {
      if (value.length > 128) continue
      if (FORBIDDEN_PROPERTY_KEY.test(value)) continue
      out[key] = value
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value
      continue
    }
    if (typeof value === 'boolean') {
      out[key] = value
    }
  }
  return out
}
