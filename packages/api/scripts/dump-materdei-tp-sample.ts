import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GcsFileStorage, isGcsStorageConfigured } from '../src/infrastructure/storage/gcs.storage.js'
import { extractReportPdfText } from '../src/infrastructure/scraper/exam-pdf-text.helper.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GCP_SERVICE_ACCOUNT_KEY) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GCP_SERVICE_ACCOUNT_KEY
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(root, process.env.GOOGLE_APPLICATION_CREDENTIALS || 'openhealth-503119-c7baed555716.json')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

async function main() {
  const { rows: docs } = await pool.query<{ original_filename: string; storage_path: string; mime_type: string }>(
    `SELECT d.original_filename, d.storage_path, d.mime_type
       FROM documents d
       JOIN patients p ON p.id = d.patient_id
      WHERE p.name ILIKE '%Bruno%'
        AND d.original_filename ILIKE '%TP_-_TIREOESTIMULANTE%'`,
  )

  if (!isGcsStorageConfigured()) {
    console.error('GCS não configurado')
    await pool.end()
    return
  }

  const storage = new GcsFileStorage()
  for (const doc of docs) {
    console.log(`📄 ${doc.original_filename}`)
    const file = await storage.read(doc.storage_path)
    const rawText = await extractReportPdfText(file.buffer, doc.mime_type || 'application/pdf')
    const clean = (rawText ?? '').replace(/\0/g, '').trim()
    console.log(`Total chars: ${clean.length}\n`)
    console.log(clean)
  }

  await pool.end()
}

main().catch(console.error)