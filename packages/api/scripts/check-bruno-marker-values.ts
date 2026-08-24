import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const { rows } = await pool.query(
  `SELECT marker_name, display_value, unit, collected_at::date AS day, status
     FROM exam_result_items eri
     JOIN patients p ON p.id = eri.patient_id
    WHERE p.name ILIKE '%Bruno%'
    ORDER BY collected_at, marker_name`,
)

console.log('=== MARCADORES DO BRUNO (pós-limpeza) ===')
for (const r of rows) {
  console.log(`${new Date(r.day).toISOString().slice(0, 10)} | ${r.marker_name} = ${r.display_value} ${r.unit ?? ''} [${r.status}]`)
}
await pool.end()