/** Rafael cadence: full triage collection + dispatch batch (ops-console / dispatch worker). */
export function triageBatchIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.CH_INCIDENT_TRIAGE_BATCH_INTERVAL_MS?.trim()
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function defectCorrectionBatchIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.CH_DEFECT_CORRECTION_BATCH_INTERVAL_MS?.trim()
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function defectCorrectionBatchAutoStartFix(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CH_DEFECT_CORRECTION_BATCH_AUTO_START_FIX === '1'
}

/** Após callback triagem (`new_defect` / `link_defect` em DEF `open`|`in_fix`). Default off. */
export function autoStartFixOnTriage(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CH_AUTO_START_FIX_ON_TRIAGE === '1'
}

export function defectCorrectionBatchStartFixLimit(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.CH_DEFECT_CORRECTION_BATCH_START_FIX_LIMIT?.trim()
  const n = raw ? Number(raw) : 5
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 50) : 5
}
