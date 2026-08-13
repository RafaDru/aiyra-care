import type { HealthThreadKind } from '../../lib/api.types.js'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'

export const HEALTH_THREAD_KIND_META: Record<
  HealthThreadKind,
  { label: string; shortLabel: string; color: string }
> = {
  acompanhamento: { label: 'Plano de acompanhamento', shortLabel: 'Acompanhamento', color: '#64748B' },
  task: { label: 'Plano de acompanhamento', shortLabel: 'Acompanhamento', color: '#64748B' },
  investigation: { label: 'Investigação', shortLabel: 'Investigação', color: AIYRACARE_TOKENS.colorPrimary },
  hypothesis: { label: 'Hipótese', shortLabel: 'Hipótese', color: '#D97706' },
  episode: { label: 'Episódio', shortLabel: 'Episódio', color: AIYRACARE_TOKENS.colorError },
}

export function healthThreadKindLabel(kind: HealthThreadKind | string, short = false): string {
  const normalized = kind === 'task' ? 'acompanhamento' : kind
  const meta = HEALTH_THREAD_KIND_META[normalized as HealthThreadKind]
  if (!meta) return kind
  return short ? meta.shortLabel : meta.label
}

export const HEALTH_THREAD_STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  active: 'Ativo',
  paused: 'Pausado',
}
