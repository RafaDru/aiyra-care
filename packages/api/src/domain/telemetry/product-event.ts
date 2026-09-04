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
  'sync_job_started',
  'billing_checkout_started',
  'billing_checkout_completed',
  'hygiene_prompt_shown',
  'hygiene_resolved',
  'onboarding_step',
  'landing_page_view',
  'landing_cta_click',
  'ops_worker_tick',
  'stripe_webhook_rejected',
  'sync_escalation_opened',
  'sync_escalation_resolved',
  'family_invite_created',
  'family_invite_accepted',
  'family_invite_revoked',
  'family_invite_failed',
  'patient_access_revoked',
  'compliance_accepted',
  'compliance_gate_redirect',
  'notification_optin_changed',
  'app_screen_viewed',
  'support_report_submitted',
] as const

export type ProductEventName = typeof PRODUCT_EVENT_NAMES[number]

export const PUBLIC_LANDING_EVENT_NAMES = new Set<ProductEventName>([
  'landing_page_view',
  'landing_cta_click',
])

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
  'package_id',
  'checkout_kind',
  'section',
  'cta_target',
  'kind',
  'stripe_event_type',
  'incident_id',
  'feature_key',
  'enabled',
  'patient_count',
  'access_level',
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
