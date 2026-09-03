import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GcsFileStorage, isGcsStorageConfigured } from '../src/infrastructure/storage/gcs.storage.js'
import { extractReportPdfText } from '../src/infrastructure/scraper/exam-pdf-text.helper.js'
import { MaterDeiPdfReportParser } from '../src/infrastructure/ocr/materdei-pdf.parser.js'
import { ExamResultItemPgRepository } from '../src/infrastructure/persistence/exam-result-item.pg.repository.js'
import { ExamResultItemService } from '../src/application/exam-result-item/exam-result-item.service.js'

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

async function runMaterDeiBackfill() {
  console.log('=== EXTRAÇÃO DEDICADA DE LAUDOS E MARCADORES MATER DEI (BRUNO) ===\n')

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
  `)

  if (!docs.length) {
    console.log('Nenhum documento do Mater Dei encontrado para o Bruno.')
    await pool.end()
    return
  }

  if (!isGcsStorageConfigured()) {
    console.error('GCS Storage não configurado.')
    await pool.end()
    return
  }

  const storage = new GcsFileStorage()
  const materDeiParser = new MaterDeiPdfReportParser()
  const markerService = new ExamResultItemService(new ExamResultItemPgRepository(pool))

  let processedCount = 0
  let pdfWithText = 0
  let totalMarkersSaved = 0
  let errorsCount = 0

  for (const doc of docs) {
    processedCount++
    try {
      const file = await storage.read(doc.storage_path)
      const rawText = await extractReportPdfText(file.buffer, doc.mime_type || 'application/pdf')
      const cleanText = rawText?.replace(/\0/g, '').trim()

      if (!cleanText || cleanText.length < 10) {
        console.log(`[${processedCount}/${docs.length}] ⚠️  ${doc.original_filename} -> texto vazio/curto`)
        continue
      }

      pdfWithText++

      // Atualiza o texto no documento
      await pool.query(
        `UPDATE documents SET extracted_text = $1, ocr_processed = true, ocr_provider = 'python:pdf_native' WHERE id = $2`,
        [cleanText, doc.id],
      )

      const parsed = materDeiParser.parse(cleanText)

      if (parsed.markers.length > 0) {
        const { rows: examRows } = await pool.query<{ id: string }>(
          `SELECT id FROM exams WHERE patient_id = $1 LIMIT 1`,
          [doc.patient_id],
        )
        const fallbackExamId = examRows[0]?.id ?? '00000000-0000-0000-0000-000000000001'

        const propsList = parsed.markers.map((m) => ({
          examId: fallbackExamId,
          patientId: doc.patient_id,
          markerName: m.markerName,
          technicalName: m.technicalName,
          numericValue: m.numericValue,
          displayValue: m.displayValue,
          unit: m.unit,
          referenceRange: m.referenceRange,
          status: m.status,
          collectedAt: m.collectedAt,
        }))

        await markerService.createBatch(propsList)
        totalMarkersSaved += propsList.length
        const list = propsList.map((x) => `${x.markerName}:${x.displayValue}${x.unit || ''}`).join(' | ')
        console.log(`[${processedCount}/${docs.length}] ✅ ${doc.original_filename} -> ${propsList.length} marcador(es) [${list}]`)
      } else {
        console.log(`[${processedCount}/${docs.length}] 🩻 ${doc.original_filename} -> 0 marcadores (imagem/RX/TC ou formato não catalogado)`)
      }
    } catch (err) {
      errorsCount++
      console.log(`[${processedCount}/${docs.length}] ❌ ${doc.original_filename} -> ERRO: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`\n==================================================`)
  console.log(`RESUMO DA EXTRAÇÃO MATER DEI (BRUNO):`)
  console.log(`  • Documentos Processados: ${processedCount}/${docs.length}`)
  console.log(`  • Documentos com Texto Extraído: ${pdfWithText}`)
  console.log(`  • Erros: ${errorsCount}`)
  console.log(`  • Marcadores Extraídos e Salvos: ${totalMarkersSaved}`)
  console.log(`==================================================\n`)

  await pool.end()
}

runMaterDeiBackfill().catch(console.error)