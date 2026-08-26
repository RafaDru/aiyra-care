/** Eventos de atividade visíveis na UI — sem chain-of-thought bruto. */
export type AvaActivityKind = 'context' | 'tool' | 'llm' | 'reflection'

export type AvaActivityStatus = 'start' | 'done' | 'skip'

export type AvaActivityCode =
  | 'context.patient_record'
  | 'context.family_alerts'
  | 'context.operational'
  | 'context.entity_pin'
  | 'llm.initial_reply'
  | 'reflection.rules_check'
  | 'reflection.rules_ok'
  | 'reflection.quality_critique'
  | 'reflection.critique_invalid'
  | 'reflection.direct_revision'
  | 'reflection.revision'

export interface AvaActivityEvent {
  code: AvaActivityCode
  kind: AvaActivityKind
  status: AvaActivityStatus
  /** Texto curto para UI (PT). */
  label: string
  ts: number
}

export const AVA_ACTIVITY_LABELS: Record<AvaActivityCode, string> = {
  'context.patient_record': 'Consultando prontuário',
  'context.family_alerts': 'Verificando alertas automáticos',
  'context.operational': 'Checando integrações e navegação',
  'context.entity_pin': 'Focando registro selecionado',
  'llm.initial_reply': 'Organizando resposta',
  'reflection.rules_check': 'Verificação de segurança',
  'reflection.rules_ok': 'Regras de segurança ok',
  'reflection.quality_critique': 'Crítica de qualidade',
  'reflection.critique_invalid': 'Crítica indisponível — mantendo resposta',
  'reflection.direct_revision': 'Regras exigem revisão',
  'reflection.revision': 'Revisando resposta',
}

export type AvaActivityEmitter = (event: AvaActivityEvent) => void

export function emitAvaActivity(
  emitter: AvaActivityEmitter | undefined,
  code: AvaActivityCode,
  kind: AvaActivityKind,
  status: AvaActivityStatus,
): AvaActivityEvent {
  const event: AvaActivityEvent = {
    code,
    kind,
    status,
    label: AVA_ACTIVITY_LABELS[code],
    ts: Date.now(),
  }
  emitter?.(event)
  return event
}

/** Mapeia passos internos do orchestrator → códigos de atividade. */
export function mapOrchestratorStepToActivity(step: string): AvaActivityCode | null {
  const map: Record<string, AvaActivityCode> = {
    'resposta inicial': 'llm.initial_reply',
    'verificação por regras ok': 'reflection.rules_ok',
    'crítica de qualidade': 'reflection.quality_critique',
    'crítica LLM inválida — mantida resposta': 'reflection.critique_invalid',
    'regras detectaram problemas — revisão direta': 'reflection.direct_revision',
    'revisão da resposta': 'reflection.revision',
  }
  return map[step] ?? null
}
