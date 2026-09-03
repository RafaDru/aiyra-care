/**
 * Reset + re-extração idempotente de marcadores dos laudos PDF do Bruno (Mater Dei).
 *
 * Fluxo:
 *   0. RESET: apaga TODOS os marcadores do paciente (dados v1 contaminados)
 *   1. Roda o parser v2 (por seções) em cada documento
 *   2. Persiste com ON CONFLICT (idempotente) e grava source_document_id por item
 */
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

async function main() {
  console.log('=== RESET + RE-EXTRAÇÃO — LAUDOS MATER DEI (BRUNO) ===\n')

  const { rows: patients } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM patients WHERE name ILIKE '%Bruno%' LIMIT 1`,
  )
  const patient = patients[0]
  if (!patient) {
    console.log('Paciente Bruno não encontrado.')
    await pool.end()
    return
  }

  // ── Etapa 0: RESET completo dos marcadores do paciente ──
  const del = await pool.query(`DELETE FROM exam_result_items WHERE patient_id = $1`, [patient.id])
  console.log(`🧹 Reset: ${del.rowCount} marcadores antigos removidos\n`)

  const { rows: docs } = await pool.query<{ id: string; original_filename: string; storage_path: string; mime_type: string }>(
    `SELECT d.id, d.original_filename, d.storage_path, d.mime_type
       FROM documents d
      WHERE d.patient_id = $1
        AND d.original_filename ILIKE '%materdei%'
      ORDER BY d.original_filename`,
    [patient.id],
  )

  if (!docs.length || !isGcsStorageConfigured()) {
    console.log('Sem documentos ou GCS não configurado.')
    await pool.end()
    return
  }

  const storage = new GcsFileStorage()
  const parser = new MaterDeiPdfReportParser()

  const { rows: exams } = await pool.query<{ id: string }>(
    `SELECT id FROM exams WHERE patient_id = $1 ORDER BY exam_date DESC`,
    [patient.id],
  )
  const fallbackExamId = exams[0]?.id

  let processed = 0
  let withText = 0
  let totalMarkers = 0
  let errors = 0

  for (const doc of docs) {
    processed++
    try {
      const file = await storage.read(doc.storage_path)
      const rawText = await extractReportPdfText(file.buffer, doc.mime_type || 'application/pdf')
      const cleanText = rawText?.replace(/\0/g, '').trim() ?? ''

      if (cleanText.length < 10) {
        console.log(`[${processed}/${docs.length}] ⚠️  ${doc.original_filename} -> sem texto (escaneado)`)
        continue
      }
      withText++

      await pool.query(
        `UPDATE documents SET extracted_text = $1, ocr_processed = true, ocr_provider = 'python:pdf_native' WHERE id = $2`,
        [cleanText, doc.id],
      )

      const parsed = parser.parse(cleanText)

      if (parsed.markers.length === 0) {
        console.log(`[${processed}/${docs.length}] 🩻 ${doc.original_filename} -> 0 marcadores`)
        continue
      }

      // Persiste item a item com source_document_id direto
      for (const m of parsed.markers) {
        await pool.query(
          `INSERT INTO exam_result_items (
             exam_id, patient_id, marker_name, technical_name,
             numeric_value, display_value, unit, reference_range,
             status, collected_at, source_document_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (patient_id, LOWER(marker_name), collected_at, LOWER(display_value))
           DO UPDATE SET
             numeric_value = EXCLUDED.numeric_value,
             unit = EXCLUDED.unit,
             reference_range = EXCLUDED.reference_range,
             status = EXCLUDED.status,
             technical_name = COALESCE(EXCLUDED.technical_name, exam_result_items.technical_name),
             source_document_id = EXCLUDED.source_document_id`,
          [
            fallbackExamId ?? null,
            patient.id,
            m.markerName,
            m.technicalName ?? null,
            m.numericValue ?? null,
            m.displayValue,
            m.unit ?? null,
            m.referenceRange ?? null,
            m.status,
            m.collectedAt,
            doc.id,
          ],
        )
        totalMarkers++
      }

      const list = parsed.markers.slice(0, 5).map((m) => `${m.markerName}=${m.displayValue}${m.unit ? ' ' + m.unit : ''}`).join(' | ')
      console.log(`[${processed}/${docs.length}] ✅ ${doc.original_filename} -> ${parsed.markers.length}: ${list}${parsed.markers.length > 5 ? ' …' : ''}`)
    } catch (err) {
      errors++
      console.log(`[${processed}/${docs.length}] ❌ ${doc.original_filename} -> ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`\n==================================================`)
  console.log(`RESUMO:`)
  console.log(`  • Documentos: ${processed} | com texto: ${withText} | erros: ${errors}`)
  console.log(`  • Marcadores inseridos (bruto): ${totalMarkers}`)
  const { rows: finalCount } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM exam_result_items WHERE patient_id = $1`,
    [patient.id],
  )
  console.log(`  • Total no banco (pós-dedup): ${finalCount[0].n}`)
  console.log(`==================================================\n`)

  await pool.end()
}

main().catch(console.error)