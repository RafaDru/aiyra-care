import pg from 'pg'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const r = await pool.query(
  'SELECT id, exam_type, notes FROM exams WHERE patient_id = $1 AND exam_type LIKE $2',
  ['30f2df7c-f043-44e8-a183-e6f6b49d2d71', 'TC %'],
)
for (const row of r.rows) {
  const nl = row.notes?.indexOf('\n')
  let series = 0
  if (nl >= 0) {
    try { series = JSON.parse(row.notes.slice(nl + 1)).imageSeriesCount ?? 0 } catch { /* ignore */ }
  }
  if (!series) {
    console.log('DELETE', row.id, row.exam_type)
    await pool.query('DELETE FROM exams WHERE id = $1', [row.id])
  }
}
await pool.end()
