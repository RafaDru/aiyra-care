import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const pid = 'f3cc72fd-f11c-419e-ac82-3ae45bd313ce'
const CANONICAL = 'eb177cfb-4ee7-4041-bec1-1427e9971a6d'
const REMOVE = [
  '5ef586be-7ad3-4526-ab9a-6b707fecd532',
  'fa84c26b-1261-4b26-a6a3-f340f19b1c3f',
  '16b7977c-c81d-4769-8b67-a8fa628faab6',
  '3b800378-6e18-49ec-9b28-e8062c3c2db7',
  '2225d436-0db3-430a-a53a-9ca0f432055a',
]

for (const id of REMOVE) {
  await pool.query(`DELETE FROM measurement_observations WHERE source_ref = $1`, [`exam:${id}`])
  await pool.query(
    `DELETE FROM hygiene_candidates WHERE entity_id_a = $1 OR entity_id_b = $1`,
    [id],
  )
  const del = await pool.query(`DELETE FROM exams WHERE id = $1 AND patient_id = $2`, [id, pid])
  console.log(`Deleted exam ${id}: ${del.rowCount} row(s)`)
}

const { rows } = await pool.query(
  `SELECT id, exam_type, exam_date::date, source, result_summary
   FROM exams WHERE patient_id = $1 AND exam_date::date = '2021-04-11'
     AND exam_type ILIKE '%sars%'`,
  [pid],
)
console.log('Remaining:', rows)

await pool.end()
