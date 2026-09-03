import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GcsFileStorage, isGcsStorageConfigured } from '../src/infrastructure/storage/gcs.storage.js'
import { extractReportPdfText } from '../src/infrastructure/scraper/exam-pdf-text.helper.js'
import { MaterDeiPdfReportParser } from '../src/infrastructure/ocr/materdei-pdf.parser.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GCP_SERVICE_ACCOUNT_KEY) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GCP_SERVICE_ACCOUNT_KEY
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(root, process.env.GOOGLE_APPLICATION_CREDENTIALS || 'openhealth-503119-c7baed555716.json')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

interface Row {
  doc: string
  textChars: number
  normalized: boolean
  module: string
  markers: string
}

async function main() {
  const { rows: docs } = await pool.query<{ id: string; original_filename: string; storage_path: string; mime_type: string; extracted_text: string | null }>(
    `SELECT d.id, d.original_filename, d.storage_path, d.mime_type, d.extracted_text
       FROM documents d
       JOIN patients p ON p.id = d.patient_id
      WHERE p.name ILIKE '%Bruno%'
        AND d.original_filename ILIKE '%materdei%'
      ORDER BY d.original_filename`,
  )

  if (!isGcsStorageConfigured()) {
    console.error('GCS não configurado')
    await pool.end()
    return
  }

  const storage = new GcsFileStorage()
  const parser = new MaterDeiPdfReportParser()
  const rows: Row[] = []

  for (const doc of docs) {
    try {
      const file = await storage.read(doc.storage_path)
      const rawText = await extractReportPdfText(file.buffer, doc.mime_type || 'application/pdf')
      const cleanText = rawText?.replace(/\0/g, '').trim() ?? ''

      if (!cleanText || cleanText.length < 10) {
        rows.push({ doc: doc.original_filename, textChars: 0, normalized: false, module: '— (PDF escaneado, requer OCR)', markers: '' })
        continue
      }

      const parsed = parser.parse(cleanText)
      if (parsed.markers.length > 0) {
        const list = parsed.markers.map((m) => m.markerName).join(', ')
        rows.push({
          doc: doc.original_filename,
          textChars: cleanText.length,
          normalized: true,
          module: 'MaterDeiPdfReportParser (regex determinístico)',
          markers: `${parsed.markers.length}: ${list}`,
        })
      } else {
        // Classifica o motivo
        const head = cleanText.slice(0, 200).toUpperCase()
        const isImageExam = /CENTRAL DE AGENDAMENTO|RX |TC |RADIOGRAFIA|TOMOGRAFIA/.test(head)
        rows.push({
          doc: doc.original_filename,
          textChars: cleanText.length,
          normalized: false,
          module: isImageExam ? '— (exame de imagem, sem marcadores lab.)' : '⚠️ formato não catalogado (candidato a fallback LLM)',
          markers: '',
        })
      }
    } catch (err) {
      rows.push({ doc: doc.original_filename, textChars: 0, normalized: false, module: `❌ erro: ${err instanceof Error ? err.message : String(err)}`.slice(0, 80), markers: '' })
    }
  }

  console.log('| # | Documento | Normalizado? | Módulo responsável | Marcadores |')
  console.log('|---|-----------|--------------|--------------------|------------|')
  rows.forEach((r, i) => {
    console.log(`| ${i + 1} | ${r.doc} | ${r.normalized ? '✅ Sim' : '❌ Não'} | ${r.module} | ${r.markers || '—'} |`)
  })

  const ok = rows.filter((r) => r.normalized).length
  console.log(`\nTotal: ${rows.length} | Normalizados: ${ok} | Não normalizáveis/pendentes: ${rows.length - ok}`)

  await pool.end()
}

main().catch(console.error)