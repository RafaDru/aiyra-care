import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const { rows: byMarker } = await pool.query(
  `SELECT marker_name, COUNT(*)::int AS n,
          MIN(collected_at)::date AS first_date, MAX(collected_at)::date AS last_date
     FROM exam_result_items eri
     JOIN patients p ON p.id = eri.patient_id
    WHERE p.name ILIKE '%Bruno%'
    GROUP BY marker_name ORDER BY n DESC`,
)

console.log('=== MARCADORES PERSISTIDOS (Bruno) ===')
let total = 0
for (const r of byMarker) {
  console.log(`${r.marker_name} | ${r.n}x | ${new Date(r.first_date).toISOString().slice(0, 10)} → ${new Date(r.last_date).toISOString().slice(0, 10)}`)
  total += r.n
}
console.log(`TOTAL: ${total}`)

// Duplicidade: mesmo marcador + mesma data coletada + mesmo valor
const { rows: dups } = await pool.query(
  `SELECT marker_name, display_value, collected_at::date AS day, COUNT(*)::int AS n
     FROM exam_result_items eri
     JOIN patients p ON p.id = eri.patient_id
    WHERE p.name ILIKE '%Bruno%'
    GROUP BY marker_name, display_value, collected_at::date
   HAVING COUNT(*) > 1 ORDER BY n DESC`,
)

console.log('\n=== POSSÍVEIS DUPLICATAS (mesmo marcador+valor+data) ===')
for (const r of dups) {
  console.log(`${r.marker_name} = ${r.display_value} @ ${r.day} -> ${r.n}x`)
}

await pool.end()