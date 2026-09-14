import { EMERGENCY_USER_KEYWORDS } from './ava-reflection.js'
import { EXAM_INTENT_RE, HYGIENE_USER_RE } from './ava-context-aggregate.js'

export type AvaIntentBucket =
  | 'exam'
  | 'vaccine'
  | 'medication'
  | 'sync_integration'
  | 'hygiene'
  | 'export_share'
  | 'emergency'
  | 'navigation'
  | 'general'

const VACCINE_INTENT_RE = /\b(vacinas?|vacinação|imuniza|carteira de vacina)\b/i
const MEDICATION_INTENT_RE = /\b(remédio|medicamento|dose|antibiótico|analgésico|suspensão|comprimido)\b/i
const SYNC_INTENT_RE = /\b(sincroniz|sync|convênio|unimed|amil|integra|portal|cartão)\b/i
const EXPORT_INTENT_RE = /\b(export|compartilh|pdf|resumo clínico|enviar para)\b/i
const NAVIGATION_INTENT_RE = /\b(onde (fica|acho|encontro)|qual aba|menu|configura|como faço para)\b/i

/** Classificação coarse do turno — sem armazenar texto do usuário. */
export function classifyAvaIntentBucket(message: string): AvaIntentBucket {
  const trimmed = message.trim()
  if (!trimmed) return 'general'
  if (EMERGENCY_USER_KEYWORDS.test(trimmed)) return 'emergency'
  if (HYGIENE_USER_RE.test(trimmed)) return 'hygiene'
  if (EXPORT_INTENT_RE.test(trimmed)) return 'export_share'
  if (SYNC_INTENT_RE.test(trimmed)) return 'sync_integration'
  if (EXAM_INTENT_RE.test(trimmed)) return 'exam'
  if (VACCINE_INTENT_RE.test(trimmed)) return 'vaccine'
  if (MEDICATION_INTENT_RE.test(trimmed)) return 'medication'
  if (NAVIGATION_INTENT_RE.test(trimmed)) return 'navigation'
  return 'general'
}

export function normalizeAvaErrorCode(raw: string): string {
  const msg = raw.trim()
  if (!msg) return 'UNKNOWN'
  if (msg.includes('LLM_QUOTA') || msg.includes('Franquia') || msg.includes('402')) {
    return 'LLM_QUOTA_EXCEEDED'
  }
  if (msg.includes('AVA_LLM_DISABLED')) return 'AVA_LLM_DISABLED'
  if (msg.includes('AVA_CONVERSATION')) return 'AVA_CONVERSATION_ERROR'
  if (msg.includes('AVA_ATTACHMENT')) return 'AVA_ATTACHMENT_ERROR'
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
    return 'NETWORK_ERROR'
  }
  if (msg.includes('timeout') || msg.includes('Timeout')) return 'TIMEOUT'
  return msg.slice(0, 64)
}
