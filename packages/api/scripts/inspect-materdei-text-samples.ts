import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

async function inspectMaterDeiTexts() {
  const { rows } = await pool.query<{
    id: string
    original_filename: string
    extracted_text: string
  }>(`
    SELECT d.id, d.original_filename, d.extracted_text
      FROM documents d
      JOIN patients p ON p.id = d.patient_id
     WHERE p.name ILIKE '%Bruno%'
       AND d.extracted_text IS NOT NULL
       AND length(d.extracted_text) > 50
     LIMIT 10
  `)

  console.log(`=== INSPEÇÃO DE TEXTOS MATER DEI DA BASE (${rows.length} amostras) ===\n`)

  for (const doc of rows) {
    console.log(`================ FILE: ${doc.original_filename} ================`)
    console.log(doc.extracted_text.slice(0, 1200))
    console.log('\n--------------------------------------------------------------\n')
  }

  await pool.end()
}

inspectMaterDeiTexts().catch(console.error)
