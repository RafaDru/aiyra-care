/** Alinhado a `evaluateOpsAlerts` / env OPS_PROBE_* na API. */
export const OPS_PROBE_API_SLOW_MS = 3000
export const OPS_PROBE_PG_SLOW_MS = 500

export const SYNC_FAIL_RATE_WARN_PCT = 40
export const SYNC_FAIL_RATE_CRITICAL_PCT = 70

export function probeLatencyTone(ok: boolean, latencyMs: number, slowMs: number): 'success' | 'warning' | 'error' {
  if (!ok) return 'error'
  if (latencyMs >= slowMs) return 'warning'
  return 'success'
}
