import type pg from 'pg'

export async function runHygieneScanBatch(pool: pg.Pool) {
  const { runHygieneScanAll } = await import('../../api/src/application/hygiene/hygiene-scan.helper.js')
  return runHygieneScanAll(pool)
}
