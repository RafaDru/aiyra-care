/**
 * Gate pré-promote: health API + PG; falha se degradado.
 * Uso: npm run staging:probe-gate (API deve estar up)
 */
import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const API_BASE = (process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '')
const API_SLOW_MS = Number(process.env.OPS_PROBE_API_SLOW_MS ?? '3000')
const PG_SLOW_MS = Number(process.env.OPS_PROBE_PG_SLOW_MS ?? '500')

async function probeApi() {
  const start = Date.now()
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(15_000) })
    return { ok: res.ok, latencyMs: Date.now() - start, status: res.status }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const startPg = Date.now()
let pgOk = false
try {
  const c = await pool.connect()
  await c.query('SELECT 1')
  c.release()
  pgOk = true
} catch {
  pgOk = false
}
const pgLatency = Date.now() - startPg
await pool.end()

const api = await probeApi()
const degraded =
  !api.ok ||
  !pgOk ||
  api.latencyMs >= API_SLOW_MS ||
  pgLatency >= PG_SLOW_MS

if (degraded) {
  console.error('staging-probe-gate FAILED')
  console.error(JSON.stringify({ api, postgres: { ok: pgOk, latencyMs: pgLatency } }, null, 2))
  process.exit(1)
}

console.log('staging-probe-gate OK')
