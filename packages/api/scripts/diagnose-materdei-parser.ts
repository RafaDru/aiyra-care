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
const keyFile = resolve(root, process.env.GOOGLE_APPLICATION_CREDENTIALS || 'openhealth-503119-c7baed555716.json')
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

async function diagnose() {
  console.log('=== DIAGNÓSTICO: TEXTO EXTRAÍDO × PARSER MATER DEI ===\n')

  const { rows: docs } = await pool.query<{
    id: string
    patient_id: string
    original_filename: string
    storage_path: string
    mime_type: string
  }>(`
    SELECT d.id, d.patient_id, d.original_filename, d.storage_path, d.mime_type
      FROM documents d
      JOIN patients p ON p.id = d.patient_id
     WHERE p.name ILIKE '%Bruno%'
       AND d.original_filename ILIKE '%materdei%'
     ORDER BY p.created_at DESC
  `)

  if (!docs.length) {
    console.log('Nenhum documento encontrado.')
    await pool.end()
    return
  }

  if (!isGcsStorageConfigured()) {
    console.error('GCS Storage não configurado.')
    await pool.end()
    return
  }

  const storage = new GcsFileStorage()
  const parser = new MaterDeiPdfReportParser()

  let totalMarkers = 0
  let processedCount = 0
  let errorCount = 0

  for (const doc of docs) {
    processedCount++
    try {
      const file = await storage.read(doc.storage_path)
      const rawText = await extractReportPdfText(file.buffer, doc.mime_type || 'application/pdf')
      const cleanText = rawText?.replace(/\0/g, '').trim()

      if (!cleanText || cleanText.length < 10) {
        console.log(`[${processedCount}/${docs.length}] ❌ ${doc.original_filename} -> texto vazio/curto`)
        continue
      }

      const parsed = parser.parse(cleanText)
      const markersCount = parsed.markers.length
      totalMarkers += markersCount

      if (markersCount > 0) {
        const list = parsed.markers.map((m) => `${m.markerName}:${m.displayValue}${m.unit ? m.unit : ''}`).join(' | ')
        console.log(`[${processedCount}/${docs.length}] ✅ ${doc.original_filename} -> ${markersCount} marcador(es) [${list}]`)
      } else {
        // Detecta cabeçalho do exame (geralmente as primeiras linhas do bloco)
        const firstLine = cleanText.split('\n').find((l) => l.trim().length > 0) || '(vazio)'
        console.log(`[${processedCount}/${docs.length}] ⚠️  ${doc.original_filename} -> 0 marcadores. Cabeçalho: "${firstLine.slice(0, 80)}"`)
      }
    } catch (err) {
      errorCount++
      console.log(`[${processedCount}/${docs.length}] ❌ ${doc.original_filename} -> ERRO: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`\n==================================================`)
  console.log(`RESUMO DO DIAGNÓSTICO:`)
  console.log(`  • Documentos processados: ${processedCount}/${docs.length}`)
  console.log(`  • Erros: ${errorCount}`)
  console.log(`  • Total de marcadores extraídos: ${totalMarkers}`)
  console.log(`==================================================`)

  await pool.end()
}

diagnose().catch(console.error)