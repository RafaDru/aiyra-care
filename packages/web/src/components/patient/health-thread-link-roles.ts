export type HealthThreadLinkRole =
  | 'ordered'
  | 'scheduled'
  | 'result'
  | 'related'
  | 'blocked_by'

export const LINK_ROLE_META: Record<
  HealthThreadLinkRole,
  { label: string; hint: string; example: string }
> = {
  related: {
    label: 'Relacionado',
    hint: 'Faz parte desta história, sem indicar um passo específico.',
    example: 'Consulta do check-up com a médica da família.',
  },
  ordered: {
    label: 'Pedido / solicitado',
    hint: 'Foi solicitado neste contexto, antes de agendar ou autorizar.',
    example: 'Exame pedido na consulta; autorização do pedido de exame.',
  },
  scheduled: {
    label: 'Agendado',
    hint: 'Está marcado para uma data futura nesta trilha.',
    example: 'Consulta ou exame já com data agendada.',
  },
  result: {
    label: 'Resultado',
    hint: 'É o desfecho de algo que veio antes.',
    example: 'Resultado de exame após o pedido e a autorização.',
  },
  blocked_by: {
    label: 'Bloqueio',
    hint: 'Impede ou atrasa o próximo passo.',
    example: 'Pendência que segura a autorização ou o agendamento.',
  },
}

export const LINK_ROLE_OPTIONS: HealthThreadLinkRole[] = [
  'related',
  'ordered',
  'scheduled',
  'result',
  'blocked_by',
]

export function defaultLinkRole(entityType: string): HealthThreadLinkRole {
  switch (entityType) {
    case 'authorization':
    case 'medication':
    case 'exam':
      return 'ordered'
    case 'medical_record':
    case 'vaccine':
    case 'document':
      return 'related'
    default:
      return 'related'
  }
}

export function linkRoleSelectOptions(entityType: string) {
  const roles: HealthThreadLinkRole[] =
    entityType === 'authorization' || entityType === 'medication'
      ? ['related', 'ordered', 'scheduled', 'blocked_by']
      : entityType === 'exam'
        ? ['related', 'ordered', 'scheduled', 'result', 'blocked_by']
        : LINK_ROLE_OPTIONS

  return roles.map((value) => ({
    value,
    label: LINK_ROLE_META[value].label,
  }))
}

export function linkRoleHint(role: HealthThreadLinkRole): string {
  const meta = LINK_ROLE_META[role]
  return `${meta.hint} Ex.: ${meta.example}`
}

export const ENTITY_TYPE_LABEL: Record<string, string> = {
  exam: 'Exame',
  medical_record: 'Consulta',
  authorization: 'Autorização',
  medication: 'Medicamento',
  vaccine: 'Vacina',
  document: 'Documento',
  diagnosis: 'Diagnóstico',
  allergy: 'Alergia',
}
