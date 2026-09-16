import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const { rows } = await pool.query(
  `SELECT provider, model, feature, cost_bucket, created_at
     FROM llm_usage_events
    WHERE cost_bucket = 'internal'
    ORDER BY created_at DESC
    LIMIT 20`,
)

console.log('=== ÚLTIMOS EVENTOS LLM INTERNO ===')
for (const r of rows) {
  console.log(`${r.created_at.toISOString()} | ${r.provider} | ${r.model} | ${r.feature}`)
}

// Eventos de hoje (2026-08-21)
const { rows: today } = await pool.query(
  `SELECT COUNT(*)::int AS n FROM llm_usage_events WHERE cost_bucket='internal' AND created_at::date = CURRENT_DATE`,
)
console.log(`\nEventos internos hoje: ${today[0].n}`)

await pool.end()