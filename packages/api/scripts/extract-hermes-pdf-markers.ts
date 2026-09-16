import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GcsFileStorage } from '../src/infrastructure/storage/gcs.storage.js'
import { extractReportPdfText } from '../src/infrastructure/scraper/exam-pdf-text.helper.js'
import { HermesPardiniPdfReportParser } from '../src/infrastructure/ocr/hermes-pardini-pdf.parser.js'
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

async function runBackfill() {
  console.log('=== PROCESSAMENTO & EXTRAÇÃO DEDICADA DE LAUDOS HERMES PARDINI ===\n')

  const { rows: docs } = await pool.query<{
    id: string
    patient_id: string
    original_filename: string
    storage_path: string
    mime_type: string
  }>(`
    SELECT id, patient_id, original_filename, storage_path, mime_type
      FROM documents
     WHERE original_filename ILIKE '%hermes%' OR original_filename ILIKE '%pardini%'
  `)

  if (!docs.length) {
    console.log('Nenhum PDF do Hermes Pardini encontrado na tabela documents.')
    await pool.end()
    return
  }

  const storage = new GcsFileStorage()
  const parser = new HermesPardiniPdfReportParser()
  const markerRepo = new ExamResultItemPgRepository(pool)
  const markerService = new ExamResultItemService(markerRepo)

  for (const doc of docs) {
    console.log(`Lendo laudo: ${doc.original_filename} (Doc ID: ${doc.id})...`)
    try {
      const file = await storage.read(doc.storage_path)
      const extractedText = (await extractReportPdfText(file.buffer, doc.mime_type))?.replace(/\0/g, '')

      if (!extractedText) {
        console.log('   Sem texto extraído do PDF.')
        continue
      }

      // Atualiza o extractedText no documento se estivesse vazio
      await pool.query(
        `UPDATE documents SET extracted_text = $1, ocr_processed = true, ocr_provider = 'python:pdf_native' WHERE id = $2`,
        [extractedText, doc.id],
      )

      // Busca exame correspondente para relacionar examId
      const { rows: examRows } = await pool.query<{ id: string }>(
        `SELECT id FROM exams WHERE patient_id = $1 AND source = 'hermes_pardini' LIMIT 1`,
        [doc.patient_id],
      )
      const fallbackExamId = examRows[0]?.id ?? '00000000-0000-0000-0000-000000000001'

      const parsed = parser.parse(extractedText)
      console.log(`   Paciente: ${parsed.patientName ?? '-'}`)
      console.log(`   Médico: ${parsed.doctorName ?? '-'}`)
      console.log(`   Pedido: ${parsed.orderNumber ?? '-'}`)
      console.log(`   Marcadores extraídos (atuais + anteriores): ${parsed.markers.length}`)

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

      if (propsList.length > 0) {
        await markerService.createBatch(propsList)
        console.log(`   => ${propsList.length} marcadores (atuais e retroativos) gravados com sucesso!`)
      }
    } catch (err) {
      console.error(`   Erro processando ${doc.original_filename}:`, err)
    }
  }

  await pool.end()
}

runBackfill().catch(console.error)
