/** When true, suppress auto-INC from telemetry bridge and API 5xx hook (ingest still logs). */
export function isOpsPlannedMaintenanceActive(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.OPS_PLANNED_MAINTENANCE?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

/** Auto ops_alert INC + dispatch; manual support reports and manual ops triage stay enabled. */
export function shouldSuppressAutoIncDuringPlannedMaintenance(
  trigger: 'auto' | 'manual',
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return trigger === 'auto' && isOpsPlannedMaintenanceActive(env)
}
