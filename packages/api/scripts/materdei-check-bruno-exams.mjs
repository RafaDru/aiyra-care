import pg from 'pg'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const r = await pool.query(
  'SELECT exam_type, notes FROM exams WHERE patient_id = $1 AND source = $2',
  ['30f2df7c-f043-44e8-a183-e6f6b49d2d71', 'mater_dei'],
)
console.log('total', r.rows.length)
for (const row of r.rows) {
  if (!row.notes?.includes('imageAvailable')) continue
  try {
    const nl = row.notes.indexOf('\n')
    const meta = JSON.parse(row.notes.slice(nl + 1))
    if (meta.imageAvailable) {
      console.log(row.exam_type.slice(0, 45), 'series:', meta.imageSeriesCount ?? 0, 'item:', meta.examOrderItemId)
    }
  } catch { /* ignore */ }
}
await pool.end()
