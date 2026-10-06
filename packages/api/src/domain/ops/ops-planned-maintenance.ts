/** When true, suppress auto-INC from telemetry bridge and API 5xx hook (ingest still logs). */
export function isOpsPlannedMaintenanceActive(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.OPS_PLANNED_MAINTENANCE?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

/** Bridge client_errors + API 5xx auto-INC only (decisão 7A: ops_alert continua com tag). */
export function shouldSuppressAutoIncDuringPlannedMaintenance(
  trigger: 'auto' | 'manual',
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return trigger === 'auto' && isOpsPlannedMaintenanceActive(env)
}
