/** Falhas mínimas em 24h para abrir incidente (mesmo integration_link). */
export const SYNC_ESCALATION_MIN_FAILURES_24H = Number(
  process.env.SYNC_ESCALATION_MIN_FAILURES ?? '3',
)

/** Cooldown entre notificações do mesmo incidente aberto. */
export const SYNC_ESCALATION_COOLDOWN_MS = Number(
  process.env.SYNC_ESCALATION_COOLDOWN_MS ?? String(6 * 60 * 60 * 1000),
)

export function shouldEscalateSyncFailures(failedCount24h: number): boolean {
  return failedCount24h >= SYNC_ESCALATION_MIN_FAILURES_24H
}

export function shouldNotifyEscalation(
  lastNotifiedAt: Date | string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!lastNotifiedAt) return true
  const ts = lastNotifiedAt instanceof Date
    ? lastNotifiedAt.getTime()
    : new Date(lastNotifiedAt).getTime()
  if (!Number.isFinite(ts)) return true
  return nowMs - ts >= SYNC_ESCALATION_COOLDOWN_MS
}

export const SYNC_ESCALATION_MESSAGES = {
  open: 'A sincronização de um convênio apresentou falhas repetidas. Abra o AiyraCare em Integrações para verificar.',
  resolved: 'A sincronização do convênio voltou ao normal.',
} as const
