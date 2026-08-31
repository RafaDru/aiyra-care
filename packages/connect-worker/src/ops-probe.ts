import type pg from 'pg'

export async function runOpsProbeCheck(pool: pg.Pool) {
  const { runOpsProbe } = await import('../../api/src/application/ops/ops-probe.service.js')
  return runOpsProbe(pool)
}
