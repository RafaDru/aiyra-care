import pg from 'pg'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const r = await pool.query(
  `SELECT id, exam_type, notes FROM exams WHERE patient_id = $1 AND exam_type LIKE 'TC%' ORDER BY exam_type, created_at`,
  ['30f2df7c-f043-44e8-a183-e6f6b49d2d71'],
)
for (const row of r.rows) {
  const nl = row.notes?.indexOf('\n')
  const meta = nl >= 0 ? JSON.parse(row.notes.slice(nl + 1)) : {}
  console.log(row.id.slice(0, 8), row.exam_type, 'series:', meta.imageSeriesCount, 'docs:', meta.imageDocumentIds?.length ?? 0, 'item:', meta.examOrderItemId)
}
await pool.end()
