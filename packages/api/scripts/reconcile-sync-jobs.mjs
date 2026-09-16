/**
 * Normaliza sync_jobs órfãos (timeout, running inconsistente, sucesso com error legado).
 * Uso: cd packages/api && npm run reconcile:sync-jobs
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const timedOut = await pool.query(
  `UPDATE sync_jobs SET
    status = 'failed', step = 'error',
    message = 'Sincronização expirou (timeout)',
    error = 'Sincronização expirou (timeout)',
    finished_at = COALESCE(finished_at, NOW()), updated_at = NOW()
   WHERE status IN ('pending', 'running')
     AND started_at < NOW() - INTERVAL '30 minutes'`,
)

const inconsistent = await pool.query(
  `UPDATE sync_jobs SET
    status = 'failed', step = 'error',
    message = 'Sincronização interrompida',
    error = 'Job inconsistente (running com finished_at)',
    finished_at = COALESCE(finished_at, NOW()), updated_at = NOW()
   WHERE status IN ('pending', 'running') AND finished_at IS NOT NULL`,
)

const promoted = await pool.query(
  `UPDATE sync_jobs SET
    status = 'success',
    step = 'done',
    message = COALESCE(step_details->'done'->>'message', message),
    error = NULL,
    finished_at = COALESCE(finished_at, NOW()),
    updated_at = NOW()
   WHERE status IN ('pending', 'running')
     AND (
       step_details->'done'->>'status' = 'success'
       OR (result IS NOT NULL AND step = 'importing')
     )`,
)

const clearedErrors = await pool.query(
  `UPDATE sync_jobs SET error = NULL, updated_at = NOW()
   WHERE status = 'success' AND error IS NOT NULL`,
)

console.log('sync_jobs reconcile:', {
  timedOut: timedOut.rowCount ?? 0,
  inconsistent: inconsistent.rowCount ?? 0,
  promoted: promoted.rowCount ?? 0,
  clearedSuccessErrors: clearedErrors.rowCount ?? 0,
})

const running = await pool.query(
  `SELECT id, portal_type, status, step, message, started_at
   FROM sync_jobs WHERE status IN ('pending', 'running')
   ORDER BY started_at DESC LIMIT 10`,
)
console.log('still active:', running.rows)

await pool.end()
