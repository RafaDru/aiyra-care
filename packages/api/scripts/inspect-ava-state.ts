import { config } from 'dotenv'
import { Pool } from 'pg'

config({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') })

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const patients = await pgPool.query(
  `SELECT p.id, p.name, pm.role
   FROM patients p
   LEFT JOIN patient_memberships pm ON pm.patient_id = p.id
   ORDER BY p.name`,
)
console.log('=== patients (name order = Ava fallback) ===')
for (const row of patients.rows) {
  console.log(row.name, row.role ?? 'no membership', row.id)
}

const usage = await pgPool.query(
  `SELECT created_at, feature, patient_id, tokens_in, tokens_out, tokens_total, provider, model, metadata
   FROM llm_usage_events
   WHERE feature IN ('ava_chat', 'ava_reflection')
   ORDER BY created_at DESC
   LIMIT 8`,
)
console.log('\n=== recent ava llm events ===')
for (const row of usage.rows) {
  const p = patients.rows.find((x) => x.id === row.patient_id)
  console.log(
    row.created_at,
    p?.name ?? row.patient_id,
    row.tokens_total,
    row.feature,
    row.metadata ? JSON.stringify(row.metadata).slice(0, 120) : '',
  )
}

const quota = await pgPool.query(
  `SELECT scope_id, monthly_period, monthly_tokens_used FROM llm_usage_accounts LIMIT 3`,
)
console.log('\n=== llm_usage_accounts ===', quota.rows)

const credits = await pgPool.query(
  `SELECT scope_id, monthly_free_allowance, monthly_free_used, package_credits FROM handwriting_credit_accounts LIMIT 3`,
)
console.log('=== handwriting credits ===', credits.rows)

await pgPool.end()
