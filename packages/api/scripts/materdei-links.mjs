import pg from 'pg'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const r = await pool.query(
  'SELECT id, patient_id FROM integration_links WHERE portal_type = $1 AND active = true',
  ['mater_dei'],
)
for (const row of r.rows) console.log(row.id, row.patient_id)
await pool.end()
